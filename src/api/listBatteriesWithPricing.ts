import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Gets battery list with aggregated installer pricing for a given state/region',
  inputSchema: z.object({
    search: z.string().optional(),
    state: z.string().optional(),
  }),
  outputSchema: z.object({
    batteries: z.array(z.object({
      id: z.string(),
      name: z.string(),
      manufacturer: z.string(),
      model: z.string(),
      usableCapacity: z.number().nullable(),
      status: z.string().nullable(),
      imageUrl: z.string().nullable(),
      logoUrl: z.string().nullable(),
      priceMin: z.number().nullable(),
      priceMax: z.number().nullable(),
      installerCount: z.number(),
      compatiblePlanCount: z.number(),
      reviewAlert: z.string().nullable(),
    })),
  }),
  execute: async ({ input }) => {
    const conditions: string[] = [];
    const params: string[] = [];

    if (input.search) {
      params.push(`%${input.search.toLowerCase()}%`);
      const idx = params.length;
      conditions.push(`(LOWER(b."name") LIKE $${idx} OR LOWER(b."manufacturer") LIKE $${idx})`);
    }

    const stateJoinExtra = input.state
      ? (() => {
          params.push(`%${input.state.toLowerCase()}%`);
          return `AND LOWER(inst."region") LIKE $${params.length}`;
        })()
      : '';

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await zite.sql({
      query: `
        SELECT
          b.id,
          b."name",
          b."manufacturer",
          b."model",
          b."usableCapacity" AS "usableCapacity",
          b."status",
          b."images",

          b."logoUrl" AS "logoUrl",
          b."reviewAlert" AS "reviewAlert",
          MIN(ip."price") FILTER (WHERE ip."price" IS NOT NULL AND ip."available" = true) AS "priceMin",
          MAX(ip."price") FILTER (WHERE ip."price" IS NOT NULL AND ip."available" = true) AS "priceMax",
          COUNT(DISTINCT inst.id) FILTER (WHERE ip."available" = true) AS "installerCount",
          (
            SELECT COUNT(DISTINCT bpc.id)
            FROM "BatteriesBatteryPlanCompatibility" bbpc
            JOIN "BatteryPlanCompatibility" bpc ON bpc.id = bbpc."batteryPlanCompatibilityId"
            WHERE bbpc."batteriesId" = b.id
          ) AS "compatiblePlanCount"
        FROM "Batteries" b
        LEFT JOIN "BatteriesCapacityOptions" bco ON bco."batteriesId" = b.id
        LEFT JOIN "CapacityOptions" co ON co.id = bco."capacityOptionsId"
        LEFT JOIN "CapacityOptionsInstallerPricing" coip ON coip."capacityOptionsId" = co.id
        LEFT JOIN "InstallerPricing" ip ON ip.id = coip."installerPricingId"
        LEFT JOIN "InstallerPricingInstallers" ipi ON ipi."installerPricingId" = ip.id
        LEFT JOIN "Installers" inst ON inst.id = ipi."installersId" ${stateJoinExtra}
        ${whereClause}
        GROUP BY b.id
        ORDER BY b."name" ASC
      `,
      params: params.length > 0 ? params : undefined,
    });

    return {
      batteries: result.rows.map((r: any) => {
        let imageUrl: string | null = null;
        try {
          const imgs = typeof r.images === 'string' ? JSON.parse(r.images) : r.images;
          if (Array.isArray(imgs) && imgs.length > 0) imageUrl = imgs[0]?.url || null;
        } catch { /* ignore */ }

        return {
          id: String(r.id),
          name: String(r.name || ''),
          manufacturer: String(r.manufacturer || ''),
          model: String(r.model || ''),
          usableCapacity: r.usableCapacity != null ? Number(r.usableCapacity) : null,
          status: r.status ? String(r.status) : null,
          imageUrl,
          logoUrl: r.logoUrl ? String(r.logoUrl) : null,
          priceMin: r.priceMin != null ? Number(r.priceMin) : null,
          priceMax: r.priceMax != null ? Number(r.priceMax) : null,
          installerCount: Number(r.installerCount || 0),
          compatiblePlanCount: Number(r.compatiblePlanCount || 0),
          reviewAlert: r.reviewAlert ? String(r.reviewAlert) : null,
        };
      }),
    };
  },
});
