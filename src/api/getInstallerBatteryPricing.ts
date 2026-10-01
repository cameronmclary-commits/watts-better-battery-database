import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Gets all batteries with capacity options and existing pricing for a specific installer',
  inputSchema: z.object({
    installerId: z.string(),
  }),
  outputSchema: z.object({
    installerServiceAreas: z.array(z.string()),
    batteries: z.array(z.object({
      id: z.string(),
      name: z.string(),
      manufacturer: z.string().nullable(),
      selected: z.boolean(),
      capacityOptions: z.array(z.object({
        id: z.string(),
        label: z.string(),
        capacityKwh: z.number().nullable(),
        defaultPriceMin: z.number().nullable(),
        defaultPriceMax: z.number().nullable(),
        pricing: z.object({
          id: z.string(),
          priceMin: z.number().nullable(),
          priceMax: z.number().nullable(),
          price: z.number().nullable(),
          available: z.boolean(),
          availableAreas: z.array(z.string()),
        }).nullable(),
      })),
    })),
  }),
  execute: async ({ input }) => {
    // Get the installer to read its service areas
    const installer = await zite.installers.findOne({ id: input.installerId });
    const installerServiceAreas = installer?.serviceAreas || [];

    const { records: batteries } = await zite.batteries.findAll({ limit: 200 });
    const { records: allCaps } = await zite.capacityOptions.findAll({ limit: 500 });
    const { records: allPricing } = await zite.installerPricing.findAll({
      filters: { installer: input.installerId },
      limit: 2000,
    });

    const pricingByCap = new Map<string, typeof allPricing[0]>();
    for (const p of allPricing) {
      const capId = Array.isArray(p.capacityOption) ? p.capacityOption[0] : p.capacityOption;
      if (capId) pricingByCap.set(capId, p);
    }

    const capsByBattery = new Map<string, typeof allCaps>();
    for (const cap of allCaps) {
      const bid = Array.isArray(cap.battery) ? cap.battery[0] : cap.battery;
      if (!bid) continue;
      if (!capsByBattery.has(bid)) capsByBattery.set(bid, []);
      capsByBattery.get(bid)!.push(cap);
    }

    const batteriesWithPricing = new Set<string>();
    for (const cap of allCaps) {
      if (pricingByCap.has(cap.id)) {
        const bid = Array.isArray(cap.battery) ? cap.battery[0] : cap.battery;
        if (bid) batteriesWithPricing.add(bid);
      }
    }

    return {
      installerServiceAreas,
      batteries: batteries
        .filter(b => (b.status || 'Active') === 'Active')
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        .map(b => ({
          id: b.id,
          name: b.name || '',
          manufacturer: b.manufacturer || null,
          selected: batteriesWithPricing.has(b.id),
          capacityOptions: (capsByBattery.get(b.id) || []).map(cap => {
            const pr = pricingByCap.get(cap.id);
            return {
              id: cap.id,
              label: cap.label || '',
              capacityKwh: cap.capacityKwh ?? null,
              defaultPriceMin: cap.priceMin ?? null,
              defaultPriceMax: cap.priceMax ?? null,
              pricing: pr ? {
                id: pr.id,
                priceMin: pr.priceMin ?? null,
                priceMax: pr.priceMax ?? null,
                price: pr.price ?? null,
                available: pr.available ?? true,
                availableAreas: pr.availableAreas || [],
              } : null,
            };
          }),
        })),
    };
  },
});
