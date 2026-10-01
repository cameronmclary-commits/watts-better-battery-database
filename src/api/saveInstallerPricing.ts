import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Creates or updates installer pricing with price range and area support',
  inputSchema: z.object({
    id: z.string().optional(),
    label: z.string().nullable().optional(),
    installerId: z.string(),
    capacityOptionId: z.string(),
    price: z.number().nullable().optional(),
    priceMin: z.number().nullable().optional(),
    priceMax: z.number().nullable().optional(),
    available: z.boolean().optional(),
    availableAreas: z.array(z.string()).optional(),
  }),
  outputSchema: z.object({ id: z.string() }),
  execute: async ({ input }) => {
    const record: any = {
      label: input.label ?? null,
      installer: input.installerId,
      capacityOption: input.capacityOptionId,
      price: input.price ?? null,
      priceMin: input.priceMin ?? null,
      priceMax: input.priceMax ?? null,
      available: input.available ?? true,
    };
    if (input.availableAreas !== undefined) {
      record.availableAreas = input.availableAreas.length > 0 ? input.availableAreas : null;
    }
    if (input.id) {
      await zite.installerPricing.update({ id: input.id, record });
      return { id: input.id };
    }
    const created = await zite.installerPricing.create({ record });
    return { id: created.id };
  },
});
