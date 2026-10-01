import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { tavilySearch } from '../lib/tavily';

const PARSE_PROMPT = (query: string) => `You are extracting specifications for ONE SPECIFIC battery product: "${query}".

Parse the provided information and extract the specs for THIS product ONLY. Do NOT return a summary of multiple batteries.

Return this JSON:
{
  "name": "Full product name",
  "manufacturer": "Brand",
  "model": "Model",
  "moduleSize": <single module kWh or null>,
  "usableCapacity": <total usable kWh or null>,
  "maxChargeRate": <kW or null>,
  "maxDischargeRate": <kW or null>,
  "roundTripEfficiency": <decimal 0-1 or null>,
  "cycleWarranty": <MWh throughput warranty or null>,
  "depthOfDischarge": <decimal 0-1 or null>,
  "description": "2-3 sentence product overview",
  "additionalInfo": "Technical details, chemistry, dimensions, weight",
  "manufacturerOverview": "Brief manufacturer background",
  "status": "Active" or "Discontinued" or "Coming Soon",
  "specSheetUrl": null,
  "imageUrl": null,
  "capacityOptions": [{ "label": "", "capacityKwh": null, "numberOfModules": null, "priceMin": null, "priceMax": null }],
  "compatiblePlans": [{ "planName": "", "provider": "", "compatibility": "", "restrictions": "" }]
}

RULES:
- Extract data for "${query}" ONLY
- Use null for any spec not explicitly stated
- Do NOT guess or estimate values
- priceMin/priceMax in AUD if found`;

const emptyResult = (query: string, description: string, sources: { title: string; url: string }[]) => ({
  name: query, manufacturer: '', model: '',
  moduleSize: null, usableCapacity: null, maxChargeRate: null, maxDischargeRate: null,
  roundTripEfficiency: null, cycleWarranty: null, depthOfDischarge: null,
  description,
  additionalInfo: '', manufacturerOverview: '', status: 'Active',
  specSheetUrl: null, imageUrl: null,
  capacityOptions: [] as any[], compatiblePlans: [] as any[],
  verificationSummary: description,
  verificationSources: sources,
});

const mapParsed = (parsed: any, query: string, summary: string, sources: { title: string; url: string }[]) => ({
  name: parsed.name || query,
  manufacturer: parsed.manufacturer || '',
  model: parsed.model || '',
  moduleSize: parsed.moduleSize ?? null,
  usableCapacity: parsed.usableCapacity ?? null,
  maxChargeRate: parsed.maxChargeRate ?? null,
  maxDischargeRate: parsed.maxDischargeRate ?? null,
  roundTripEfficiency: parsed.roundTripEfficiency ?? null,
  cycleWarranty: parsed.cycleWarranty ?? null,
  depthOfDischarge: parsed.depthOfDischarge ?? null,
  description: parsed.description || summary,
  additionalInfo: parsed.additionalInfo || '',
  manufacturerOverview: parsed.manufacturerOverview || '',
  status: parsed.status || 'Active',
  specSheetUrl: parsed.specSheetUrl || null,
  imageUrl: parsed.imageUrl || null,
  capacityOptions: Array.isArray(parsed.capacityOptions)
    ? parsed.capacityOptions.map((c: any) => ({
        label: c.label || '', capacityKwh: c.capacityKwh ?? null,
        numberOfModules: c.numberOfModules ?? null,
        priceMin: c.priceMin ?? null, priceMax: c.priceMax ?? null,
      }))
    : [],
  compatiblePlans: Array.isArray(parsed.compatiblePlans)
    ? parsed.compatiblePlans.filter((p: any) => p?.planName).map((p: any) => ({
        planName: p.planName || '', provider: p.provider || '',
        compatibility: p.compatibility || '', restrictions: p.restrictions || 'None known',
      }))
    : [],
  verificationSummary: summary,
  verificationSources: sources,
});

export default createEndpoint({
  description: 'OpenAI-first search for a specific battery product specs, falls back to Tavily',
  inputSchema: z.object({ query: z.string() }),
  outputSchema: z.object({
    name: z.string(), manufacturer: z.string(), model: z.string(),
    moduleSize: z.number().nullable(), usableCapacity: z.number().nullable(),
    maxChargeRate: z.number().nullable(), maxDischargeRate: z.number().nullable(),
    roundTripEfficiency: z.number().nullable(), cycleWarranty: z.number().nullable(),
    depthOfDischarge: z.number().nullable(),
    description: z.string(), additionalInfo: z.string(), manufacturerOverview: z.string(),
    status: z.string(),
    capacityOptions: z.array(z.object({
      label: z.string(), capacityKwh: z.number().nullable(),
      numberOfModules: z.number().nullable(),
      priceMin: z.number().nullable(), priceMax: z.number().nullable(),
    })),
    compatiblePlans: z.array(z.object({
      planName: z.string(), provider: z.string(),
      compatibility: z.string(), restrictions: z.string(),
    })),
    specSheetUrl: z.string().nullable(), imageUrl: z.string().nullable(),
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
          { role: 'system', content: `Search the web for this battery product and extract its full specs. ${PARSE_PROMPT(input.query)}` },
          { role: 'user', content: `"${input.query}" specifications datasheet usable capacity charge rate efficiency warranty Australia price` },
        ],
      });

      const text = response.output_text || '';
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed && parsed.name) {
        return mapParsed(parsed, input.query, '', []);
      }
    } catch {
      // Fall through to Tavily
    }

    // Tavily fallback
    try {
      const [specsSearch, datasheetSearch] = await Promise.all([
        tavilySearch(
          `"${input.query}" specifications datasheet usable capacity kWh charge rate kW efficiency`,
          { maxResults: 5, searchDepth: 'advanced', includeAnswer: true }
        ),
        tavilySearch(
          `"${input.query}" technical specifications warranty cycles depth of discharge Australia price`,
          { maxResults: 5, searchDepth: 'advanced' }
        ).catch(() => ({ results: [] as any[], answer: '' })),
      ]);

      const allResults = [...specsSearch.results, ...datasheetSearch.results];
      const seen = new Set<string>();
      const unique = allResults.filter(r => { if (seen.has(r.url)) return false; seen.add(r.url); return true; });

      const answer = specsSearch.answer || '';
      const sourcesText = unique.map(r => `Source: ${r.title} (${r.url})\n${r.content}`).join('\n\n');
      const sources = unique.map(r => ({ title: r.title, url: r.url }));

      // Try OpenAI chat to parse
      try {
        const OpenAI = (await import('openai')).default;
        const openai = new OpenAI({ apiKey: process.env.ZITE_OPENAI_ACCESS_TOKEN });

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: PARSE_PROMPT(input.query) },
            { role: 'user', content: `Product: ${input.query}\n\nSummary: ${answer}\n\nSources:\n${sourcesText}` },
          ],
        });

        const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
        if (parsed && parsed.name) return mapParsed(parsed, input.query, answer, sources);
      } catch {
        // Pure Tavily text fallback
      }

      return emptyResult(
        input.query,
        answer || 'Could not find specific product data. Try a more specific search.',
        sources
      );
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
          { role: 'system', content: PARSE_PROMPT(input.query) + '\n\nNote: You do not have live web access, so use your training knowledge. Mark anything uncertain.' },
          { role: 'user', content: `Product: ${input.query}` },
        ],
      });

      const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
      if (parsed && parsed.name) return mapParsed(parsed, input.query, 'Based on AI knowledge (live web search unavailable)', []);
    } catch {
      // fall through
    }

    return emptyResult(input.query, 'Both OpenAI and Tavily search failed. Please try again later.', []);
  },
});
