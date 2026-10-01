import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { tavilySearch } from '../lib/tavily';

const PARSE_PROMPT = (batteryName: string) => `Extract review sources for the "${batteryName}" home battery from the provided information.

CRITICAL RULES:
- Only include reviews you can see evidence of
- Do NOT fabricate ratings, review counts, or URLs
- If you can't determine a rating or count, use null

Return JSON:
{
  "reviews": [
    {
      "sourceName": "platform name",
      "sourceUrl": "exact URL from results",
      "rating": 4.2 or null,
      "ratingOutOf": 5 or null,
      "reviewCount": 23 or null,
      "verifiesPurchasers": true/false,
      "summary": "what reviewers say",
      "sentiment": "Positive" or "Mixed" or "Negative"
    }
  ]
}`;

const VERIFIED_HOSTS = ['productreview.com.au', 'trustpilot.com', 'google.com', 'choice.com.au'];
const UNVERIFIED_HOSTS = ['solarquotes.com.au', 'solarchoice.net.au'];

export default createEndpoint({
  description: 'OpenAI-first search for battery reviews, falls back to Tavily',
  inputSchema: z.object({
    batteryId: z.string(),
    batteryName: z.string(),
    manufacturer: z.string(),
  }),
  outputSchema: z.object({
    candidates: z.array(z.object({
      sourceName: z.string(),
      sourceUrl: z.string().nullable(),
      rating: z.number().nullable(),
      ratingOutOf: z.number().nullable(),
      reviewCount: z.number().nullable(),
      verified: z.boolean(),
      summary: z.string(),
      sentiment: z.string(),
      tavilyVerified: z.boolean(),
      tavilyConfidence: z.string(),
      tavilyNote: z.string(),
      tavilyUrl: z.string().nullable(),
    })),
  }),
  execute: async ({ input }) => {
    let candidates: any[] = [];
    let tavilyResults: any[] = [];

    // Try OpenAI with web search first
    try {
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.ZITE_OPENAI_ACCESS_TOKEN });

      const response = await openai.responses.create({
        model: 'gpt-4o',
        tools: [{ type: 'web_search_preview' }],
        input: [
          { role: 'system', content: `Search for reviews of "${input.batteryName}" by ${input.manufacturer} home battery. Look on ProductReview.com.au, Trustpilot, Google, Choice, SolarQuotes, and other review platforms. ${PARSE_PROMPT(input.batteryName)}` },
          { role: 'user', content: `"${input.batteryName}" "${input.manufacturer}" battery review rating Australia` },
        ],
      });

      const text = response.output_text || '';
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      candidates = parsed.reviews || [];
    } catch {
      // Fall through to Tavily
      try {
        const searches = await Promise.all([
          tavilySearch(
            `"${input.batteryName}" OR "${input.manufacturer}" battery review rating site:productreview.com.au`,
            { maxResults: 3, searchDepth: 'advanced' }
          ).catch(() => ({ results: [] as any[], answer: '' })),
          tavilySearch(
            `"${input.batteryName}" OR "${input.manufacturer}" home battery review Australia rating`,
            { maxResults: 5, searchDepth: 'advanced', includeAnswer: true }
          ),
          tavilySearch(
            `"${input.batteryName}" battery review rating trustpilot OR google OR whirlpool OR choice.com.au`,
            { maxResults: 3, searchDepth: 'basic' }
          ).catch(() => ({ results: [] as any[], answer: '' })),
        ]);

        const allResults = [...searches[0].results, ...searches[1].results, ...searches[2].results];
        const seen = new Set<string>();
        tavilyResults = allResults.filter(r => { if (seen.has(r.url)) return false; seen.add(r.url); return true; });

        // Try OpenAI chat to parse
        try {
          const OpenAI2 = (await import('openai')).default;
          const openai2 = new OpenAI2({ apiKey: process.env.ZITE_OPENAI_ACCESS_TOKEN });
          const sourcesText = tavilyResults.map(r => `URL: ${r.url}\nTitle: ${r.title}\nContent: ${r.content}`).join('\n\n---\n\n');

          const completion = await openai2.chat.completions.create({
            model: 'gpt-4o',
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: PARSE_PROMPT(input.batteryName) },
              { role: 'user', content: sourcesText },
            ],
          });

          const parsed = JSON.parse(completion.choices[0]?.message?.content || '{"reviews":[]}');
          candidates = parsed.reviews || [];
        } catch {
          // Create candidates directly from Tavily
          candidates = tavilyResults.map(r => {
            const isProductReview = r.url.toLowerCase().includes('productreview.com.au');
            const isTrustpilot = r.url.toLowerCase().includes('trustpilot.com');
            return {
              sourceName: isProductReview ? 'ProductReview.com.au'
                : isTrustpilot ? 'Trustpilot'
                : r.title.split(' - ')[0] || new URL(r.url).hostname,
              sourceUrl: r.url,
              rating: null, ratingOutOf: 5, reviewCount: null,
              verifiesPurchasers: isProductReview || isTrustpilot,
              summary: r.content.slice(0, 200),
              sentiment: 'Mixed',
            };
          });
        }
      } catch {
        // Both failed
        return { candidates: [] };
      }
    }

    return {
      candidates: candidates.filter((r: any) => r.sourceName).map((r: any) => {
        const url = (r.sourceUrl || '').toLowerCase();
        const isVerifiedHost = VERIFIED_HOSTS.some(h => url.includes(h));
        const isUnverifiedHost = UNVERIFIED_HOSTS.some(h => url.includes(h));
        const verified = (r.verifiesPurchasers === true || isVerifiedHost) && !isUnverifiedHost;

        const tavilyMatch = tavilyResults.find(u => u.url === r.sourceUrl);

        return {
          sourceName: r.sourceName,
          sourceUrl: r.sourceUrl || null,
          rating: r.rating ?? null,
          ratingOutOf: r.ratingOutOf ?? 5,
          reviewCount: r.reviewCount ?? null,
          verified,
          summary: r.summary || '',
          sentiment: r.sentiment || 'Mixed',
          tavilyVerified: !!tavilyMatch,
          tavilyConfidence: tavilyMatch ? 'high' : (tavilyResults.length > 0 ? 'low' : 'none'),
          tavilyNote: tavilyMatch
            ? `Confirmed by Tavily: "${tavilyMatch.title}"`
            : tavilyResults.length > 0
            ? 'URL not found in Tavily search results'
            : 'Tavily not used (OpenAI succeeded)',
          tavilyUrl: tavilyMatch?.url || null,
        };
      }),
    };
  },
});
