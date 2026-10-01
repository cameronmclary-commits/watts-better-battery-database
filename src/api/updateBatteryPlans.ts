import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Updates which energy plans are linked to a battery',
  inputSchema: z.object({
    batteryId: z.string(),
    energyPlanIds: z.array(z.string()),
  }),
  outputSchema: z.object({ success: z.boolean() }),
  execute: async ({ input }) => {
    await zite.batteries.update({
      id: input.batteryId,
      record: { energyPlans: input.energyPlanIds },
    });
    return { success: true };
  },
});
