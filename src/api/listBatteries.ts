import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Lists batteries with optional search',
  inputSchema: z.object({ search: z.string().optional() }),
  outputSchema: z.object({
    batteries: z.array(z.object({
      id: z.string(), name: z.string(), manufacturer: z.string(), model: z.string(),
      usableCapacity: z.number().nullable(), status: z.string().nullable(), imageUrl: z.string().nullable(),
      approxPrice: z.string().nullable(), batteryType: z.string().nullable(),
    })),
  }),
  execute: async ({ input }) => {
    const { records } = await zite.batteries.findAll({ limit: 2000 });
    let filtered = records;
    if (input.search) {
      const s = input.search.toLowerCase();
      filtered = records.filter(r =>
        (r.name || '').toLowerCase().includes(s) ||
        (r.manufacturer || '').toLowerCase().includes(s) ||
        (r.model || '').toLowerCase().includes(s) ||
        (r.batteryType || '').toLowerCase().includes(s)
      );
    }
    return {
      batteries: filtered.map(r => ({
        id: r.id,
        name: r.name || '',
        manufacturer: r.manufacturer || '',
        model: r.model || '',
        usableCapacity: r.usableCapacity ?? null,
        status: r.status ?? null,
        imageUrl: r.images?.[0]?.url ?? null,
        approxPrice: r.approxPrice ?? null,
        batteryType: r.batteryType ?? null,
      })),
    };
  },
});
