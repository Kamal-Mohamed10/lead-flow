import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { leadSubmissionSchema } from "@/lib/lead-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = leadSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the form and try again." }, { status: 400 });
  }

  // Silently accept bot submissions without writing anything.
  if (parsed.data.website) {
    return NextResponse.json({ ok: true });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json({ ok: true, demo: true });
    }
    return NextResponse.json({ error: "Lead capture is not configured." }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const lead = parsed.data;
  const { error } = await supabase.from("leads").insert({
    full_name: lead.fullName,
    email: lead.email,
    phone: lead.phone || null,
    street_address: lead.streetAddress,
    city: lead.city,
    state: lead.state,
    postal_code: lead.postalCode,
    estimated_value: lead.estimatedValue,
    timeline: lead.timeline,
    is_selling: true,
    is_buying: lead.isBuyingNextHome,
    property_specs: {
      property_type: lead.propertyType,
      bedrooms: lead.bedrooms,
      bathrooms: lead.bathrooms,
      square_feet: lead.squareFeet,
      year_built: lead.yearBuilt,
    },
    motivation: lead.motivation || null,
    urgency_score: lead.urgencyScore,
  });

  if (error) {
    console.error("Lead insert failed", { code: error.code, message: error.message });
    return NextResponse.json({ error: "We could not save your request. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
