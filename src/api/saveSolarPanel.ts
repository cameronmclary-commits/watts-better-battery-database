import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Creates or updates a solar panel',
  inputSchema: z.object({
    id: z.string().optional(),
    name: z.string(), manufacturer: z.string(), model: z.string(),
    wattage: z.number().nullable().optional(),
    efficiency: z.number().nullable().optional(),
    cellType: z.string().optional(),
    voltageMpp: z.number().nullable().optional(),
    currentMpp: z.number().nullable().optional(),
    openCircuitVoltage: z.number().nullable().optional(),
    shortCircuitCurrent: z.number().nullable().optional(),
    weightKg: z.number().nullable().optional(),
    dimensions: z.string().optional(),
    warrantyYears: z.number().nullable().optional(),
    performanceWarrantyPct: z.number().nullable().optional(),
    description: z.string().optional(),
    status: z.string().optional(),
    additionalInfo: z.string().optional(),
    manufacturerOverview: z.string().optional(),
    imageUrl: z.string().nullable().optional(),
  }),
  outputSchema: z.object({ id: z.string() }),
  execute: async ({ input }) => {
    const record: any = {
      name: input.name, manufacturer: input.manufacturer, model: input.model,
      wattage: input.wattage ?? null,
      efficiency: input.efficiency ?? null,
      cellType: input.cellType || null,
      voltageMpp: input.voltageMpp ?? null,
      currentMpp: input.currentMpp ?? null,
      openCircuitVoltage: input.openCircuitVoltage ?? null,
      shortCircuitCurrent: input.shortCircuitCurrent ?? null,
      weightKg: input.weightKg ?? null,
      dimensions: input.dimensions || null,
      warrantyYears: input.warrantyYears ?? null,
      performanceWarrantyPct: input.performanceWarrantyPct ?? null,
      description: input.description || null,
      status: input.status || null,
      additionalInfo: input.additionalInfo || null,
      manufacturerOverview: input.manufacturerOverview || null,
    };
    if (input.imageUrl !== undefined) {
      record.images = input.imageUrl ? [{ url: input.imageUrl }] : null;
    }
    if (input.id) {
      await zite.solarPanels.update({ id: input.id, record });
      return { id: input.id };
    }
    const created = await zite.solarPanels.create({ record });
    return { id: created.id };
  },
});
