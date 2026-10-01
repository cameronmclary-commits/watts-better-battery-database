import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

const attachmentSchema = z.object({
  url: z.string(), filename: z.string(), originalName: z.string().optional(),
  contentType: z.string().optional(), size: z.number().optional(),
}).passthrough();

export default createEndpoint({
  description: 'Lists install photos for an installer',
  inputSchema: z.object({ installerId: z.string() }),
  outputSchema: z.object({
    photos: z.array(z.object({
      id: z.string(), caption: z.string(),
      photos: z.array(attachmentSchema),
      projectType: z.string().nullable(), location: z.string().nullable(),
      description: z.string().nullable(), installDate: z.string().nullable(),
    })),
  }),
  execute: async ({ input }) => {
    const { records } = await zite.installPhotos.findAll({
      filters: { installer: input.installerId },
      limit: 200,
    });
    return {
      photos: records.map(r => ({
        id: r.id, caption: r.caption || '',
        photos: (r.photos as any[]) || [],
        projectType: r.projectType ?? null, location: r.location ?? null,
        description: r.description ?? null, installDate: r.installDate ?? null,
      })),
    };
  },
});
