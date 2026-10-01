import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { tavilySearch } from '../lib/tavily';

const proposedChangeSchema = z.object({
  field: z.string(),
  fieldLabel: z.string(),
  currentValue: z.string().nullable(),
  proposedValue: z.string().nullable(),
});

const recordUpdateSchema = z.object({
  recordType: z.enum(['battery', 'solarPanel', 'energyPlan', 'installer', 'inspector']),
  recordId: z.string().nullable(),
  recordName: z.string(),
  isNew: z.boolean(),
  changes: z.array(proposedChangeSchema),
});

async function fetchPageContent(url: string): Promise<{ summary: string; extractedRecords: any[] }> {
  // Try OpenAI first
  try {
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey: process.env.ZITE_OPENAI_ACCESS_TOKEN });

    const extractResponse = await openai.responses.create({
      model: 'gpt-4o',
      tools: [{ type: 'web_search_preview' }],
      input: [
        {
          role: 'system',
          content: `You are a data extraction assistant for an Australian solar battery database. You will be given a URL to read. Extract ALL relevant product/service information from the page that relates to any of these record types:

1. **Batteries** — home battery products with specs: name, manufacturer, model, moduleSize (kWh), usableCapacity (kWh), maxChargeRate (kW), maxDischargeRate (kW), roundTripEfficiency (decimal 0-1), cycleWarranty (minimum throughput energy in MWh), depthOfDischarge (decimal 0-1), description, additionalInfo, manufacturerOverview, status (Active/Discontinued/Coming Soon), specSheetUrl, expandable (boolean), expansionTimeframe
2. **Solar Panels** — panels with specs: name, manufacturer, model, wattage (W), efficiency (%), cellType, voltageMpp (V), currentMpp (A), openCircuitVoltage (V), shortCircuitCurrent (A), weightKg, dimensions, warrantyYears, performanceWarrantyPct (%), status, description, additionalInfo, manufacturerOverview
3. **Energy Plans** — Australian energy plans: planName, provider, tariffType (Flat/Time of Use/VPP/Feed-in/Demand/Variable/Wholesale), biDirectionalCharging (boolean), biDirectionalHours, avgCostPerKwh ($), maxGridDrawKw, planUrl, aiSummary, batteryLimitations, tariffDetails, feedInTariff, vppDetails, comparisonRate, contractTerms, statesAvailable
4. **Installers** — solar installers: name, contactEmail, phone, region, status, address, qldElectricalLicence, electricalLicenceHolder, abn, contactPerson, mobilePhone, officePhone, batteryBrands, pvBrands
5. **Inspectors** — electrical inspectors: name, contactEmail, contactPerson, mobilePhone, officePhone, address, region, status, qldElectricalLicence, electricalLicenceHolder, abn, specialisations, notes

Return ONLY valid JSON:
{
  "summary": "Brief description of what information was found on this page",
  "extractedRecords": [
    {
      "recordType": "battery" | "solarPanel" | "energyPlan" | "installer" | "inspector",
      "identifyingName": "The product/company/plan name to match against existing records",
      "fields": { "fieldName": "value", ... }
    }
  ]
}

Extract every distinct record you find on the page. Include ALL available fields — use null for fields not found on the page. For efficiency and DoD, use decimals (0.965 not 96.5%). Return ONLY JSON.`,
        },
        {
          role: 'user',
          content: `Read this URL and extract all relevant information: ${url}`,
        },
      ],
    });

    const extractText = extractResponse.output_text || '';
    const cleaned = extractText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (openaiErr) {
    // Fallback to Tavily
    const tavilyResult = await tavilySearch(
      `site:${new URL(url).hostname} ${url} solar battery panel installer energy plan specifications`,
      { maxResults: 10, searchDepth: 'advanced', includeAnswer: true }
    );

    const answer = tavilyResult.answer || '';
    const sourcesText = tavilyResult.results.map(r => `Source: ${r.title} (${r.url})\n${r.content}`).join('\n\n');

    if (!answer && tavilyResult.results.length === 0) {
      throw new Error('Both OpenAI and Tavily failed to read this URL. Please try again later.');
    }

    // Try OpenAI chat completions to parse Tavily results (different endpoint, may work)
    try {
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.ZITE_OPENAI_ACCESS_TOKEN });

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `Parse the following web content about solar/battery products into structured records. Return JSON with "summary" and "extractedRecords" array. Each record needs "recordType" (battery/solarPanel/energyPlan/installer/inspector), "identifyingName", and "fields" object. Use null for unknown values.`,
          },
          { role: 'user', content: `URL: ${url}\n\nSummary: ${answer}\n\nContent:\n${sourcesText}` },
        ],
      });

      const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
      return {
        summary: parsed.summary || answer,
        extractedRecords: parsed.extractedRecords || [],
      };
    } catch {
      // Pure Tavily fallback — return raw info as summary
      return {
        summary: answer || `Found ${tavilyResult.results.length} results related to this URL.`,
        extractedRecords: [],
      };
    }
  }
}

