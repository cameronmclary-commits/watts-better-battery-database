import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

const attachmentSchema = z.object({
  url: z.string(), filename: z.string(), originalName: z.string().optional(),
  contentType: z.string().optional(), size: z.number().optional(),
}).passthrough();

export default createEndpoint({
  description: 'Lists accreditations for an installer',
  inputSchema: z.object({ installerId: z.string() }),
  outputSchema: z.object({
    accreditations: z.array(z.object({
      id: z.string(), accreditationName: z.string(),
      accreditationNumber: z.string().nullable(),
      certificateImage: z.array(attachmentSchema),
      issuingBody: z.string().nullable(),
      expiryDate: z.string().nullable(),
      status: z.string().nullable(),
    })),
  }),
  execute: async ({ input }) => {
    const { records } = await zite.installerAccreditations.findAll({
      filters: { installer: input.installerId },
      limit: 200,
    });
    return {
      accreditations: records.map(r => ({
        id: r.id, accreditationName: r.accreditationName || '',
        accreditationNumber: r.accreditationNumber ?? null,
        certificateImage: (r.certificateImage as any[]) || [],
        issuingBody: r.issuingBody ?? null,
        expiryDate: r.expiryDate ?? null,
        status: r.status ?? null,
      })),
    };
  },
});
