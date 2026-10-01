import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Lists all installer pricing with resolved battery, installer, and capacity names',
  inputSchema: z.object({}),
  outputSchema: z.object({
    pricing: z.array(z.object({
      id: z.string(), label: z.string().nullable(), installerId: z.string(),
      installerName: z.string().nullable(), capacityOptionId: z.string(),
      capacityLabel: z.string().nullable(), batteryId: z.string().nullable(),
      batteryName: z.string().nullable(), price: z.number().nullable(), available: z.boolean(),
    })),
  }),
  execute: async () => {
    const { records } = await zite.installerPricing.findAll({ limit: 500 });
    const installerIds = new Set<string>();
    const capacityIds = new Set<string>();
    for (const r of records) {
      const iid = Array.isArray(r.installer) ? r.installer[0] : r.installer;
      const cid = Array.isArray(r.capacityOption) ? r.capacityOption[0] : r.capacityOption;
      if (iid) installerIds.add(iid);
      if (cid) capacityIds.add(cid);
    }

    const installerMap = new Map<string, string>();
    for (const iid of installerIds) {
      const inst = await zite.installers.findOne({ id: iid });
      if (inst) installerMap.set(iid, inst.name || '');
    }

    const capacityMap = new Map<string, { label: string; batteryId: string | null; batteryName: string | null }>();
    for (const cid of capacityIds) {
      const cap = await zite.capacityOptions.findOne({ id: cid });
      if (cap) {
        const bid = Array.isArray(cap.battery) ? cap.battery[0] : cap.battery;
        let batteryName: string | null = null;
        if (bid) {
          const bat = await zite.batteries.findOne({ id: bid });
          batteryName = bat?.name || null;
        }
        capacityMap.set(cid, { label: cap.label || '', batteryId: bid || null, batteryName });
      }
    }

    return {
      pricing: records.map(r => {
        const iid = Array.isArray(r.installer) ? r.installer[0] : r.installer || '';
        const cid = Array.isArray(r.capacityOption) ? r.capacityOption[0] : r.capacityOption || '';
        const capInfo = capacityMap.get(cid);
        return {
          id: r.id, label: r.label ?? null,
          installerId: iid, installerName: installerMap.get(iid) ?? null,
          capacityOptionId: cid, capacityLabel: capInfo?.label ?? null,
          batteryId: capInfo?.batteryId ?? null, batteryName: capInfo?.batteryName ?? null,
          price: r.price ?? null, available: r.available ?? false,
        };
      }),
    };
  },
});
