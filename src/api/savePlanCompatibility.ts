import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Creates or updates a battery-plan compatibility record',
  inputSchema: z.object({
    id: z.string().optional(),
    batteryId: z.string(),
    planId: z.string(),
    compatibilityStatus: z.string(),
    compatibilityNotes: z.string().nullable().optional(),
    restrictions: z.string().nullable().optional(),
  }),
  outputSchema: z.object({ id: z.string() }),
  execute: async ({ input }) => {
    const batteryName = (await zite.batteries.findOne({ id: input.batteryId }))?.name || '';
    const planName = (await zite.energyPlans.findOne({ id: input.planId }))?.planName || '';

    if (input.id) {
      await zite.batteryPlanCompatibility.update({
        id: input.id,
        record: {
          compatibilityStatus: input.compatibilityStatus,
          compatibilityNotes: input.compatibilityNotes ?? null,
          restrictions: input.restrictions ?? null,
        },
      });
      return { id: input.id };
    }

    const created = await zite.batteryPlanCompatibility.create({
      record: {
        label: `${batteryName} × ${planName}`,
        battery: input.batteryId,
        energyPlan: input.planId,
        compatibilityStatus: input.compatibilityStatus,
        compatibilityNotes: input.compatibilityNotes ?? null,
        restrictions: input.restrictions ?? null,
      },
    });
    return { id: created.id };
  },
});
