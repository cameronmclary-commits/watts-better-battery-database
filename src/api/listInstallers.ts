import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Lists all installers with full details',
  inputSchema: z.object({}),
  outputSchema: z.object({
    installers: z.array(z.object({
      id: z.string(), name: z.string(), contactEmail: z.string().nullable(),
      address: z.string().nullable(), contactPerson: z.string().nullable(),
      mobilePhone: z.string().nullable(), officePhone: z.string().nullable(),
      region: z.string().nullable(), status: z.string().nullable(),
      qldElectricalLicence: z.string().nullable(),
      electricalLicenceHolder: z.string().nullable(),
      abn: z.string().nullable(),
      batteryBrands: z.string().nullable(), pvBrands: z.string().nullable(),
      serviceAreas: z.array(z.string()),
      batteriesProvided: z.array(z.string()),
      solarPanelsProvided: z.array(z.string()),
    })),
  }),
  execute: async () => {
    const { records } = await zite.installers.findAll({ limit: 500 });
    return {
      installers: records.map(r => {
        const bp = r.batteriesProvided;
        const sp = r.solarPanelsProvided;
        return {
          id: r.id, name: r.name || '', contactEmail: r.contactEmail ?? null,
          address: r.address ?? null, contactPerson: r.contactPerson ?? null,
          mobilePhone: r.mobilePhone ?? null, officePhone: r.officePhone ?? null,
          region: r.region ?? null, status: r.status ?? null,
          qldElectricalLicence: r.qldElectricalLicence ?? null,
          electricalLicenceHolder: r.electricalLicenceHolder ?? null,
          abn: r.abn ?? null,
          batteryBrands: r.batteryBrands ?? null, pvBrands: r.pvBrands ?? null,
          serviceAreas: r.serviceAreas || [],
          batteriesProvided: bp ? (Array.isArray(bp) ? bp : [bp]) : [],
          solarPanelsProvided: sp ? (Array.isArray(sp) ? sp : [sp]) : [],
        };
      }),
    };
  },
});
