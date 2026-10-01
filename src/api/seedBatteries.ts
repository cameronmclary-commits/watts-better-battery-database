import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import seedData from '../data/battery-seed.json';

export default createEndpoint({
  description: 'Seeds the Batteries table from the bundled SolarQuotes spreadsheet data (115 products). Uses upsert on name to avoid duplicates.',
  inputSchema: z.object({}),
  outputSchema: z.object({
    imported: z.number(),
    message: z.string(),
  }),
  execute: async () => {
    const batteries = seedData as Array<Record<string, unknown>>;
    let imported = 0;

    // bulkCreate max 100 per call
    for (let i = 0; i < batteries.length; i += 100) {
      const batch = batteries.slice(i, i + 100);
      const result = await zite.batteries.bulkCreate({
        records: batch as any,
        matchOn: ['name'],
      });
      imported += result.records.length;
    }

    return {
      imported,
      message: `Successfully seeded ${imported} batteries from SolarQuotes data.`,
    };
  },
});
