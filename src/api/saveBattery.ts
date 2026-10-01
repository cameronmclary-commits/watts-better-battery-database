import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Creates or updates a battery',
  inputSchema: z.object({
    id: z.string().optional(),
    name: z.string(), manufacturer: z.string(), model: z.string(),
    moduleSize: z.number().nullable().optional(), usableCapacity: z.number().nullable().optional(),
    maxChargeRate: z.number().nullable().optional(), maxDischargeRate: z.number().nullable().optional(),
    roundTripEfficiency: z.number().nullable().optional(), cycleWarranty: z.number().nullable().optional(),
    depthOfDischarge: z.number().nullable().optional(), description: z.string().optional(),
    status: z.string().optional(), notRecommendedReason: z.string().nullable().optional(), additionalInfo: z.string().optional(),
    manufacturerOverview: z.string().optional(),
    imageUrl: z.string().nullable().optional(),
    expandable: z.boolean().optional(),
    expansionTimeframe: z.string().optional(),
    arModelUrl: z.string().nullable().optional(),
    specSheetUrl: z.string().nullable().optional(),
    batteryType: z.string().nullable().optional(),
    allInOneUnit: z.boolean().optional(),
    nominalStorage: z.number().nullable().optional(),
    features: z.string().nullable().optional(),
    powerRating: z.string().nullable().optional(),
    weight: z.string().nullable().optional(),
    dimensions: z.string().nullable().optional(),
    offGridCapable: z.boolean().optional(),
    ipRating: z.string().nullable().optional(),
    operatingTempRange: z.string().nullable().optional(),
    warrantyText: z.string().nullable().optional(),
    compatibleInverterBrands: z.string().nullable().optional(),
    totalWarrantedKwh: z.string().nullable().optional(),
    costPerWarrantedKwh: z.string().nullable().optional(),
    approxPrice: z.string().nullable().optional(),
    manufacturerLogoUrl: z.string().nullable().optional(),
  }),
  outputSchema: z.object({ id: z.string() }),
  execute: async ({ input }) => {
    const record: any = {
      name: input.name, manufacturer: input.manufacturer, model: input.model,
      moduleSize: input.moduleSize ?? null, usableCapacity: input.usableCapacity ?? null,
      maxChargeRate: input.maxChargeRate ?? null, maxDischargeRate: input.maxDischargeRate ?? null,
      roundTripEfficiency: input.roundTripEfficiency ?? null, cycleWarranty: input.cycleWarranty ?? null,
      depthOfDischarge: input.depthOfDischarge ?? null, description: input.description || null,
      status: input.status || null, notRecommendedReason: input.notRecommendedReason ?? null, additionalInfo: input.additionalInfo || null,
      manufacturerOverview: input.manufacturerOverview || null,
      expandable: input.expandable ?? false,
      expansionTimeframe: input.expansionTimeframe || null,
      specSheetUrl: input.specSheetUrl ?? undefined,
      batteryType: input.batteryType ?? undefined,
      allInOneUnit: input.allInOneUnit ?? undefined,
      nominalStorage: input.nominalStorage ?? undefined,
      features: input.features ?? undefined,
      powerRating: input.powerRating ?? undefined,
      weight: input.weight ?? undefined,
      dimensions: input.dimensions ?? undefined,
      offGridCapable: input.offGridCapable ?? undefined,
      ipRating: input.ipRating ?? undefined,
      operatingTempRange: input.operatingTempRange ?? undefined,
      warrantyText: input.warrantyText ?? undefined,
      compatibleInverterBrands: input.compatibleInverterBrands ?? undefined,
      totalWarrantedKwh: input.totalWarrantedKwh ?? undefined,
      costPerWarrantedKwh: input.costPerWarrantedKwh ?? undefined,
      approxPrice: input.approxPrice ?? undefined,
    };
    if (input.imageUrl !== undefined) {
      record.images = input.imageUrl ? [{ url: input.imageUrl }] : null;
    }
    if (input.arModelUrl !== undefined) {
      record['_3DArModel'] = input.arModelUrl ? [{ url: input.arModelUrl }] : null;
    }
    if (input.manufacturerLogoUrl !== undefined) {
      record.manufacturerLogo = input.manufacturerLogoUrl ? [{ url: input.manufacturerLogoUrl }] : null;
    }
    if (input.id) {
      await zite.batteries.update({ id: input.id, record });
      return { id: input.id };
    }

    // Check for duplicate by name (case-insensitive) before creating
    const { records: existing } = await zite.batteries.findAll({
      filters: { name: { contains: input.name } },
      limit: 10,
    });
    const match = existing.find(
      (b) => b.name?.toLowerCase().trim() === input.name.toLowerCase().trim()
    );
    if (match) {
      // Update existing record instead of creating a duplicate
      await zite.batteries.update({ id: match.id, record });
      return { id: match.id };
    }

    const created = await zite.batteries.create({ record });
    return { id: created.id };
  },
});
