import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { tavilySearch } from '../lib/tavily';

const changeSchema = z.object({
  field: z.string(),
  currentValue: z.string().nullable(),
  proposedValue: z.string().nullable(),
  confidence: z.enum(['high', 'medium', 'low']),
  sourceCount: z.number(),
  sources: z.array(z.string()),
  reason: z.string(),
});

async function searchBatterySpecs(name: string, manufacturer: string): Promise<string> {
  try {
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey: process.env.ZITE_OPENAI_ACCESS_TOKEN });
    const searchResponse = await openai.responses.create({
      model: 'gpt-4o',
      tools: [{ type: 'web_search_preview' }],
      input: [
        {
          role: 'user',
          content: `Search for the latest specifications and data for the "${name}" home battery by ${manufacturer} for the Australian market. Find information from at least 3-4 different sources including: the manufacturer's official site, CEC approved battery list, installer/reviewer sites (e.g. SolarQuotes, Solar Choice, Clean Energy Reviews), and Australian distributor pages. For each spec (capacity, charge/discharge rates, efficiency, warranty cycles, depth of discharge), note what each source says. Also check for any discontinuation, recalls, firmware updates, or model refreshes.`,
        },
      ],
    });
    return searchResponse.output_text || '';
  } catch {
    const [specsResult, warrantyResult] = await Promise.all([
      tavilySearch(
        `"${name}" ${manufacturer} home battery specifications usable capacity kWh charge rate discharge rate efficiency Australia`,
        { maxResults: 8, searchDepth: 'advanced', includeAnswer: true }
      ),
      tavilySearch(
        `"${name}" ${manufacturer} battery warranty cycles depth of discharge status Australia 2026`,
        { maxResults: 5, searchDepth: 'advanced' }
      ).catch(() => ({ results: [] as any[], answer: '' })),
    ]);
    const allResults = [...specsResult.results, ...warrantyResult.results];
    const seen = new Set<string>();
    const unique = allResults.filter(r => { if (seen.has(r.url)) return false; seen.add(r.url); return true; });
    const answer = specsResult.answer || '';
    const sourcesText = unique.map(r => `Source: ${r.title} (${r.url})\n${r.content}`).join('\n\n');
    return `[Tavily Search Results]\n\nSummary: ${answer}\n\n${sourcesText}`;
  }
}

async function parseChanges(name: string, manufacturer: string, searchText: string, currentSpecs: any): Promise<any> {
  try {
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey: process.env.ZITE_OPENAI_ACCESS_TOKEN });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are verifying battery specs against web data. You have research from multiple sources about "${name}" by ${manufacturer}. Compare it against the current stored specs and identify genuine differences.

Current stored specs:
${JSON.stringify(currentSpecs, null, 2)}

Return a JSON object:
{
  "changes": [
    {
      "field": "field name (moduleSize, usableCapacity, maxChargeRate, maxDischargeRate, roundTripEfficiency, cycleWarranty, depthOfDischarge, status, manufacturer, model, approxPrice, warrantyText, batteryType, features, powerRating, weight, dimensions, ipRating, operatingTempRange, compatibleInverterBrands, totalWarrantedKwh)",
      "currentValue": "what we currently have stored (as string)",
      "proposedValue": "what the sources say it should be (as string)",
      "confidence": "high" | "medium" | "low",
      "sourceCount": <number of independent sources that agree on this value>,
      "sources": ["source name or URL for each agreeing source"],
      "reason": "Brief explanation with source details"
    }
  ],
  "summary": "One paragraph summarising findings, notable news (firmware, recalls, discontinuation, price changes, replacements)",
  "noChanges": true/false
}

CONFIDENCE RULES — these are strict:
- "high": 3+ independent sources agree on the same value.
- "medium": 2 sources agree, or the manufacturer's official datasheet states the value.
- "low": only 1 source, or sources disagree.

