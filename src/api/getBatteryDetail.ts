import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Gets full battery detail including capacity options and energy plans',
  inputSchema: z.object({ id: z.string() }),
  outputSchema: z.object({
    id: z.string(), name: z.string(), manufacturer: z.string(), model: z.string(),
    moduleSize: z.number().nullable(), usableCapacity: z.number().nullable(),
    maxChargeRate: z.number().nullable(), maxDischargeRate: z.number().nullable(),
    roundTripEfficiency: z.number().nullable(), cycleWarranty: z.number().nullable(),
    depthOfDischarge: z.number().nullable(), description: z.string().nullable(),
    status: z.string().nullable(), notRecommendedReason: z.string().nullable(), additionalInfo: z.string().nullable(), manufacturerOverview: z.string().nullable(),
    images: z.array(z.object({ url: z.string(), filename: z.string() })),
    expandable: z.boolean(),
    expansionTimeframe: z.string().nullable(),
    arModel: z.object({ url: z.string(), filename: z.string() }).nullable(),
    specSheetUrl: z.string().nullable(),
    batteryType: z.string().nullable(),
    allInOneUnit: z.boolean(),
    nominalStorage: z.number().nullable(),
    features: z.string().nullable(),
    powerRating: z.string().nullable(),
    weight: z.string().nullable(),
    dimensions: z.string().nullable(),
    offGridCapable: z.boolean(),
    ipRating: z.string().nullable(),
    operatingTempRange: z.string().nullable(),
    warrantyText: z.string().nullable(),
    compatibleInverterBrands: z.string().nullable(),
    totalWarrantedKwh: z.string().nullable(),
    costPerWarrantedKwh: z.string().nullable(),
    approxPrice: z.string().nullable(),
    manufacturerLogo: z.array(z.object({ url: z.string(), filename: z.string() })),
    energyPlans: z.array(z.object({
      id: z.string(), planName: z.string(), tariffType: z.string().nullable(), biDirectionalCharging: z.boolean(),
    })),
  }),
  execute: async ({ input }) => {
    const battery = await zite.batteries.findOne({ id: input.id });
    if (!battery) throw new Error('Battery not found');

    // Get linked energy plans
    const planIds = Array.isArray(battery.energyPlans) ? battery.energyPlans : battery.energyPlans ? [battery.energyPlans] : [];
    const plans: { id: string; planName: string; tariffType: string | null; biDirectionalCharging: boolean }[] = [];
    for (const pid of planIds) {
      const p = await zite.energyPlans.findOne({ id: pid });
      if (p) plans.push({
        id: p.id, planName: p.planName || '', tariffType: p.tariffType ?? null,
        biDirectionalCharging: p.biDirectionalCharging ?? false,
      });
    }

    return {
      id: battery.id, name: battery.name || '', manufacturer: battery.manufacturer || '',
      model: battery.model || '', moduleSize: battery.moduleSize ?? null,
      usableCapacity: battery.usableCapacity ?? null, maxChargeRate: battery.maxChargeRate ?? null,
      maxDischargeRate: battery.maxDischargeRate ?? null, roundTripEfficiency: battery.roundTripEfficiency ?? null,
      cycleWarranty: battery.cycleWarranty ?? null, depthOfDischarge: battery.depthOfDischarge ?? null,
      description: battery.description ?? null, status: battery.status ?? null,
      notRecommendedReason: battery.notRecommendedReason ?? null,
      additionalInfo: battery.additionalInfo ?? null,
      manufacturerOverview: battery.manufacturerOverview ?? null,
      images: (battery.images || []).map(i => ({ url: i.url, filename: i.filename })),
      expandable: (battery as any).expandable ?? false,
      expansionTimeframe: (battery as any).expansionTimeframe ?? null,
      arModel: (battery as any)['3dArModel']?.[0] ? { url: (battery as any)['3dArModel'][0].url, filename: (battery as any)['3dArModel'][0].filename } : null,
      specSheetUrl: battery.specSheetUrl ?? null,
      batteryType: battery.batteryType ?? null,
      allInOneUnit: battery.allInOneUnit ?? false,
      nominalStorage: battery.nominalStorage ?? null,
      features: battery.features ?? null,
      powerRating: battery.powerRating ?? null,
      weight: battery.weight ?? null,
      dimensions: battery.dimensions ?? null,
      offGridCapable: battery.offGridCapable ?? false,
      ipRating: battery.ipRating ?? null,
      operatingTempRange: battery.operatingTempRange ?? null,
      warrantyText: battery.warrantyText ?? null,
      compatibleInverterBrands: battery.compatibleInverterBrands ?? null,
      totalWarrantedKwh: battery.totalWarrantedKwh ?? null,
      costPerWarrantedKwh: battery.costPerWarrantedKwh ?? null,
      approxPrice: battery.approxPrice ?? null,
      manufacturerLogo: (battery.manufacturerLogo || []).map(i => ({ url: i.url, filename: i.filename })),
      energyPlanIds: planIds,
      energyPlans: plans,
    };
  },
});
