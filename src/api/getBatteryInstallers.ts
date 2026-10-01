import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Returns installers who can install a given battery, based on installer pricing linked to its capacity options',
  inputSchema: z.object({
    batteryId: z.string(),
  }),
  outputSchema: z.object({
    installers: z.array(z.object({
      id: z.string(),
      name: z.string(),
      region: z.string().nullable(),
      phone: z.string().nullable(),
      contactEmail: z.string().nullable(),
      contactPerson: z.string().nullable(),
      status: z.string().nullable(),
      capacityOptions: z.array(z.object({
        pricingId: z.string(),
        capacityOptionId: z.string(),
        label: z.string(),
        price: z.number().nullable(),
        available: z.boolean(),
      })),
    })),
  }),
  execute: async ({ input }) => {
    const result = await zite.sql({
      query: `
        SELECT DISTINCT
          i.id,
          COALESCE(i."name", '') AS name,
          i."region",
          i."phone",
          i."contactEmail",
          i."contactPerson",
          i."status",
          co.id AS "capId",
          co."label" AS "capLabel",
          ip.id AS "pricingId",
          ip."price",
          ip."available"
        FROM "Batteries" b
        JOIN "BatteriesCapacityOptions" bco ON bco."batteriesId" = b.id
        JOIN "CapacityOptions" co ON co.id = bco."capacityOptionsId"
        JOIN "CapacityOptionsInstallerPricing" coip ON coip."capacityOptionsId" = co.id
        JOIN "InstallerPricing" ip ON ip.id = coip."installerPricingId"
        JOIN "InstallerPricingInstallers" ipi ON ipi."installerPricingId" = ip.id
        JOIN "Installers" i ON i.id = ipi."installersId"
        WHERE b.id = $1
        ORDER BY name
      `,
      params: [input.batteryId],
    });

    const map = new Map<string, {
      id: string; name: string; region: string | null; phone: string | null;
      contactEmail: string | null; contactPerson: string | null; status: string | null;
      capacityOptions: { pricingId: string; capacityOptionId: string; label: string; price: number | null; available: boolean }[];
    }>();

    for (const r of result.rows) {
      const id = String(r.id);
      if (!map.has(id)) {
        map.set(id, {
          id,
          name: String(r.name),
          region: r.region ? String(r.region) : null,
          phone: r.phone ? String(r.phone) : null,
          contactEmail: r.contactEmail ? String(r.contactEmail) : null,
          contactPerson: r.contactPerson ? String(r.contactPerson) : null,
          status: r.status ? String(r.status) : null,
          capacityOptions: [],
        });
      }
      map.get(id)!.capacityOptions.push({
        pricingId: String(r.pricingId ?? ''),
        capacityOptionId: String(r.capId ?? ''),
        label: String(r.capLabel ?? ''),
        price: r.price != null ? Number(r.price) : null,
        available: r.available !== false,
      });
    }

    return { installers: Array.from(map.values()) };
  },
});
