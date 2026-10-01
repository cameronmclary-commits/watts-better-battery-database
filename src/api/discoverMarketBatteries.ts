import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { tavilySearch } from '../lib/tavily';

const PARSE_PROMPT = `Parse the provided information into a list of home batteries. Only include batteries confirmed in the sources. Do NOT fabricate specs — use null if not found.

Return JSON:
{
  "batteries": [{ "name":"","manufacturer":"","model":"","chemistry":null,"usableCapacityKwh":null,"maxDischargeKw":null,"priceRangeMin":null,"priceRangeMax":null,"warrantyYears":null,"keyFeatures":"","vppCompatible":false,"compatiblePlans":[],"suitability":"","availableInState":true }],
  "marketSummary": ""
}`;

const mapBattery = (b: any) => ({
  name: b.name || '', manufacturer: b.manufacturer || '', model: b.model || '',
  chemistry: b.chemistry ?? null, usableCapacityKwh: b.usableCapacityKwh ?? null,
  maxDischargeKw: b.maxDischargeKw ?? null, priceRangeMin: b.priceRangeMin ?? null,
  priceRangeMax: b.priceRangeMax ?? null, warrantyYears: b.warrantyYears ?? null,
  keyFeatures: b.keyFeatures || '', vppCompatible: b.vppCompatible ?? false,
  compatiblePlans: Array.isArray(b.compatiblePlans) ? b.compatiblePlans.filter((s: any) => typeof s === 'string') : [],
  suitability: b.suitability || '', availableInState: b.availableInState ?? true,
});

export default createEndpoint({
  description: 'OpenAI-first search for home batteries available in a given Australian state, falls back to Tavily',
  inputSchema: z.object({
    state: z.string(),
    focus: z.string().optional(),
  }),
  outputSchema: z.object({
    batteries: z.array(z.object({
      name: z.string(),
      manufacturer: z.string(),
      model: z.string(),
      chemistry: z.string().nullable(),
      usableCapacityKwh: z.number().nullable(),
      maxDischargeKw: z.number().nullable(),
      priceRangeMin: z.number().nullable(),
      priceRangeMax: z.number().nullable(),
      warrantyYears: z.number().nullable(),
      keyFeatures: z.string(),
      vppCompatible: z.boolean(),
      compatiblePlans: z.array(z.string()),
      suitability: z.string(),
      availableInState: z.boolean(),
    })),
    marketSummary: z.string(),
    source: z.string(),
  }),
  execute: async ({ input }) => {
    const focusCtx = input.focus ? ` ${input.focus}` : '';
    const query = `home battery storage products available ${input.state} Australia 2026 Tesla BYD Enphase Sungrow prices capacity warranty${focusCtx}`;

    // Try OpenAI with web search first
    try {
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.ZITE_OPENAI_ACCESS_TOKEN });

      const response = await openai.responses.create({
        model: 'gpt-4o',
        tools: [{ type: 'web_search_preview' }],
        input: [
          { role: 'system', content: `Search the web for home batteries available in ${input.state}, Australia. Then ${PARSE_PROMPT}` },
          { role: 'user', content: query },
        ],
      });

      const text = response.output_text || '';
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const data = JSON.parse(cleaned);

      return {
        batteries: Array.isArray(data.batteries) ? data.batteries.map(mapBattery) : [],
        marketSummary: data.marketSummary || '',
        source: 'openai',
      };
    } catch {
      // Fallback to Tavily
    }

    // Tavily fallback
    try {
      const tavilyResult = await tavilySearch(query, { maxResults: 10, searchDepth: 'advanced', includeAnswer: true });
      const answer = tavilyResult.answer || '';
      const sourcesText = tavilyResult.results.map(r => `Source: ${r.title} (${r.url})\n${r.content}`).join('\n\n');

      // Try OpenAI chat to parse Tavily results
      try {
        const OpenAI = (await import('openai')).default;
        const openai = new OpenAI({ apiKey: process.env.ZITE_OPENAI_ACCESS_TOKEN });

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: PARSE_PROMPT },
            { role: 'user', content: `State: ${input.state}\n\nSummary: ${answer}\n\nSources:\n${sourcesText}` },
          ],
        });

        const data = JSON.parse(completion.choices[0]?.message?.content || '{}');
        return {
          batteries: Array.isArray(data.batteries) ? data.batteries.map(mapBattery) : [],
          marketSummary: data.marketSummary || answer,
          source: 'tavily+openai',
        };
      } catch {
        // Pure Tavily text
        return {
          batteries: [],
          marketSummary: `${answer}\n\n**Sources:**\n${tavilyResult.results.map(r => `- [${r.title}](${r.url})`).join('\n')}`,
          source: 'tavily',
        };
      }
    } catch {
      // ignore tavily failure
    }

    // Final fallback: OpenAI chat without web search (uses training knowledge)
    try {
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.ZITE_OPENAI_ACCESS_TOKEN });

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: `You are an expert on the Australian home battery market. ${PARSE_PROMPT}\n\nNote: You do not have live web access for this query, so use your training knowledge. Mark anything uncertain.` },
          { role: 'user', content: `List home batteries available in ${input.state}, Australia.${input.focus ? ' Focus: ' + input.focus : ''}` },
        ],
      });

      const data = JSON.parse(completion.choices[0]?.message?.content || '{}');
      return {
        batteries: Array.isArray(data.batteries) ? data.batteries.map(mapBattery) : [],
        marketSummary: (data.marketSummary || '') + '\n\n*Note: Results based on AI knowledge — live web search was unavailable.*',
        source: 'openai-offline',
      };
    } catch {
      throw new Error('Both OpenAI and Tavily search failed. Please try again later.');
    }
  },
});
