import { NextResponse } from "next/server";

import type { AddressSuggestion } from "@/lib/address";

export const dynamic = "force-dynamic";

type MapboxContext = {
  id: string;
  text?: string;
};

type MapboxFeature = {
  id: string;
  place_name?: string;
  text?: string;
  address?: string;
  context?: MapboxContext[];
};

type MapboxResponse = {
  features?: MapboxFeature[];
};

function contextValue(feature: MapboxFeature, id: string): string {
  return feature.context?.find((item) => item.id === id)?.text ?? "";
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 3) {
    return NextResponse.json({ suggestions: [] });
  }

  const accessToken = process.env.MAPBOX_ACCESS_TOKEN ?? process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!accessToken) {
    const demoSuggestion: AddressSuggestion = {
      id: "demo-address",
      label: `${query} — demo result; complete the address fields below`,
      streetAddress: query,
      city: "",
      state: "",
      postalCode: "",
      demo: true,
    };
    return NextResponse.json({ suggestions: [demoSuggestion], demo: true });
  }

  try {
    const endpoint = new URL(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`,
    );
    endpoint.searchParams.set("access_token", accessToken);
    endpoint.searchParams.set("autocomplete", "true");
    endpoint.searchParams.set("limit", "5");
    endpoint.searchParams.set("country", "us");

    const response = await fetch(endpoint, { next: { revalidate: 300 } });
    if (!response.ok) {
      return NextResponse.json({ error: "Address provider unavailable" }, { status: 502 });
    }

    const data = (await response.json()) as MapboxResponse;
    const suggestions: AddressSuggestion[] = (data.features ?? []).map((feature) => {
      const streetAddress = feature.address ?? feature.text ?? feature.place_name?.split(",")[0] ?? query;
      return {
        id: feature.id,
        label: feature.place_name ?? streetAddress,
        streetAddress,
        city: contextValue(feature, "place"),
        state: contextValue(feature, "region"),
        postalCode: contextValue(feature, "postcode"),
      };
    });

    return NextResponse.json({ suggestions, demo: false });
  } catch {
    return NextResponse.json({ error: "Address provider unavailable" }, { status: 502 });
  }
}
