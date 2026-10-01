import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Creates or updates an installer accreditation',
  inputSchema: z.object({
    id: z.string().optional(),
    installerId: z.string(),
    accreditationName: z.string(),
    accreditationNumber: z.string().nullable().optional(),
    certificateImage: z.array(z.object({ url: z.string(), filename: z.string() }).passthrough()).optional(),
    issuingBody: z.string().nullable().optional(),
    expiryDate: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
  }),
  outputSchema: z.object({ id: z.string() }),
  execute: async ({ input }) => {
    const record: any = {
      accreditationName: input.accreditationName,
      installer: [input.installerId],
      accreditationNumber: input.accreditationNumber ?? null,
      issuingBody: input.issuingBody ?? null,
      expiryDate: input.expiryDate ?? null,
      status: input.status ?? null,
    };
    if (input.certificateImage !== undefined) {
      record.certificateImage = input.certificateImage;
    }
    if (input.id) {
      await zite.installerAccreditations.update({ id: input.id, record });
      return { id: input.id };
    }
    const created = await zite.installerAccreditations.create({ record });
    return { id: created.id };
  },
});
