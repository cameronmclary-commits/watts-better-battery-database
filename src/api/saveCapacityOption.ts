import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Creates or updates a capacity option',
  inputSchema: z.object({
    id: z.string().optional(), batteryId: z.string(),
    label: z.string(), capacityKwh: z.number().nullable().optional(),
    numberOfModules: z.number().nullable().optional(),
    priceMin: z.number().nullable().optional(), priceMax: z.number().nullable().optional(),
  }),
  outputSchema: z.object({ id: z.string() }),
  execute: async ({ input }) => {
    const record: any = {
      label: input.label, battery: input.batteryId,
      capacityKwh: input.capacityKwh ?? null, numberOfModules: input.numberOfModules ?? null,
      priceMin: input.priceMin ?? null, priceMax: input.priceMax ?? null,
    };
    if (input.id) {
      await zite.capacityOptions.update({ id: input.id, record });
      return { id: input.id };
    }
    const created = await zite.capacityOptions.create({ record });
    return { id: created.id };
  },
});
