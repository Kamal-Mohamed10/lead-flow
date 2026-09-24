import { z } from "zod";

export const timelineValues = [
  "asap",
  "30_days",
  "60_days",
  "90_days",
  "6_months_plus",
  "exploring",
] as const;

export type Timeline = (typeof timelineValues)[number];

const nullableNumber = (min: number, max: number) =>
  z.preprocess(
    (value) =>
      value === "" || value === null || value === undefined ? null : Number(value),
    z.number().finite().min(min).max(max).nullable(),
  );

export const leadSubmissionSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(120),
  email: z.string().trim().email("Enter a valid email address.").max(254),
  phone: z.string().trim().max(30).optional(),
  streetAddress: z.string().trim().min(3, "Enter a street address.").max(200),
  city: z.string().trim().min(2, "Enter a city.").max(100),
  state: z.string().trim().min(2, "Enter a state.").max(50),
  postalCode: z.string().trim().min(5, "Enter a ZIP code.").max(10),
  propertyType: z.string().trim().min(1).max(80),
  bedrooms: nullableNumber(0, 30),
  bathrooms: nullableNumber(0, 30),
  squareFeet: nullableNumber(300, 100_000),
  yearBuilt: nullableNumber(1800, 2100),
  estimatedValue: nullableNumber(0, 100_000_000),
  isBuyingNextHome: z.boolean(),
  timeline: z.enum(timelineValues),
  motivation: z.string().trim().max(2_000).optional(),
  urgencyScore: z.coerce.number().int().min(1).max(100),
  consent: z.literal(true, {
    error: "Consent is required before submitting.",
  }),
  website: z.string().trim().max(200).optional(),
});

export type LeadSubmission = z.infer<typeof leadSubmissionSchema>;
