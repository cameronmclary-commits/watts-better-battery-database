import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Lists battery-plan compatibility records for a given plan or battery',
  inputSchema: z.object({
    planId: z.string().optional(),
    batteryId: z.string().optional(),
  }),
  outputSchema: z.object({
    records: z.array(z.object({
      id: z.string(),
      label: z.string(),
      batteryId: z.string(),
      batteryName: z.string(),
      planId: z.string(),
      planName: z.string(),
      compatibilityStatus: z.string(),
      compatibilityNotes: z.string().nullable(),
      restrictions: z.string().nullable(),
    })),
  }),
  execute: async ({ input }) => {
    const filters: any = {};
    if (input.planId) filters.energyPlan = input.planId;
    if (input.batteryId) filters.battery = input.batteryId;

    const { records } = await zite.batteryPlanCompatibility.findAll({ filters, limit: 500 });

    // Resolve battery and plan names
    const batteryIds = new Set<string>();
    const planIds = new Set<string>();
    for (const r of records) {
      const bId = Array.isArray(r.battery) ? r.battery[0] : r.battery;
      const pId = Array.isArray(r.energyPlan) ? r.energyPlan[0] : r.energyPlan;
      if (bId) batteryIds.add(bId);
      if (pId) planIds.add(pId);
    }

    const batteryNames: Record<string, string> = {};
    const planNames: Record<string, string> = {};

    if (batteryIds.size > 0) {
      const { records: batteries } = await zite.batteries.findAll({
        filters: { id: { in: Array.from(batteryIds) } },
        fields: ['id', 'name'],
        limit: 500,
      });
      for (const b of batteries) batteryNames[b.id] = b.name || '';
    }

    if (planIds.size > 0) {
      const { records: plans } = await zite.energyPlans.findAll({
        filters: { id: { in: Array.from(planIds) } },
        fields: ['id', 'planName'],
        limit: 500,
      });
      for (const p of plans) planNames[p.id] = p.planName || '';
    }

    return {
      records: records.map(r => {
        const bId = Array.isArray(r.battery) ? r.battery[0] : r.battery || '';
        const pId = Array.isArray(r.energyPlan) ? r.energyPlan[0] : r.energyPlan || '';
        return {
          id: r.id,
          label: r.label || '',
          batteryId: bId,
          batteryName: batteryNames[bId] || '',
          planId: pId,
          planName: planNames[pId] || '',
          compatibilityStatus: r.compatibilityStatus || 'Unconfirmed',
          compatibilityNotes: r.compatibilityNotes ?? null,
          restrictions: r.restrictions ?? null,
        };
      }),
    };
  },
});
