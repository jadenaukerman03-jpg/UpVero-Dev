import { z } from "zod";

/** Raw, optionally incomplete information collected before a site is created. */
export interface Lead {
  id: string;
  businessName?: string | undefined;
  ownerName?: string | undefined;
  industry?: string | undefined;
  phone?: string | undefined;
  email?: string | undefined;
  address?: string | undefined;
  city?: string | undefined;
  state?: string | undefined;
  zipCode?: string | undefined;
  website?: string | undefined;
  serviceAreas?: string[] | undefined;
  services?: string[] | undefined;
  businessDescription?: string | undefined;
  yearsInBusiness?: number | undefined;
  licenseNumber?: string | undefined;
  googleRating?: number | undefined;
  reviewCount?: number | undefined;
  notes?: string | undefined;
  source?: string | undefined;
  createdAt: string;
}

export type LeadInput = Omit<Lead, "id" | "createdAt">;

const optionalText = z.string().trim().max(2_000).optional();
const optionalList = z.array(z.string().trim().min(1).max(240)).max(20).optional();

export const leadSchema: z.ZodType<Lead> = z.object({
  id: z.string().min(1).max(120),
  businessName: optionalText,
  ownerName: optionalText,
  industry: optionalText,
  phone: optionalText,
  email: optionalText,
  address: optionalText,
  city: optionalText,
  state: optionalText,
  zipCode: optionalText,
  website: optionalText,
  serviceAreas: optionalList,
  services: optionalList,
  businessDescription: z.string().trim().max(8_000).optional(),
  yearsInBusiness: z.number().int().nonnegative().optional(),
  licenseNumber: optionalText,
  googleRating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().int().nonnegative().optional(),
  notes: optionalText,
  source: optionalText,
  createdAt: z.string().min(1).max(100),
});

export function createLead(input: LeadInput): Lead {
  return leadSchema.parse({
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  });
}
