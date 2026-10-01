import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Lists capacity options for a battery',
  inputSchema: z.object({ batteryId: z.string() }),
  outputSchema: z.object({
    options: z.array(z.object({
      id: z.string(), label: z.string().nullable(), capacityKwh: z.number().nullable(),
      numberOfModules: z.number().nullable(), priceMin: z.number().nullable(), priceMax: z.number().nullable(),
    })),
  }),
  execute: async ({ input }) => {
    const { records } = await zite.capacityOptions.findAll({ filters: { battery: input.batteryId } });
    return {
      options: records.map(r => ({
        id: r.id, label: r.label ?? null, capacityKwh: r.capacityKwh ?? null,
        numberOfModules: r.numberOfModules ?? null, priceMin: r.priceMin ?? null, priceMax: r.priceMax ?? null,
      })),
    };
  },
});
