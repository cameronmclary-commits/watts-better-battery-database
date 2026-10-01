import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Lists solar panels with optional search',
  inputSchema: z.object({ search: z.string().optional() }),
  outputSchema: z.object({
    panels: z.array(z.object({
      id: z.string(), name: z.string(), manufacturer: z.string(), model: z.string(),
      wattage: z.number().nullable(), efficiency: z.number().nullable(),
      cellType: z.string().nullable(), status: z.string().nullable(), imageUrl: z.string().nullable(),
    })),
  }),
  execute: async ({ input }) => {
    const { records } = await zite.solarPanels.findAll({ limit: 500 });
    let filtered = records;
    if (input.search) {
      const s = input.search.toLowerCase();
      filtered = records.filter(r =>
        (r.name || '').toLowerCase().includes(s) ||
        (r.manufacturer || '').toLowerCase().includes(s) ||
        (r.model || '').toLowerCase().includes(s)
      );
    }
    return {
      panels: filtered.map(r => ({
        id: r.id,
        name: r.name || '',
        manufacturer: r.manufacturer || '',
        model: r.model || '',
        wattage: r.wattage ?? null,
        efficiency: r.efficiency ?? null,
        cellType: r.cellType ?? null,
        status: r.status ?? null,
        imageUrl: r.images?.[0]?.url ?? null,
      })),
    };
  },
});
