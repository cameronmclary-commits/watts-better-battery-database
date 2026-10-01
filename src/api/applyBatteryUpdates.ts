import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Applies approved field updates to a battery record',
  inputSchema: z.object({
    batteryId: z.string(),
    updates: z.array(z.object({
      field: z.string(),
      value: z.string().nullable(),
    })),
  }),
  outputSchema: z.object({ success: z.boolean() }),
  execute: async ({ input }) => {
    const record: any = {};
    for (const u of input.updates) {
      const f = u.field;
      const v = u.value;
      if (['moduleSize', 'usableCapacity', 'maxChargeRate', 'maxDischargeRate', 'roundTripEfficiency', 'cycleWarranty', 'depthOfDischarge'].includes(f)) {
        record[f] = v != null ? Number(v) : null;
      } else {
        record[f] = v;
      }
    }
    await zite.batteries.update({ id: input.batteryId, record });
    return { success: true };
  },
});
