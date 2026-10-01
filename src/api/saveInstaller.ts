import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Creates or updates an installer',
  inputSchema: z.object({
    id: z.string().optional(), name: z.string(),
    contactEmail: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    contactPerson: z.string().nullable().optional(),
    mobilePhone: z.string().nullable().optional(),
    officePhone: z.string().nullable().optional(),
    region: z.string().nullable().optional(),
    status: z.string().optional(),
    qldElectricalLicence: z.string().nullable().optional(),
    electricalLicenceHolder: z.string().nullable().optional(),
    abn: z.string().nullable().optional(),
    batteryBrands: z.string().nullable().optional(),
    pvBrands: z.string().nullable().optional(),
    serviceAreas: z.array(z.string()).optional(),
    batteriesProvided: z.array(z.string()).optional(),
    solarPanelsProvided: z.array(z.string()).optional(),
  }),
  outputSchema: z.object({ id: z.string() }),
  execute: async ({ input }) => {
    const record: any = {
      name: input.name,
      contactEmail: input.contactEmail ?? null,
      address: input.address ?? null,
      contactPerson: input.contactPerson ?? null,
      mobilePhone: input.mobilePhone ?? null,
      officePhone: input.officePhone ?? null,
      region: input.region ?? null,
      status: input.status || 'Active',
      qldElectricalLicence: input.qldElectricalLicence ?? null,
      electricalLicenceHolder: input.electricalLicenceHolder ?? null,
      abn: input.abn ?? null,
      batteryBrands: input.batteryBrands ?? null,
      pvBrands: input.pvBrands ?? null,
    };
    if (input.serviceAreas !== undefined) {
      record.serviceAreas = input.serviceAreas.length > 0 ? input.serviceAreas : null;
    }
    if (input.batteriesProvided !== undefined) {
      record.batteriesProvided = input.batteriesProvided;
    }
    if (input.solarPanelsProvided !== undefined) {
      record.solarPanelsProvided = input.solarPanelsProvided;
    }
    if (input.id) {
      await zite.installers.update({ id: input.id, record });
      return { id: input.id };
    }
    const created = await zite.installers.create({ record });
    return { id: created.id };
  },
});
