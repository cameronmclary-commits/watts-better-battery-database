import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Lists all energy plans with full details',
  inputSchema: z.object({}),
  outputSchema: z.object({
    plans: z.array(z.object({
      id: z.string(), planName: z.string(), provider: z.string().nullable(),
      tariffType: z.string().nullable(), biDirectionalCharging: z.boolean(),
      biDirectionalHours: z.string().nullable(), avgCostPerKwh: z.number().nullable(),
      maxGridDrawKw: z.number().nullable(), planUrl: z.string().nullable(),
      aiSummary: z.string().nullable(), batteryLimitations: z.string().nullable(),
      tariffDetails: z.string().nullable(), feedInTariff: z.string().nullable(),
      vppDetails: z.string().nullable(), comparisonRate: z.number().nullable(),
      contractTerms: z.string().nullable(), statesAvailable: z.string().nullable(),
    })),
  }),
  execute: async () => {
    const { records } = await zite.energyPlans.findAll({ limit: 500 });
    return {
      plans: records.map(r => ({
        id: r.id, planName: r.planName || '', provider: r.provider ?? null,
        tariffType: r.tariffType ?? null, biDirectionalCharging: r.biDirectionalCharging ?? false,
        biDirectionalHours: r.biDirectionalHours ?? null, avgCostPerKwh: r.avgCostPerKwh ?? null,
        maxGridDrawKw: r.maxGridDrawKw ?? null, planUrl: r.planUrl ?? null,
        aiSummary: r.aiSummary ?? null, batteryLimitations: r.batteryLimitations ?? null,
        tariffDetails: r.tariffDetails ?? null, feedInTariff: r.feedInTariff ?? null,
        vppDetails: r.vppDetails ?? null, comparisonRate: r.comparisonRate ?? null,
        contractTerms: r.contractTerms ?? null, statesAvailable: r.statesAvailable ?? null,
      })),
    };
  },
});
