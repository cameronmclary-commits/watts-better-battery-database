import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Lists all reviews for a specific battery',
  inputSchema: z.object({ batteryId: z.string() }),
  outputSchema: z.object({
    reviews: z.array(z.object({
      id: z.string(),
      sourceName: z.string(),
      sourceUrl: z.string().nullable(),
      rating: z.number().nullable(),
      ratingOutOf: z.number().nullable(),
      reviewCount: z.number().nullable(),
      verified: z.boolean(),
      summary: z.string(),
      sentiment: z.string(),
      lastChecked: z.string().nullable(),
    })),
    alertLevel: z.string().nullable(),
  }),
  execute: async ({ input }) => {
    const { records } = await zite.batteryReviews.findAll({
      filters: { battery: input.batteryId },
    });

    const battery = await zite.batteries.findOne({ id: input.batteryId });

    return {
      reviews: records.map(r => ({
        id: r.id,
        sourceName: r.sourceName || 'Unknown',
        sourceUrl: r.sourceUrl || null,
        rating: r.rating ?? null,
        ratingOutOf: r.ratingOutOf ?? 5,
        reviewCount: r.reviewCount ?? null,
        verified: r.verifiedReviews ?? false,
        summary: r.summary || '',
        sentiment: r.sentiment || 'Mixed',
        lastChecked: r.lastChecked ?? null,
      })),
      alertLevel: battery?.reviewAlert ?? null,
    };
  },
});
