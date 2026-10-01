import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { tavilySearch } from '../lib/tavily';

const PARSE_PROMPT = `Parse the provided information into a list of energy plans for home battery owners. Only include plans confirmed in sources. Do NOT fabricate rates. biDirectionalCharging = HOME BATTERY only, not EV.

Return JSON:
{
  "plans": [{ "planName":"","provider":"","tariffType":null,"biDirectionalCharging":false,"statesAvailable":"","keyFeatures":"","estimatedSavings":null,"vppAvailable":false,"feedInRate":null,"suitability":"" }],
  "marketSummary": ""
}`;

const mapPlan = (p: any, state: string) => ({
  planName: p.planName || '', provider: p.provider || '',
  tariffType: p.tariffType ?? null,
  biDirectionalCharging: p.biDirectionalCharging ?? false,
  statesAvailable: p.statesAvailable || state,
  keyFeatures: p.keyFeatures || '',
  estimatedSavings: p.estimatedSavings ?? null,
  vppAvailable: p.vppAvailable ?? false,
  feedInRate: p.feedInRate ?? null,
  suitability: p.suitability || '',
});

export default createEndpoint({
  description: 'OpenAI-first search for home-battery-friendly energy plans, falls back to Tavily',
  inputSchema: z.object({
    state: z.string(),
    focus: z.string().optional(),
  }),
  outputSchema: z.object({
    plans: z.array(z.object({
      planName: z.string(),
      provider: z.string(),
      tariffType: z.string().nullable(),
      biDirectionalCharging: z.boolean(),
      statesAvailable: z.string(),
      keyFeatures: z.string(),
      estimatedSavings: z.string().nullable(),
      vppAvailable: z.boolean(),
      feedInRate: z.string().nullable(),
      suitability: z.string(),
    })),
    marketSummary: z.string(),
    source: z.string(),
  }),
  execute: async ({ input }) => {
    const focusCtx = input.focus ? ` ${input.focus}` : '';
    const query = `best electricity plans home battery solar ${input.state} Australia 2026 VPP feed-in tariff time of use${focusCtx}`;

    // Try OpenAI with web search first
    try {
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.ZITE_OPENAI_ACCESS_TOKEN });

      const response = await openai.responses.create({
        model: 'gpt-4o',
        tools: [{ type: 'web_search_preview' }],
        input: [
          { role: 'system', content: `Search the web for battery-friendly energy plans in ${input.state}, Australia. Then ${PARSE_PROMPT}` },
          { role: 'user', content: query },
        ],
      });

      const text = response.output_text || '';
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const data = JSON.parse(cleaned);

      return {
        plans: Array.isArray(data.plans) ? data.plans.map((p: any) => mapPlan(p, input.state)) : [],
        marketSummary: data.marketSummary || '',
        source: 'openai',
      };
    } catch {
      // Fallback to Tavily
    }

    try {
      const tavilyResult = await tavilySearch(query, { maxResults: 10, searchDepth: 'advanced', includeAnswer: true });
      const answer = tavilyResult.answer || '';
      const sourcesText = tavilyResult.results.map(r => `Source: ${r.title} (${r.url})\n${r.content}`).join('\n\n');

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
          plans: Array.isArray(data.plans) ? data.plans.map((p: any) => mapPlan(p, input.state)) : [],
          marketSummary: data.marketSummary || answer,
          source: 'tavily+openai',
        };
      } catch {
        return {
          plans: [],
          marketSummary: `${answer}\n\n**Sources:**\n${tavilyResult.results.map(r => `- [${r.title}](${r.url})`).join('\n')}`,
          source: 'tavily',
        };
      }
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
          { role: 'system', content: `You are an expert on Australian energy plans for home battery owners. ${PARSE_PROMPT}\n\nNote: You do not have live web access, so use your training knowledge. Mark anything uncertain.` },
          { role: 'user', content: `List energy plans for home battery owners in ${input.state}, Australia.${input.focus ? ' Focus: ' + input.focus : ''}` },
        ],
      });

      const data = JSON.parse(completion.choices[0]?.message?.content || '{}');
      return {
        plans: Array.isArray(data.plans) ? data.plans.map((p: any) => mapPlan(p, input.state)) : [],
        marketSummary: (data.marketSummary || '') + '\n\n*Note: Results based on AI knowledge — live web search was unavailable.*',
        source: 'openai-offline',
      };
    } catch {
      throw new Error('Both OpenAI and Tavily search failed. Please try again later.');
    }
  },
});
