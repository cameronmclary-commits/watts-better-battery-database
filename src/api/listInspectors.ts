import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Lists all inspectors with full details',
  inputSchema: z.object({}),
  outputSchema: z.object({
    inspectors: z.array(z.object({
      id: z.string(), name: z.string(), contactEmail: z.string().nullable(),
      address: z.string().nullable(), contactPerson: z.string().nullable(),
      mobilePhone: z.string().nullable(), officePhone: z.string().nullable(),
      region: z.string().nullable(), status: z.string().nullable(),
      qldElectricalLicence: z.string().nullable(),
      electricalLicenceHolder: z.string().nullable(),
      abn: z.string().nullable(),
      specialisations: z.string().nullable(), notes: z.string().nullable(),
    })),
  }),
  execute: async () => {
    const { records } = await zite.inspectors.findAll({ limit: 500 });
    return {
      inspectors: records.map(r => ({
        id: r.id, name: r.name || '', contactEmail: r.contactEmail ?? null,
        address: r.address ?? null, contactPerson: r.contactPerson ?? null,
        mobilePhone: r.mobilePhone ?? null, officePhone: r.officePhone ?? null,
        region: r.region ?? null, status: r.status ?? null,
        qldElectricalLicence: r.qldElectricalLicence ?? null,
        electricalLicenceHolder: r.electricalLicenceHolder ?? null,
        abn: r.abn ?? null,
        specialisations: r.specialisations ?? null, notes: r.notes ?? null,
      })),
    };
  },
});
