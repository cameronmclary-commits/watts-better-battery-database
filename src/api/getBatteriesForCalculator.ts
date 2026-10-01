import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Public API for the solar calculator — returns all active batteries with full details, capacity options, installer pricing, and compatible energy plans',
  inputSchema: z.object({
    batteryId: z.string().optional(),
    status: z.string().optional(),
    apiKey: z.string(),
  }),
  outputSchema: z.object({ batteries: z.array(z.any()) }),
  execute: async ({ input }) => {
    if (!input.apiKey || input.apiKey !== process.env.ZITE_EXTERNAL_API_KEY) {
      throw new Error('Unauthorized: invalid or missing API key');
    }
    // 1. Fetch batteries
    const batteryFilter = input.batteryId ? `AND b.id = $1` : '';
    const statusFilter = input.status ? `AND b."status" = $${input.batteryId ? 2 : 1}` : '';
    const params: string[] = [];
    if (input.batteryId) params.push(input.batteryId);
    if (input.status) params.push(input.status);

    const batteriesResult = await zite.sql({
      query: `SELECT b.id, b."name", b."manufacturer", b."model", b."moduleSize",
                     b."usableCapacity", b."maxChargeRate", b."maxDischargeRate",
                     b."roundTripEfficiency", b."cycleWarranty", b."depthOfDischarge",
                     b."description", b."status", b."additionalInfo", b."images"
              FROM "Batteries" b
              WHERE 1=1 ${batteryFilter} ${statusFilter}`,
      params,
    });

    if (batteriesResult.rows.length === 0) return { batteries: [] };

    const batteryIds = batteriesResult.rows.map(r => String(r.id));

    // 2. Capacity options for these batteries
    const capResult = await zite.sql({
      query: `SELECT co.id, co."label", co."capacityKwh", co."numberOfModules",
                     co."priceMin", co."priceMax", l."batteriesId" AS "batteryId"
              FROM "CapacityOptions" co
              JOIN "BatteriesCapacityOptions" l ON l."capacityOptionsId" = co.id
              WHERE l."batteriesId" = ANY($1::uuid[])`,
      params: [batteryIds],
    });

    const capIds = capResult.rows.map(r => String(r.id));

    // 3. Installer pricing for these capacity options (only available ones)
    let pricingByCapacity: Record<string, any[]> = {};
    if (capIds.length > 0) {
      const pricingResult = await zite.sql({
        query: `SELECT ip.id, ip."price", ip."available",
                       cl."capacityOptionsId" AS "capId",
                       i."name" AS "installerName", i."region" AS "installerRegion", i.id AS "installerId"
                FROM "InstallerPricing" ip
                JOIN "CapacityOptionsInstallerPricing" cl ON cl."installerPricingId" = ip.id
                JOIN "InstallerPricingInstallers" il ON il."installerPricingId" = ip.id
                JOIN "Installers" i ON i.id = il."installersId"
                WHERE cl."capacityOptionsId" = ANY($1::uuid[])
                  AND ip."available" = true`,
        params: [capIds],
      });
      for (const r of pricingResult.rows) {
        const capId = String(r.capId);
        if (!pricingByCapacity[capId]) pricingByCapacity[capId] = [];
        pricingByCapacity[capId].push({
          installerId: String(r.installerId),
          installerName: String(r.installerName || ''),
          installerRegion: String(r.installerRegion || ''),
          price: r.price != null ? Number(r.price) : null,
        });
      }
    }

    // 4. Energy plans for these batteries
    const plansResult = await zite.sql({
      query: `SELECT ep.id, ep."planName", ep."provider", ep."tariffType",
                     ep."biDirectionalCharging", ep."biDirectionalHours",
                     ep."avgCostPerKwh", ep."maxGridDrawKw",
                     l."batteriesId" AS "batteryId"
              FROM "EnergyPlans" ep
              JOIN "BatteriesEnergyPlans" l ON l."energyPlansId" = ep.id
              WHERE l."batteriesId" = ANY($1::uuid[])`,
      params: [batteryIds],
    });

    // Group data by battery
    const capByBattery: Record<string, any[]> = {};
    for (const r of capResult.rows) {
      const bid = String(r.batteryId);
      if (!capByBattery[bid]) capByBattery[bid] = [];
      capByBattery[bid].push({
        id: String(r.id),
        label: String(r.label || ''),
        capacityKwh: r.capacityKwh != null ? Number(r.capacityKwh) : null,
        numberOfModules: r.numberOfModules != null ? Number(r.numberOfModules) : null,
        priceMin: r.priceMin != null ? Number(r.priceMin) : null,
        priceMax: r.priceMax != null ? Number(r.priceMax) : null,
        installerPricing: pricingByCapacity[String(r.id)] || [],
      });
    }

    const plansByBattery: Record<string, any[]> = {};
    for (const r of plansResult.rows) {
      const bid = String(r.batteryId);
      if (!plansByBattery[bid]) plansByBattery[bid] = [];
      plansByBattery[bid].push({
        id: String(r.id),
        planName: String(r.planName || ''),
        provider: String(r.provider || ''),
        tariffType: String(r.tariffType || ''),
        biDirectionalCharging: Boolean(r.biDirectionalCharging),
        biDirectionalHours: r.biDirectionalHours ? String(r.biDirectionalHours) : null,
        avgCostPerKwh: r.avgCostPerKwh != null ? Number(r.avgCostPerKwh) : null,
        maxGridDrawKw: r.maxGridDrawKw != null ? Number(r.maxGridDrawKw) : null,
      });
    }

    // 5. Assemble response
    const batteries = batteriesResult.rows.map(b => {
      const bid = String(b.id);
      // Parse images from JSONB
      let images: { url: string; filename: string }[] = [];
      if (b.images) {
        try {
          const parsed = typeof b.images === 'string' ? JSON.parse(b.images) : b.images;
          if (Array.isArray(parsed)) {
            images = parsed.map((i: any) => ({ url: i.url || '', filename: i.filename || '' }));
          }
        } catch { /* skip */ }
      }

      return {
        id: bid,
        name: String(b.name || ''),
        manufacturer: String(b.manufacturer || ''),
        model: String(b.model || ''),
        moduleSize: b.moduleSize != null ? Number(b.moduleSize) : null,
        usableCapacity: b.usableCapacity != null ? Number(b.usableCapacity) : null,
        maxChargeRate: b.maxChargeRate != null ? Number(b.maxChargeRate) : null,
        maxDischargeRate: b.maxDischargeRate != null ? Number(b.maxDischargeRate) : null,
        roundTripEfficiency: b.roundTripEfficiency != null ? Number(b.roundTripEfficiency) : null,
        cycleWarranty: b.cycleWarranty != null ? Number(b.cycleWarranty) : null,
        depthOfDischarge: b.depthOfDischarge != null ? Number(b.depthOfDischarge) : null,
        description: b.description ? String(b.description) : null,
        status: b.status ? String(b.status) : null,
        additionalInfo: b.additionalInfo ? String(b.additionalInfo) : null,
        images,
        capacityOptions: capByBattery[bid] || [],
        energyPlans: plansByBattery[bid] || [],
      };
    });

    return { batteries };
  },
});
