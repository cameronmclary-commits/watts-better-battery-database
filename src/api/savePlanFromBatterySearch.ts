import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { tavilySearch } from '../lib/tavily';

const PLAN_SYSTEM_PROMPT = `You are an Australian energy plan research assistant specialising in HOME BATTERY STORAGE systems (not EVs). Parse the provided information about the given electricity plan / VPP program. Return ONLY valid JSON with ALL fields populated as thoroughly as possible:
{
  "planName": "Full official plan name",
  "provider": "Energy retailer / provider name",
  "tariffType": "Flat" | "Time of Use" | "VPP" | "Feed-in" | "Demand" | "Variable" | "Wholesale" | null,
  "biDirectionalCharging": true/false — THIS REFERS ONLY TO HOME BATTERY BI-DIRECTIONAL CHARGING (battery-to-grid for home solar batteries). Do NOT consider EV V2G/V2H,
  "biDirectionalHours": "Hours when home battery can discharge to grid" or null — NOT EV charging windows,
  "avgCostPerKwh": <weighted average cost in dollars per kWh or null>,
  "maxGridDrawKw": <number or null>,
  "planUrl": "Direct URL to the plan's official page, or null",
  "comparisonRate": <AER reference comparison rate in c/kWh if available, or null>,
  "statesAvailable": "e.g. QLD, NSW, VIC, SA — comma separated",
  "contractTerms": "Contract length, exit fees, lock-in periods, cooling-off, benefit periods, auto-renewal terms, any conditional discounts and their requirements.",
  "tariffDetails": "Full tariff rate schedule including all structures.",
  "feedInTariff": "All feed-in tariff details.",
  "vppDetails": "VPP program details (empty string for standard plans).",
  "aiSummary": "Thorough summary covering benefits, issues, comparison to competitors, suitability for battery owners."
}

IMPORTANT:
- Capture ALL tariff rate structures
- Include BOTH excl. GST and incl. GST rates where available
- Be precise with rates — do not round numbers
- Return ONLY the JSON object, no markdown or explanation.`;

async function searchPlanDetails(planName: string, provider: string): Promise<any> {
  // Try OpenAI web search first
  try {
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey: process.env.ZITE_OPENAI_ACCESS_TOKEN });

    const response = await openai.responses.create({
      model: 'gpt-4o',
      tools: [{ type: 'web_search_preview' }],
      input: [
        { role: 'system', content: PLAN_SYSTEM_PROMPT },
        { role: 'user', content: `${planName} by ${provider} - Australian electricity plan` },
      ],
    });

    const text = response.output_text || '';
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    // Fallback to Tavily + OpenAI chat completions
    const tavilyResult = await tavilySearch(
      `${planName} ${provider} electricity plan Australia home battery tariff rates feed-in VPP`,
      { maxResults: 10, searchDepth: 'advanced', includeAnswer: true }
    );

    const answer = tavilyResult.answer || '';
    const sourcesText = tavilyResult.results.map(r => `Source: ${r.title} (${r.url})\n${r.content}`).join('\n\n');

    // Try OpenAI chat completions to parse Tavily data
    try {
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.ZITE_OPENAI_ACCESS_TOKEN });

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: PLAN_SYSTEM_PROMPT },
          { role: 'user', content: `Plan: ${planName} by ${provider}\n\nTavily Summary: ${answer}\n\nSources:\n${sourcesText}` },
        ],
      });

      return JSON.parse(completion.choices[0]?.message?.content || '{}');
    } catch {
      // Pure Tavily fallback — return what we can
      if (!answer && tavilyResult.results.length === 0) {
        throw new Error('Both OpenAI and Tavily failed to find details for this plan. Try searching manually.');
      }

      return {
        planName,
        provider,
        tariffType: null,
        biDirectionalCharging: false,
        biDirectionalHours: null,
        avgCostPerKwh: null,
        maxGridDrawKw: null,
        planUrl: tavilyResult.results[0]?.url || null,
        comparisonRate: null,
        statesAvailable: '',
        contractTerms: '',
        tariffDetails: sourcesText.slice(0, 3000),
        feedInTariff: '',
        vppDetails: '',
        aiSummary: answer || `Found ${tavilyResult.results.length} sources but could not parse details. Check sources manually.`,
      };
    }
  }
}

