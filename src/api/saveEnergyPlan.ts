import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Creates or updates an energy plan',
  inputSchema: z.object({
    id: z.string().optional(), planName: z.string(), provider: z.string().nullable().optional(),
    tariffType: z.string().nullable().optional(), biDirectionalCharging: z.boolean().optional(),
    biDirectionalHours: z.string().nullable().optional(), avgCostPerKwh: z.number().nullable().optional(),
    maxGridDrawKw: z.number().nullable().optional(),
    planUrl: z.string().nullable().optional(),
    aiSummary: z.string().nullable().optional(),
    batteryLimitations: z.string().nullable().optional(),
    tariffDetails: z.string().nullable().optional(),
    feedInTariff: z.string().nullable().optional(),
    vppDetails: z.string().nullable().optional(),
    comparisonRate: z.number().nullable().optional(),
    contractTerms: z.string().nullable().optional(),
    statesAvailable: z.string().nullable().optional(),
  }),
  outputSchema: z.object({ id: z.string() }),
  execute: async ({ input }) => {
    const record: any = {
      planName: input.planName, provider: input.provider ?? null,
      tariffType: input.tariffType ?? null, biDirectionalCharging: input.biDirectionalCharging ?? false,
      biDirectionalHours: input.biDirectionalHours ?? null, avgCostPerKwh: input.avgCostPerKwh ?? null,
      maxGridDrawKw: input.maxGridDrawKw ?? null,
      planUrl: input.planUrl ?? null, aiSummary: input.aiSummary ?? null,
      batteryLimitations: input.batteryLimitations ?? null,
      tariffDetails: input.tariffDetails ?? null, feedInTariff: input.feedInTariff ?? null,
      vppDetails: input.vppDetails ?? null, comparisonRate: input.comparisonRate ?? null,
      contractTerms: input.contractTerms ?? null, statesAvailable: input.statesAvailable ?? null,
    };
    if (input.id) {
      await zite.energyPlans.update({ id: input.id, record });
      return { id: input.id };
    }
    const created = await zite.energyPlans.create({ record });
    return { id: created.id };
  },
});
