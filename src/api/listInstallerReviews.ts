import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Lists reviews for an installer',
  inputSchema: z.object({ installerId: z.string() }),
  outputSchema: z.object({
    reviews: z.array(z.object({
      id: z.string(), title: z.string(), rating: z.number().nullable(),
      reviewText: z.string().nullable(), reviewerName: z.string().nullable(),
      sourceUrl: z.string().nullable(), sourceName: z.string().nullable(),
      reviewDate: z.string().nullable(), verified: z.boolean(),
    })),
  }),
  execute: async ({ input }) => {
    const { records } = await zite.installerReviews.findAll({
      filters: { installer: input.installerId },
      limit: 200,
    });
    return {
      reviews: records.map(r => ({
        id: r.id, title: r.title || '', rating: r.rating ?? null,
        reviewText: r.reviewText ?? null, reviewerName: r.reviewerName ?? null,
        sourceUrl: r.sourceUrl ?? null, sourceName: r.sourceName ?? null,
        reviewDate: r.reviewDate ?? null, verified: r.verified ?? false,
      })),
    };
  },
});
