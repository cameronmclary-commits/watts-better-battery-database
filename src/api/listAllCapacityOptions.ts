import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Lists all capacity options across all batteries',
  inputSchema: z.object({}),
  outputSchema: z.object({
    options: z.array(z.object({ id: z.string(), label: z.string().nullable(), batteryName: z.string().nullable() })),
  }),
  execute: async () => {
    const { records } = await zite.capacityOptions.findAll({ limit: 500 });
    const batteryIds = new Set<string>();
    for (const r of records) {
      const bid = Array.isArray(r.battery) ? r.battery[0] : r.battery;
      if (bid) batteryIds.add(bid);
    }
    const batteryMap = new Map<string, string>();
    for (const bid of batteryIds) {
      const b = await zite.batteries.findOne({ id: bid });
      if (b) batteryMap.set(bid, b.name || '');
    }
    return {
      options: records.map(r => {
        const bid = Array.isArray(r.battery) ? r.battery[0] : r.battery;
        return { id: r.id, label: r.label ?? null, batteryName: bid ? batteryMap.get(bid) ?? null : null };
      }),
    };
  },
});
