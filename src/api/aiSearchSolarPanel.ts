import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { tavilySearch } from '../lib/tavily';

const PARSE_PROMPT = `Parse the provided information about a solar panel into structured JSON. Extract ONLY facts — do NOT fabricate specs. Use null if not found.

Return JSON:
{
  "name": "", "manufacturer": "", "model": "",
  "wattage": null, "efficiency": null, "cellType": null,
  "voltageMpp": null, "currentMpp": null,
  "openCircuitVoltage": null, "shortCircuitCurrent": null,
  "weightKg": null, "dimensions": null,
  "warrantyYears": null, "performanceWarrantyPct": null,
  "description": "", "additionalInfo": "",
  "manufacturerOverview": "", "status": "Active"
}`;

const mapResult = (parsed: any, query: string, summary: string, sources: { title: string; url: string }[]) => ({
  name: parsed.name || query, manufacturer: parsed.manufacturer || '', model: parsed.model || '',
  wattage: parsed.wattage ?? null, efficiency: parsed.efficiency ?? null,
  cellType: parsed.cellType ?? null,
  voltageMpp: parsed.voltageMpp ?? null, currentMpp: parsed.currentMpp ?? null,
  openCircuitVoltage: parsed.openCircuitVoltage ?? null,
  shortCircuitCurrent: parsed.shortCircuitCurrent ?? null,
  weightKg: parsed.weightKg ?? null, dimensions: parsed.dimensions || null,
  warrantyYears: parsed.warrantyYears ?? null,
  performanceWarrantyPct: parsed.performanceWarrantyPct ?? null,
  description: parsed.description || summary, additionalInfo: parsed.additionalInfo || '',
  manufacturerOverview: parsed.manufacturerOverview || '',
  status: parsed.status || 'Active',
  verificationSummary: summary,
  verificationSources: sources,
});

export default createEndpoint({
  description: 'OpenAI-first search for solar panel specs, falls back to Tavily',
  inputSchema: z.object({ query: z.string() }),
  outputSchema: z.object({
    name: z.string(), manufacturer: z.string(), model: z.string(),
    wattage: z.number().nullable(), efficiency: z.number().nullable(),
    cellType: z.string().nullable(),
    voltageMpp: z.number().nullable(), currentMpp: z.number().nullable(),
    openCircuitVoltage: z.number().nullable(), shortCircuitCurrent: z.number().nullable(),
    weightKg: z.number().nullable(), dimensions: z.string().nullable(),
    warrantyYears: z.number().nullable(), performanceWarrantyPct: z.number().nullable(),
    description: z.string(), additionalInfo: z.string(),
    manufacturerOverview: z.string(), status: z.string(),
    verificationSummary: z.string(),
    verificationSources: z.array(z.object({ title: z.string(), url: z.string() })),
  }),
  execute: async ({ input }) => {
    // Try OpenAI with web search first
    try {
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.ZITE_OPENAI_ACCESS_TOKEN });

      const response = await openai.responses.create({
        model: 'gpt-4o',
        tools: [{ type: 'web_search_preview' }],
        input: [
          { role: 'system', content: `Search the web for this solar panel and extract its specs. ${PARSE_PROMPT}` },
          { role: 'user', content: `${input.query} solar panel specifications wattage efficiency cell type warranty Australia datasheet` },
        ],
      });

      const text = response.output_text || '';
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed && parsed.name) return mapResult(parsed, input.query, '', []);
    } catch {
      // Fall through to Tavily
    }

    // Tavily fallback
    try {
      const tavilyResult = await tavilySearch(
        `${input.query} solar panel specifications wattage efficiency cell type warranty Australia datasheet`,
        { maxResults: 10, searchDepth: 'advanced', includeAnswer: true }
      );

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
        name: input.query, manufacturer: '', model: '',
        wattage: null, efficiency: null, cellType: null,
        voltageMpp: null, currentMpp: null, openCircuitVoltage: null, shortCircuitCurrent: null,
        weightKg: null, dimensions: null, warrantyYears: null, performanceWarrantyPct: null,
        description: answer || 'See sources below.',
        additionalInfo: sourcesText.slice(0, 2000),
        manufacturerOverview: '', status: 'Active',
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
          { role: 'user', content: `Solar panel: ${input.query}` },
        ],
      });

      const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
      if (parsed && parsed.name) return mapResult(parsed, input.query, 'Based on AI knowledge (live web search unavailable)', []);
    } catch {
      // fall through
    }

    throw new Error('Both OpenAI and Tavily search failed. Please try again later.');
  },
});
