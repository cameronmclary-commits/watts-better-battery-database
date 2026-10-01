import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

const numericBatteryFields = ['moduleSize', 'usableCapacity', 'maxChargeRate', 'maxDischargeRate', 'roundTripEfficiency', 'cycleWarranty', 'depthOfDischarge'];
const numericSolarFields = ['wattage', 'efficiency', 'voltageMpp', 'currentMpp', 'openCircuitVoltage', 'shortCircuitCurrent', 'weightKg', 'warrantyYears', 'performanceWarrantyPct'];
const numericPlanFields = ['avgCostPerKwh', 'maxGridDrawKw', 'comparisonRate'];
const booleanFields = ['biDirectionalCharging', 'expandable'];

function coerce(field: string, value: string | null, recordType: string): any {
  if (value === null || value === '') return null;
  const allNumeric = [...numericBatteryFields, ...numericSolarFields, ...numericPlanFields];
  if (allNumeric.includes(field)) {
    const n = Number(value);
    return isNaN(n) ? null : n;
  }
  if (booleanFields.includes(field)) {
    return value === 'true' || value === '1';
  }
  return value;
}

export default createEndpoint({
  description: 'Applies approved changes from URL extraction to existing or new records',
  inputSchema: z.object({
    updates: z.array(z.object({
      recordType: z.enum(['battery', 'solarPanel', 'energyPlan', 'installer', 'inspector']),
      recordId: z.string().nullable(),
      isNew: z.boolean(),
      recordName: z.string(),
      fields: z.array(z.object({
        field: z.string(),
        value: z.string().nullable(),
      })),
    })),
  }),
  outputSchema: z.object({
    applied: z.number(),
    created: z.number(),
  }),
  execute: async ({ input }) => {
    let applied = 0;
    let created = 0;

    for (const upd of input.updates) {
      const record: any = {};
      for (const f of upd.fields) {
        record[f.field] = coerce(f.field, f.value, upd.recordType);
      }

      const tableMap: Record<string, any> = {
        battery: zite.batteries,
        solarPanel: zite.solarPanels,
        energyPlan: zite.energyPlans,
        installer: zite.installers,
        inspector: zite.inspectors,
      };

      const table = tableMap[upd.recordType];
      if (!table) continue;

      if (upd.isNew || !upd.recordId) {
        // For batteries, check if a matching family record already exists before creating
        if (upd.recordType === 'battery') {
          const { records: existing } = await zite.batteries.findAll({ limit: 500 });
          const nameLower = upd.recordName.toLowerCase().trim();
          const match = existing.find((b: any) => {
            const bName = (b.name || '').toLowerCase().trim();
            return bName === nameLower || nameLower.includes(bName) || bName.includes(nameLower);
          });
          if (match) {
            // Update the existing battery instead of creating a duplicate
            await table.update({ id: match.id, record });
            applied++;
            continue;
          }
        }
        const nameField = upd.recordType === 'energyPlan' ? 'planName' : 'name';
        if (!record[nameField]) record[nameField] = upd.recordName;
        await table.create({ record });
        created++;
      } else {
        await table.update({ id: upd.recordId, record });
        applied++;
      }
    }

    return { applied, created };
  },
});