export default createEndpoint({
  description: 'AI searches for full energy plan details, saves it, links to battery, and creates compatibility records',
  inputSchema: z.object({
    planName: z.string(),
    provider: z.string(),
    batteryId: z.string(),
    batteryName: z.string(),
    compatibility: z.string(),
    restrictions: z.string(),
  }),
  outputSchema: z.object({
    planId: z.string(),
    compatibilityId: z.string(),
    planName: z.string(),
  }),
  execute: async ({ input }) => {
    const data = await searchPlanDetails(input.planName, input.provider);

    // Check if plan already exists
    const { records: existing } = await zite.energyPlans.findAll({
      filters: { planName: { contains: input.planName } },
      limit: 5,
    });

    let planId: string;

    if (existing.length > 0) {
      planId = existing[0].id;
      await zite.energyPlans.update({
        id: planId,
        record: {
          planName: data.planName || input.planName,
          provider: data.provider || input.provider,
          tariffType: data.tariffType ?? null,
          biDirectionalCharging: data.biDirectionalCharging ?? false,
          biDirectionalHours: data.biDirectionalHours ?? null,
          avgCostPerKwh: data.avgCostPerKwh ?? null,
          maxGridDrawKw: data.maxGridDrawKw ?? null,
          planUrl: data.planUrl ?? null,
          aiSummary: data.aiSummary ?? null,
          tariffDetails: data.tariffDetails ?? null,
          feedInTariff: data.feedInTariff ?? null,
          vppDetails: data.vppDetails ?? null,
          comparisonRate: data.comparisonRate ?? null,
          contractTerms: data.contractTerms ?? null,
          statesAvailable: data.statesAvailable ?? null,
        },
      });
    } else {
      const created = await zite.energyPlans.create({
        record: {
          planName: data.planName || input.planName,
          provider: data.provider || input.provider,
          tariffType: data.tariffType ?? null,
          biDirectionalCharging: data.biDirectionalCharging ?? false,
          biDirectionalHours: data.biDirectionalHours ?? null,
          avgCostPerKwh: data.avgCostPerKwh ?? null,
          maxGridDrawKw: data.maxGridDrawKw ?? null,
          planUrl: data.planUrl ?? null,
          aiSummary: data.aiSummary ?? null,
          tariffDetails: data.tariffDetails ?? null,
          feedInTariff: data.feedInTariff ?? null,
          vppDetails: data.vppDetails ?? null,
          comparisonRate: data.comparisonRate ?? null,
          contractTerms: data.contractTerms ?? null,
          statesAvailable: data.statesAvailable ?? null,
          compatibleBatteries: [input.batteryId],
        },
      });
      planId = created.id;
    }

    // Link battery to plan if not already linked
    if (existing.length > 0) {
      const plan = await zite.energyPlans.findOne({ id: planId });
      const currentBatteries = Array.isArray(plan?.compatibleBatteries)
        ? plan.compatibleBatteries
        : plan?.compatibleBatteries ? [plan.compatibleBatteries] : [];
      if (!currentBatteries.includes(input.batteryId)) {
        await zite.energyPlans.update({
          id: planId,
          record: { compatibleBatteries: [...currentBatteries, input.batteryId] },
        });
      }
    }

    // Map compatibility string to status
    const statusMap: Record<string, string> = {
      full: 'compatible', compatible: 'compatible',
      partial: 'partial',
      incompatible: 'incompatible',
    };
    const compatLower = input.compatibility.toLowerCase();
    const status = Object.entries(statusMap).find(([k]) => compatLower.includes(k))?.[1] || 'unconfirmed';

    // Upsert compatibility record
    const { records: existingCompat } = await zite.batteryPlanCompatibility.findAll({
      filters: { battery: input.batteryId, energyPlan: planId },
      limit: 1,
    });

    let compatId: string;
    if (existingCompat.length > 0) {
      compatId = existingCompat[0].id;
      await zite.batteryPlanCompatibility.update({
        id: compatId,
        record: {
          compatibilityStatus: status,
          compatibilityNotes: input.compatibility,
          restrictions: input.restrictions !== 'None known' ? input.restrictions : null,
        },
      });
    } else {
      const compat = await zite.batteryPlanCompatibility.create({
        record: {
          label: `${input.batteryName} × ${data.planName || input.planName}`,
          battery: input.batteryId,
          energyPlan: planId,
          compatibilityStatus: status,
          compatibilityNotes: input.compatibility,
          restrictions: input.restrictions !== 'None known' ? input.restrictions : null,
        },
      });
      compatId = compat.id;
    }

    return { planId, compatibilityId: compatId, planName: data.planName || input.planName };
  },
});
