import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Creates or updates an install photo entry',
  inputSchema: z.object({
    id: z.string().optional(),
    installerId: z.string(),
    caption: z.string(),
    photos: z.array(z.object({ url: z.string(), filename: z.string() }).passthrough()).optional(),
    projectType: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    installDate: z.string().nullable().optional(),
  }),
  outputSchema: z.object({ id: z.string() }),
  execute: async ({ input }) => {
    const record: any = {
      caption: input.caption,
      installer: [input.installerId],
      projectType: input.projectType ?? null,
      location: input.location ?? null,
      description: input.description ?? null,
      installDate: input.installDate ?? null,
    };
    if (input.photos !== undefined) {
      record.photos = input.photos;
    }
    if (input.id) {
      await zite.installPhotos.update({ id: input.id, record });
      return { id: input.id };
    }
    const created = await zite.installPhotos.create({ record });
    return { id: created.id };
  },
});
