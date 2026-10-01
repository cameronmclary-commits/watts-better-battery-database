import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Gets full solar panel detail',
  inputSchema: z.object({ id: z.string() }),
  outputSchema: z.object({
    id: z.string(), name: z.string(), manufacturer: z.string(), model: z.string(),
    wattage: z.number().nullable(), efficiency: z.number().nullable(),
    cellType: z.string().nullable(),
    voltageMpp: z.number().nullable(), currentMpp: z.number().nullable(),
    openCircuitVoltage: z.number().nullable(), shortCircuitCurrent: z.number().nullable(),
    weightKg: z.number().nullable(), dimensions: z.string().nullable(),
    warrantyYears: z.number().nullable(), performanceWarrantyPct: z.number().nullable(),
    status: z.string().nullable(), description: z.string().nullable(),
    additionalInfo: z.string().nullable(), manufacturerOverview: z.string().nullable(),
    images: z.array(z.object({ url: z.string(), filename: z.string() })),
  }),
  execute: async ({ input }) => {
    const panel = await zite.solarPanels.findOne({ id: input.id });
    if (!panel) throw new Error('Solar panel not found');
    return {
      id: panel.id, name: panel.name || '', manufacturer: panel.manufacturer || '',
      model: panel.model || '',
      wattage: panel.wattage ?? null, efficiency: panel.efficiency ?? null,
      cellType: panel.cellType ?? null,
      voltageMpp: panel.voltageMpp ?? null, currentMpp: panel.currentMpp ?? null,
      openCircuitVoltage: panel.openCircuitVoltage ?? null,
      shortCircuitCurrent: panel.shortCircuitCurrent ?? null,
      weightKg: panel.weightKg ?? null, dimensions: panel.dimensions ?? null,
      warrantyYears: panel.warrantyYears ?? null,
      performanceWarrantyPct: panel.performanceWarrantyPct ?? null,
      status: panel.status ?? null, description: panel.description ?? null,
      additionalInfo: panel.additionalInfo ?? null,
      manufacturerOverview: panel.manufacturerOverview ?? null,
      images: (panel.images || []).map(i => ({ url: i.url, filename: i.filename })),
    };
  },
});