export default createEndpoint({
  description: 'Extracts information from a URL using AI and matches it against existing records to propose updates',
  inputSchema: z.object({ url: z.string() }),
  outputSchema: z.object({
    summary: z.string(),
    records: z.array(recordUpdateSchema),
    sourceUrl: z.string(),
  }),
  execute: async ({ input }) => {
    const extracted = await fetchPageContent(input.url);

    if (!Array.isArray(extracted.extractedRecords) || extracted.extractedRecords.length === 0) {
      return { summary: extracted.summary || 'No relevant records found on this page.', records: [], sourceUrl: input.url };
    }

    // Load existing records to match against
    const [batteries, solarPanels, energyPlans, installers, inspectors] = await Promise.all([
      zite.batteries.findAll({ limit: 500 }),
      zite.solarPanels.findAll({ limit: 500 }),
      zite.energyPlans.findAll({ limit: 500 }),
      zite.installers.findAll({ limit: 500 }),
      zite.inspectors.findAll({ limit: 500 }),
    ]);

    const existingMap: Record<string, any[]> = {
      battery: batteries.records,
      solarPanel: solarPanels.records,
      energyPlan: energyPlans.records,
      installer: installers.records,
      inspector: inspectors.records,
    };

    const nameField: Record<string, string> = {
      battery: 'name', solarPanel: 'name', energyPlan: 'planName', installer: 'name', inspector: 'name',
    };

    const fieldLabels: Record<string, Record<string, string>> = {
      battery: {
        name: 'Name', manufacturer: 'Manufacturer', model: 'Model', moduleSize: 'Module Size (kWh)',
        usableCapacity: 'Usable Capacity (kWh)', maxChargeRate: 'Max Charge Rate (kW)',
        maxDischargeRate: 'Max Discharge Rate (kW)', roundTripEfficiency: 'Round Trip Efficiency',
        cycleWarranty: 'Min Throughput Energy (MWh)', depthOfDischarge: 'Depth of Discharge',
        description: 'Description', additionalInfo: 'Additional Info',
        manufacturerOverview: 'Manufacturer Overview', status: 'Status',
        specSheetUrl: 'Spec Sheet URL', expandable: 'Expandable', expansionTimeframe: 'Expansion Timeframe',
      },
      solarPanel: {
        name: 'Name', manufacturer: 'Manufacturer', model: 'Model', wattage: 'Wattage (W)',
        efficiency: 'Efficiency (%)', cellType: 'Cell Type', voltageMpp: 'Voltage MPP (V)',
        currentMpp: 'Current MPP (A)', openCircuitVoltage: 'Open Circuit Voltage (V)',
        shortCircuitCurrent: 'Short Circuit Current (A)', weightKg: 'Weight (kg)',
        dimensions: 'Dimensions', warrantyYears: 'Warranty (years)',
        performanceWarrantyPct: 'Performance Warranty (%)', status: 'Status',
        description: 'Description', additionalInfo: 'Additional Info',
        manufacturerOverview: 'Manufacturer Overview',
      },
      energyPlan: {
        planName: 'Plan Name', provider: 'Provider', tariffType: 'Tariff Type',
        biDirectionalCharging: 'Bi-directional Charging', biDirectionalHours: 'Bi-directional Hours',
        avgCostPerKwh: 'Avg Cost/kWh', maxGridDrawKw: 'Max Grid Draw (kW)',
        planUrl: 'Plan URL', aiSummary: 'AI Summary', batteryLimitations: 'Battery Limitations',
        tariffDetails: 'Tariff Details', feedInTariff: 'Feed-in Tariff',
        vppDetails: 'VPP Details', comparisonRate: 'Comparison Rate',
        contractTerms: 'Contract Terms', statesAvailable: 'States Available',
      },
      installer: {
        name: 'Name', contactEmail: 'Email', phone: 'Phone', region: 'Region', status: 'Status',
        address: 'Address', qldElectricalLicence: 'QLD Electrical Licence',
        electricalLicenceHolder: 'Licence Holder', abn: 'ABN', contactPerson: 'Contact Person',
        mobilePhone: 'Mobile', officePhone: 'Office Phone', batteryBrands: 'Battery Brands',
        pvBrands: 'PV Brands',
      },
      inspector: {
        name: 'Name', contactEmail: 'Email', contactPerson: 'Contact Person',
        mobilePhone: 'Mobile', officePhone: 'Office Phone', address: 'Address',
        region: 'Region', status: 'Status', qldElectricalLicence: 'QLD Electrical Licence',
        electricalLicenceHolder: 'Licence Holder', abn: 'ABN',
        specialisations: 'Specialisations', notes: 'Notes',
      },
    };

    const results: z.infer<typeof recordUpdateSchema>[] = [];

    for (const rec of extracted.extractedRecords) {
      const rType = rec.recordType as string;
      if (!existingMap[rType]) continue;

      const nf = nameField[rType];
      const searchName = (rec.identifyingName || '').toLowerCase().trim();
      const existing = existingMap[rType].find((e: any) => {
        const eName = (e[nf] || '').toLowerCase().trim();
        return eName === searchName || eName.includes(searchName) || searchName.includes(eName);
      });

      const labels = fieldLabels[rType] || {};
      const changes: z.infer<typeof proposedChangeSchema>[] = [];
      const fields = rec.fields || {};

      for (const [field, newVal] of Object.entries(fields)) {
        if (newVal === null || newVal === undefined || newVal === '') continue;
        if (field === 'identifyingName') continue;

        const label = labels[field] || field;
        const newStr = String(newVal);

        if (existing) {
          const curVal = (existing as any)[field];
          const curStr = curVal != null ? String(curVal) : null;
          if (curStr !== newStr && !(curStr === null && newStr === '')) {
            changes.push({ field, fieldLabel: label, currentValue: curStr, proposedValue: newStr });
          }
        } else {
          changes.push({ field, fieldLabel: label, currentValue: null, proposedValue: newStr });
        }
      }

      if (changes.length > 0) {
        results.push({
          recordType: rType as any,
          recordId: existing?.id ?? null,
          recordName: rec.identifyingName || 'Unknown',
          isNew: !existing,
          changes,
        });
      }
    }

    return {
      summary: extracted.summary || 'Information extracted from URL.',
      records: results,
      sourceUrl: input.url,
    };
  },
});
