import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { tavilySearch } from '../lib/tavily';

const PARSE_PROMPT = `Parse the provided information about an Australian energy plan into structured JSON. Extract ONLY facts — do NOT fabricate rates or details. Use null/empty string if not found.

Return JSON:
{
  "planName": "", "provider": "",
  "tariffType": "Flat"|"Time of Use"|"VPP"|"Feed-in"|"Demand"|"Variable"|"Wholesale"|null,
  "biDirectionalCharging": false,
  "biDirectionalHours": null,
  "avgCostPerKwh": null,
  "maxGridDrawKw": null,
  "planUrl": null,
  "comparisonRate": null,
  "statesAvailable": "",
  "contractTerms": "",
  "tariffDetails": "",
  "feedInTariff": "",
  "vppDetails": "",
  "aiSummary": "",
  "batteryLimitations": []
}

biDirectionalCharging = HOME BATTERY only (not EV).`;

const mapResult = (parsed: any, query: string, summary: string, sources: { title: string; url: string }[]) => ({
  planName: parsed.planName || query, provider: parsed.provider || '',
  tariffType: parsed.tariffType ?? null,
  biDirectionalCharging: parsed.biDirectionalCharging ?? false,
  biDirectionalHours: parsed.biDirectionalHours ?? null,
  avgCostPerKwh: parsed.avgCostPerKwh ?? null,
  maxGridDrawKw: parsed.maxGridDrawKw ?? null,
  planUrl: parsed.planUrl ?? null,
  aiSummary: parsed.aiSummary || summary,
  tariffDetails: parsed.tariffDetails || '',
  feedInTariff: parsed.feedInTariff || '',
  vppDetails: parsed.vppDetails || '',
  comparisonRate: parsed.comparisonRate ?? null,
  contractTerms: parsed.contractTerms || '',
  statesAvailable: parsed.statesAvailable || '',
  batteryLimitations: Array.isArray(parsed.batteryLimitations)
    ? parsed.batteryLimitations.filter((b: any) => b?.batteryName).map((b: any) => ({
        batteryName: b.batteryName || '', compatibility: b.compatibility || 'Unconfirmed',
        limitations: b.limitations || 'None known',
      }))
    : [],
  verificationSummary: summary,
  verificationSources: sources,
});

export default createEndpoint({
  description: 'OpenAI-first search for energy plan / VPP details, falls back to Tavily',
  inputSchema: z.object({
    query: z.string(),
    state: z.string().optional(),
  }),
  outputSchema: z.object({
    planName: z.string(), provider: z.string(),
    tariffType: z.string().nullable(),
    biDirectionalCharging: z.boolean(),
    biDirectionalHours: z.string().nullable(),
    avgCostPerKwh: z.number().nullable(),
    maxGridDrawKw: z.number().nullable(),
    planUrl: z.string().nullable(),
    aiSummary: z.string(),
    tariffDetails: z.string(),
    feedInTariff: z.string(),
    vppDetails: z.string(),
    comparisonRate: z.number().nullable(),
    contractTerms: z.string(),
    statesAvailable: z.string(),
    batteryLimitations: z.array(z.object({
      batteryName: z.string(),
      compatibility: z.string(),
      limitations: z.string(),
    })),
    verificationSummary: z.string(),
    verificationSources: z.array(z.object({ title: z.string(), url: z.string() })),
  }),
  execute: async ({ input }) => {
    const stateCtx = input.state ? ` ${input.state}` : '';
    const query = `${input.query} electricity plan Australia${stateCtx} home battery tariff rates feed-in VPP`;

    // Try OpenAI with web search first
    try {
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.ZITE_OPENAI_ACCESS_TOKEN });

      const response = await openai.responses.create({
        model: 'gpt-4o',
        tools: [{ type: 'web_search_preview' }],
        input: [
          { role: 'system', content: `Search the web for this energy plan and extract details. ${PARSE_PROMPT}` },
          { role: 'user', content: query },
        ],
      });

      const text = response.output_text || '';
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed) return mapResult(parsed, input.query, '', []);
    } catch {
      // Fall through to Tavily
    }

    // Tavily fallback
    try {
      const tavilyResult = await tavilySearch(query, { maxResults: 10, searchDepth: 'advanced', includeAnswer: true });
      const answer = tavilyResult.answer || '';
      const sourcesText = tavilyResult.results.map(r => `Source: ${r.title} (${r.url})\n${r.content}`).join('\n\n');
      const sources = tavilyResult.results.map(r => ({ title: r.title, url: r.url }));

      try {
        const OpenAI = (await import('openai')).default;
        const openai = new OpenAI({ apiKey: process.env.ZITE_OPENAI_ACCESS_TOKEN });

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: PARSE_PROMPT },
            { role: 'user', content: `Query: ${input.query}\n\nSummary: ${answer}\n\nSources:\n${sourcesText}` },
          ],
        });

        const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
        if (parsed) return mapResult(parsed, input.query, answer, sources);
      } catch {
        // Pure Tavily
      }

      return {
        planName: input.query, provider: '',
        tariffType: null, biDirectionalCharging: false, biDirectionalHours: null,
        avgCostPerKwh: null, maxGridDrawKw: null, planUrl: null,
        aiSummary: answer || 'See sources below.',
        tariffDetails: sourcesText.slice(0, 2000), feedInTariff: '', vppDetails: '',
        comparisonRate: null, contractTerms: '', statesAvailable: '',
        batteryLimitations: [],
        verificationSummary: answer,
        verificationSources: sources,
      };
    } catch {
      // ignore tavily failure
    }

    // Final fallback: OpenAI chat without web search
    try {
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.ZITE_OPENAI_ACCESS_TOKEN });

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: PARSE_PROMPT + '\n\nNote: You do not have live web access, so use your training knowledge. Mark anything uncertain.' },
          { role: 'user', content: `Energy plan: ${input.query}` },
        ],
      });

      const data = JSON.parse(completion.choices[0]?.message?.content || '{}');
      if (data && data.planName) {
        return {
          ...data,
          verificationSummary: 'Based on AI knowledge (live web search unavailable)',
          verificationSources: [],
        };
      }
    } catch {
      // fall through
    }

    throw new Error('Both OpenAI and Tavily search failed. Please try again later.');
  },
});
