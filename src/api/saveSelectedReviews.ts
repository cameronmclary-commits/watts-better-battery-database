import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Saves user-approved review candidates to the database',
  inputSchema: z.object({
    batteryId: z.string(),
    reviews: z.array(z.object({
      sourceName: z.string(),
      sourceUrl: z.string().nullable(),
      rating: z.number().nullable(),
      ratingOutOf: z.number().nullable(),
      reviewCount: z.number().nullable(),
      verified: z.boolean(),
      summary: z.string(),
      sentiment: z.string(),
    })),
  }),
  outputSchema: z.object({
    savedCount: z.number(),
    alertLevel: z.string(),
  }),
  execute: async ({ input }) => {
    // Delete existing reviews for this battery so we get a clean refresh
    const existing = await zite.batteryReviews.findAll({ filters: { battery: input.batteryId }, limit: 100 });
    for (const old of existing.records) {
      await zite.batteryReviews.delete({ id: old.id });
    }

    // Save selected reviews
    const savedReviews: { rating: number | null; ratingOutOf: number | null; verified: boolean }[] = [];
    for (const r of input.reviews) {
      await zite.batteryReviews.create({
        record: {
          sourceName: r.sourceName,
          sourceUrl: r.sourceUrl,
          rating: r.rating,
          ratingOutOf: r.ratingOutOf ?? 5,
          reviewCount: r.reviewCount,
          verifiedReviews: r.verified,
          summary: r.summary,
          sentiment: r.sentiment,
          battery: input.batteryId,
          lastChecked: new Date().toISOString(),
        },
      });
      savedReviews.push({ rating: r.rating, ratingOutOf: r.ratingOutOf, verified: r.verified });
    }

    // Detect discrepancies
    const verifiedRatings = savedReviews.filter(r => r.verified && r.rating != null);
    const unverifiedRatings = savedReviews.filter(r => !r.verified && r.rating != null);

    let alertLevel = 'green';
    if (verifiedRatings.length > 0 && unverifiedRatings.length > 0) {
      const avgVerified = verifiedRatings.reduce((s, r) => s + ((r.rating! / (r.ratingOutOf || 5)) * 5), 0) / verifiedRatings.length;
      const avgUnverified = unverifiedRatings.reduce((s, r) => s + ((r.rating! / (r.ratingOutOf || 5)) * 5), 0) / unverifiedRatings.length;
      const diff = Math.abs(avgVerified - avgUnverified);
      if (diff >= 1.5) alertLevel = 'red';
      else if (diff >= 0.7) alertLevel = 'amber';
    }

    await zite.batteries.update({
      id: input.batteryId,
      record: { reviewAlert: alertLevel === 'red' ? 'Discrepancy' : alertLevel === 'amber' ? 'Mixed Signals' : 'Consistent' },
    });

    return { savedCount: input.reviews.length, alertLevel };
  },
});
