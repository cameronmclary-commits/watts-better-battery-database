import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Creates or updates an installer review',
  inputSchema: z.object({
    id: z.string().optional(),
    installerId: z.string(),
    title: z.string(),
    rating: z.number().min(0).max(5).nullable().optional(),
    reviewText: z.string().nullable().optional(),
    reviewerName: z.string().nullable().optional(),
    sourceUrl: z.string().nullable().optional(),
    sourceName: z.string().nullable().optional(),
    reviewDate: z.string().nullable().optional(),
    verified: z.boolean().optional(),
  }),
  outputSchema: z.object({ id: z.string() }),
  execute: async ({ input }) => {
    const record: any = {
      title: input.title,
      installer: [input.installerId],
      rating: input.rating ?? null,
      reviewText: input.reviewText ?? null,
      reviewerName: input.reviewerName ?? null,
      sourceUrl: input.sourceUrl ?? null,
      sourceName: input.sourceName ?? null,
      reviewDate: input.reviewDate ?? null,
      verified: input.verified ?? false,
    };
    if (input.id) {
      await zite.installerReviews.update({ id: input.id, record });
      return { id: input.id };
    }
    const created = await zite.installerReviews.create({ record });
    return { id: created.id };
  },
});
