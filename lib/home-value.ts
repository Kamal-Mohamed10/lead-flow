export type HomeValueInput = {
  state?: string;
  city?: string;
  squareFeet?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  propertyType?: string;
};

const stateBaseRate: Record<string, number> = {
  CA: 720,
  CO: 510,
  FL: 420,
  GA: 360,
  IL: 300,
  MA: 650,
  NC: 350,
  NJ: 480,
  NY: 610,
  OH: 250,
  PA: 270,
  TX: 300,
  WA: 560,
};

const propertyTypeFactor: Record<string, number> = {
  single_family: 1,
  condo: 0.92,
  townhome: 0.95,
  multi_family: 1.08,
  land: 0.35,
};

export function estimateHomeValue(input: HomeValueInput): number | null {
  const squareFeet = input.squareFeet ?? 0;
  if (squareFeet < 300) return null;

  const stateRate = stateBaseRate[input.state?.trim().toUpperCase() ?? ""] ?? 300;
  const typeFactor = propertyTypeFactor[input.propertyType ?? "single_family"] ?? 1;
  const bedroomAdjustment = ((input.bedrooms ?? 3) - 3) * 12_000;
  const bathroomAdjustment = ((input.bathrooms ?? 2) - 2) * 9_000;
  const rawValue =
    squareFeet * stateRate * typeFactor + bedroomAdjustment + bathroomAdjustment;

  return Math.max(150_000, Math.round(rawValue / 5_000) * 5_000);
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