IMPORTANT:
- Do NOT propose a change unless at least 2 independent sources agree on the proposed value.
- Only flag genuine differences — not rounding, unit formatting, or trivial text differences.
- For efficiency/DoD: stored as decimals (0.965 = 96.5%), compare accordingly.
- If everything looks correct, set noChanges: true with an empty changes array.`,
        },
        {
          role: 'user',
          content: `Here is the research gathered from multiple sources:\n\n${searchText}\n\nAnalyse this and produce the structured comparison.`,
        },
      ],
    });
    return JSON.parse(completion.choices[0]?.message?.content || '{}');
  } catch {
    return {
      changes: [],
      summary: `Could not parse search results for ${name}. Raw data was collected but parsing failed.`,
      noChanges: true,
    };
  }
}

export default createEndpoint({
  description: 'Checks a single battery for spec updates using AI web search',
  inputSchema: z.object({
    batteryId: z.string(),
  }),
  outputSchema: z.object({
    batteryId: z.string(),
    batteryName: z.string(),
    changes: z.array(changeSchema),
    summary: z.string(),
    noChanges: z.boolean(),
  }),
  execute: async ({ input }) => {
    const bat = await zite.batteries.findOne({ id: input.batteryId });
    if (!bat) throw new Error('Battery not found');

    const name = bat.name || '';
    const manufacturer = bat.manufacturer || '';

    const { records: capOpts } = await zite.capacityOptions.findAll({
      filters: { battery: input.batteryId },
      limit: 100,
    });

    const currentSpecs = {
      manufacturer,
      model: bat.model || '',
      moduleSize: bat.moduleSize ?? null,
      usableCapacity: bat.usableCapacity ?? null,
      maxChargeRate: bat.maxChargeRate ?? null,
      maxDischargeRate: bat.maxDischargeRate ?? null,
      roundTripEfficiency: bat.roundTripEfficiency ?? null,
      cycleWarranty: bat.cycleWarranty ?? null,
      depthOfDischarge: bat.depthOfDischarge ?? null,
      status: bat.status || 'Active',
      approxPrice: bat.approxPrice || null,
      batteryType: bat.batteryType || null,
      features: bat.features || null,
      powerRating: bat.powerRating || null,
      weight: bat.weight || null,
      dimensions: bat.dimensions || null,
      ipRating: bat.ipRating || null,
      operatingTempRange: bat.operatingTempRange || null,
      warrantyText: bat.warrantyText || null,
      compatibleInverterBrands: bat.compatibleInverterBrands || null,
      totalWarrantedKwh: bat.totalWarrantedKwh || null,
      capacityOptions: capOpts.map(co => ({
        label: co.label || '',
        capacityKwh: co.capacityKwh ?? null,
        numberOfModules: co.numberOfModules ?? null,
      })),
    };

    try {
      const searchText = await searchBatterySpecs(name, manufacturer);
      const data = await parseChanges(name, manufacturer, searchText, currentSpecs);

      return {
        batteryId: bat.id,
        batteryName: name,
        changes: Array.isArray(data.changes)
          ? data.changes.map((c: any) => ({
              field: c.field || '',
              currentValue: c.currentValue ?? null,
              proposedValue: c.proposedValue ?? null,
              confidence: ['high', 'medium', 'low'].includes(c.confidence) ? c.confidence : 'low',
              sourceCount: typeof c.sourceCount === 'number' ? c.sourceCount : 0,
              sources: Array.isArray(c.sources) ? c.sources.filter((s: any) => typeof s === 'string') : [],
              reason: c.reason || '',
            }))
          : [],
        summary: data.summary || '',
        noChanges: data.noChanges ?? (Array.isArray(data.changes) && data.changes.length === 0),
      };
    } catch {
      return {
        batteryId: bat.id,
        batteryName: name,
        changes: [],
        summary: 'Both OpenAI and Tavily search failed for this battery.',
        noChanges: true,
      };
    }
  },
});
