"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Home,
  Layers3,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { AddressLookup } from "@/components/address-lookup";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, estimateHomeValue } from "@/lib/home-value";
import { leadSubmissionSchema, type Timeline } from "@/lib/lead-schema";

const steps = ["Property", "Next move", "Timing", "Contact"];
const timelineOptions: { value: Timeline; label: string; helper: string }[] = [
  { value: "asap", label: "As soon as possible", helper: "Ready to make a move now" },
  { value: "30_days", label: "Within 30 days", helper: "A near-term decision" },
  { value: "60_days", label: "Within 60 days", helper: "Planning the next step" },
  { value: "90_days", label: "Within 90 days", helper: "Early, high-intent planning" },
  { value: "6_months_plus", label: "6+ months away", helper: "Building the plan" },
  { value: "exploring", label: "Just exploring", helper: "Learning what comes next" },
];
const urgencyOptions = [
  { value: "exploring", label: "Exploring", score: 20 },
  { value: "planning", label: "Planning", score: 45 },
  { value: "ready", label: "Ready to act", score: 70 },
  { value: "urgent", label: "Urgent", score: 88 },
  { value: "immediate", label: "Immediate", score: 100 },
] as const;
type Urgency = (typeof urgencyOptions)[number]["value"];

type FormState = {
  addressQuery: string;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  propertyType: string;
  bedrooms: string;
  bathrooms: string;
  squareFeet: string;
  yearBuilt: string;
  isBuyingNextHome: boolean | null;
  timeline: Timeline | "";
  motivation: string;
  urgency: Urgency;
  fullName: string;
  email: string;
  phone: string;
  consent: boolean;
  website: string;
};

const initialForm: FormState = {
  addressQuery: "",
  streetAddress: "",
  city: "",
  state: "",
  postalCode: "",
  propertyType: "single_family",
  bedrooms: "3",
  bathrooms: "2",
  squareFeet: "",
  yearBuilt: "",
  isBuyingNextHome: null,
  timeline: "",
  motivation: "",
  urgency: "planning",
  fullName: "",
  email: "",
  phone: "",
  consent: false,
  website: "",
};

type FormErrors = Record<string, string>;

export function LeadCaptureForm() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [demoSubmission, setDemoSubmission] = useState(false);

  const estimate = useMemo(
    () =>
      estimateHomeValue({
        state: form.state,
        city: form.city,
        squareFeet: form.squareFeet ? Number(form.squareFeet) : null,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
        propertyType: form.propertyType,
      }),
    [form.bathrooms, form.bedrooms, form.city, form.propertyType, form.squareFeet, form.state],
  );

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[field as string];
      return next;
    });
  }

  function validateStep(step: number): FormErrors {
    const next: FormErrors = {};
    if (step === 0) {
      if (!form.streetAddress.trim()) next.streetAddress = "Enter your street address.";
      if (!form.city.trim()) next.city = "Enter your city.";
      if (!form.state.trim()) next.state = "Enter your state.";
      if (!form.postalCode.trim()) next.postalCode = "Enter your ZIP code.";
      if (!form.squareFeet || Number(form.squareFeet) < 300) next.squareFeet = "Add an approximate square footage.";
    }
    if (step === 1 && form.isBuyingNextHome === null) {
      next.isBuyingNextHome = "Choose one option to continue.";
    }
    if (step === 2) {
      if (!form.timeline) next.timeline = "Choose the timeline that fits best.";
      if (!form.motivation.trim()) next.motivation = "Tell us a little about your motivation.";
    }
    if (step === 3) {
      if (form.fullName.trim().length < 2) next.fullName = "Enter your full name.";
      if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Enter a valid email address.";
      if (!form.consent) next.consent = "Consent is required before submitting.";
    }
    return next;
  }

  function scrollToForm() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goNext() {
    const nextErrors = validateStep(currentStep);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setCurrentStep((step) => Math.min(step + 1, steps.length - 1));
    scrollToForm();
  }

  function goBack() {
    setErrors({});
    setCurrentStep((step) => Math.max(step - 1, 0));
    scrollToForm();
  }


  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const allErrors = {
      ...validateStep(0),
      ...validateStep(1),
      ...validateStep(2),
      ...validateStep(3),
    };
    setErrors(allErrors);
    if (Object.keys(allErrors).length > 0 || !form.timeline) return;

    setIsSubmitting(true);
    setSubmitError("");
    const urgencyScore = urgencyOptions.find((option) => option.value === form.urgency)?.score ?? 45;
    const parsed = leadSubmissionSchema.safeParse({
      fullName: form.fullName,
      email: form.email,
      phone: form.phone,
      streetAddress: form.streetAddress,
      city: form.city,
      state: form.state,
      postalCode: form.postalCode,
      propertyType: form.propertyType,
      bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
      bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
      squareFeet: form.squareFeet ? Number(form.squareFeet) : null,
      yearBuilt: form.yearBuilt ? Number(form.yearBuilt) : null,
      estimatedValue: estimate,
      isBuyingNextHome: form.isBuyingNextHome === true,
      timeline: form.timeline,
      motivation: form.motivation,
      urgencyScore,
      consent: form.consent,
      website: form.website,
    });

    if (!parsed.success) {
      setErrors({ form: "Please check the highlighted fields and try again." });
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = (await response.json()) as { error?: string; demo?: boolean };
      if (!response.ok) throw new Error(data.error ?? "Unable to submit your request.");
      setDemoSubmission(Boolean(data.demo));
      setSubmitted(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to submit your request.");
    } finally {
      setIsSubmitting(false);
    }
  }


  function renderPropertyStep() {
    return (
      <div className="space-y-7">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-accent">Step 1 of 4</p>
          <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Start with the home you know best.</h2>
          <p className="mt-2 leading-7 text-muted-foreground">We use these details to create a useful first estimate. Exact valuation comes later with a local agent.</p>
        </div>
        <AddressLookup
          value={form.addressQuery}
          onChange={(value) => updateField("addressQuery", value)}
          onSelect={(suggestion) => {
            updateField("addressQuery", suggestion.streetAddress);
            updateField("streetAddress", suggestion.streetAddress);
            if (suggestion.city) updateField("city", suggestion.city);
            if (suggestion.state) updateField("state", suggestion.state);
            if (suggestion.postalCode) updateField("postalCode", suggestion.postalCode);
          }}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Street address" htmlFor="street-address" error={errors.streetAddress}>
            <Input id="street-address" value={form.streetAddress} onChange={(event) => { updateField("streetAddress", event.target.value); updateField("addressQuery", event.target.value); }} placeholder="123 Main Street" aria-invalid={Boolean(errors.streetAddress)} />
          </FormField>
          <FormField label="City" htmlFor="city" error={errors.city}>
            <Input id="city" value={form.city} onChange={(event) => updateField("city", event.target.value)} placeholder="Austin" aria-invalid={Boolean(errors.city)} />
          </FormField>
          <FormField label="State" htmlFor="state" error={errors.state}>
            <Input id="state" value={form.state} onChange={(event) => updateField("state", event.target.value)} placeholder="TX" aria-invalid={Boolean(errors.state)} />
          </FormField>
          <FormField label="ZIP code" htmlFor="postal-code" error={errors.postalCode}>
            <Input id="postal-code" value={form.postalCode} onChange={(event) => updateField("postalCode", event.target.value)} placeholder="78704" aria-invalid={Boolean(errors.postalCode)} />
          </FormField>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Property type" htmlFor="property-type">
            <select id="property-type" value={form.propertyType} onChange={(event) => updateField("propertyType", event.target.value)} className="flex h-11 w-full rounded-xl border border-input bg-background/80 px-3.5 text-sm text-foreground shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15">
              <option value="single_family">Single-family home</option>
              <option value="condo">Condo</option>
              <option value="townhome">Townhome</option>
              <option value="multi_family">Multi-family</option>
              <option value="land">Land</option>
            </select>
          </FormField>
          <FormField label="Approximate square feet" htmlFor="square-feet" hint="Required" error={errors.squareFeet}>
            <Input id="square-feet" type="number" min="300" inputMode="numeric" value={form.squareFeet} onChange={(event) => updateField("squareFeet", event.target.value)} placeholder="1,800" aria-invalid={Boolean(errors.squareFeet)} />
          </FormField>
          <FormField label="Bedrooms" htmlFor="bedrooms">
            <Input id="bedrooms" type="number" min="0" inputMode="numeric" value={form.bedrooms} onChange={(event) => updateField("bedrooms", event.target.value)} />
          </FormField>
          <FormField label="Bathrooms" htmlFor="bathrooms">
            <Input id="bathrooms" type="number" min="0" step="0.5" inputMode="decimal" value={form.bathrooms} onChange={(event) => updateField("bathrooms", event.target.value)} />
          </FormField>
          <FormField label="Year built" htmlFor="year-built" hint="Optional">
            <Input id="year-built" type="number" min="1800" max="2100" inputMode="numeric" value={form.yearBuilt} onChange={(event) => updateField("yearBuilt", event.target.value)} placeholder="1998" />
          </FormField>
        </div>
        <div className="rounded-2xl border border-accent/20 bg-accent/5 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-accent">Preliminary home value</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">A directional estimate based on your location and home details.</p>
            </div>
            <p className="font-display text-3xl font-extrabold tracking-tight text-slate-950">{formatCurrency(estimate)}</p>
          </div>
          {!estimate ? <p className="mt-3 text-xs font-medium text-muted-foreground">Add square footage to unlock the estimate.</p> : null}
        </div>
      </div>
    );
  }


  function renderNextMoveStep() {
    return (
      <div className="space-y-7">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-accent">Step 2 of 4</p>
          <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Are you buying your next home too?</h2>
          <p className="mt-2 leading-7 text-muted-foreground">This is the signal that helps us find agents equipped for the whole move.</p>
        </div>
        <RadioGroup
          value={form.isBuyingNextHome === null ? "" : form.isBuyingNextHome ? "yes" : "no"}
          onValueChange={(value) => updateField("isBuyingNextHome", value === "yes")}
          className="gap-4"
        >
          <label htmlFor="dual-yes" className="flex cursor-pointer items-start gap-4 rounded-2xl border border-border bg-white/70 p-5 transition-all hover:border-primary/40 hover:bg-primary/5 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
            <RadioGroupItem value="yes" id="dual-yes" className="mt-0.5" />
            <span>
              <span className="block font-display text-lg font-extrabold">Yes, I am selling and buying</span>
              <span className="mt-1 block text-sm leading-6 text-muted-foreground">I am looking for a smooth transition from my current home to the next one.</span>
              <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-primary"><Sparkles className="size-3.5" /> Highest-intent profile</span>
            </span>
          </label>
          <label htmlFor="dual-no" className="flex cursor-pointer items-start gap-4 rounded-2xl border border-border bg-white/70 p-5 transition-all hover:border-primary/40 hover:bg-primary/5 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
            <RadioGroupItem value="no" id="dual-no" className="mt-0.5" />
            <span>
              <span className="block font-display text-lg font-extrabold">No, I am selling for now</span>
              <span className="mt-1 block text-sm leading-6 text-muted-foreground">I am focused on understanding my home’s value and next step.</span>
            </span>
          </label>
        </RadioGroup>
        {errors.isBuyingNextHome ? <p className="text-xs font-medium text-destructive">{errors.isBuyingNextHome}</p> : null}
        <div className="rounded-2xl border border-primary/15 bg-primary/5 p-5 text-sm leading-6 text-primary">
          <strong>Why we ask:</strong> dual-transaction homeowners often need an agent who can coordinate timing, financing, and both moves.
        </div>
      </div>
    );
  }

  function renderTimingStep() {
    return (
      <div className="space-y-7">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-accent">Step 3 of 4</p>
          <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">What does your move timeline look like?</h2>
          <p className="mt-2 leading-7 text-muted-foreground">A little context helps us route your request to the right level of support.</p>
        </div>
        <div className="space-y-3">
          <Label>When would you like to move?</Label>
          <RadioGroup value={form.timeline} onValueChange={(value) => updateField("timeline", value as Timeline)} className="grid gap-3 sm:grid-cols-2">
            {timelineOptions.map((option) => (
              <label key={option.value} htmlFor={`timeline-${option.value}`} className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-white/70 p-4 transition-colors hover:border-primary/40 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
                <RadioGroupItem value={option.value} id={`timeline-${option.value}`} className="mt-0.5" />
                <span>
                  <span className="block text-sm font-bold">{option.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">{option.helper}</span>
                </span>
              </label>
            ))}
          </RadioGroup>
          {errors.timeline ? <p className="text-xs font-medium text-destructive">{errors.timeline}</p> : null}
        </div>
        <FormField label="What is motivating your move?" htmlFor="motivation" hint="A sentence or two is perfect" error={errors.motivation}>
          <Textarea id="motivation" value={form.motivation} onChange={(event) => updateField("motivation", event.target.value)} placeholder="For example: We want more space and need to be settled before the school year starts." aria-invalid={Boolean(errors.motivation)} />
        </FormField>
        <div className="space-y-3">
          <Label>How urgent does this feel?</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5" role="radiogroup" aria-label="Urgency">
            {urgencyOptions.map((option) => (
              <button key={option.value} type="button" role="radio" aria-checked={form.urgency === option.value} onClick={() => updateField("urgency", option.value)} className={`rounded-xl border px-3 py-3 text-sm font-bold transition-all ${form.urgency === option.value ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20" : "border-border bg-white/70 text-foreground hover:border-primary/40"}`}>
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }


  function renderContactStep() {
    return (
      <div className="space-y-7">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-accent">Step 4 of 4</p>
          <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Where should the right agent reach you?</h2>
          <p className="mt-2 leading-7 text-muted-foreground">Your contact information is private. Agents only receive it after a lead is unlocked through the marketplace.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Full name" htmlFor="full-name" error={errors.fullName}>
            <Input id="full-name" value={form.fullName} onChange={(event) => updateField("fullName", event.target.value)} placeholder="Jordan Mitchell" autoComplete="name" aria-invalid={Boolean(errors.fullName)} />
          </FormField>
          <FormField label="Email address" htmlFor="email" error={errors.email}>
            <Input id="email" type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} placeholder="jordan@example.com" autoComplete="email" aria-invalid={Boolean(errors.email)} />
          </FormField>
          <FormField label="Phone number" htmlFor="phone" hint="Optional">
            <Input id="phone" type="tel" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} placeholder="(512) 555-0148" autoComplete="tel" />
          </FormField>
        </div>
        <div className="hidden" aria-hidden="true">
          <Label htmlFor="website">Website</Label>
          <Input id="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => updateField("website", event.target.value)} />
        </div>
        <div className="rounded-2xl border border-border bg-muted/40 p-5">
          <label className="flex cursor-pointer items-start gap-3">
            <Checkbox checked={form.consent} onCheckedChange={(checked) => updateField("consent", checked === true)} className="mt-0.5" />
            <span className="text-sm leading-6 text-muted-foreground">I agree to be contacted by a real estate professional about my home and next-home plans. I understand I can opt out at any time.</span>
          </label>
          {errors.consent ? <p className="mt-2 pl-8 text-xs font-medium text-destructive">{errors.consent}</p> : null}
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-accent/20 bg-accent/5 p-4 text-sm leading-6 text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-accent" />
          <span><strong className="text-foreground">Your privacy matters.</strong> Your full name, email, phone, and exact address will not be shown in public marketplace views.</span>
        </div>
      </div>
    );
  }

  function renderSuccess() {
    return (
      <Card className="mx-auto max-w-2xl border-primary/20 bg-white/90 text-center shadow-glow">
        <CardContent className="p-8 sm:p-12">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-accent/12 text-accent">
            <CheckCircle2 className="size-9" />
          </div>
          <h2 className="mt-7 font-display text-3xl font-extrabold tracking-tight">Your next move is in motion.</h2>
          <p className="mx-auto mt-4 max-w-md leading-7 text-muted-foreground">Thanks for sharing the details of your home and timeline. If your profile is a fit, a local real estate professional can follow up with relevant next steps.</p>
          {demoSubmission ? (
            <div className="mx-auto mt-6 max-w-md rounded-xl border border-amber-300/50 bg-amber-50 p-4 text-left text-sm leading-6 text-amber-900">
              <strong>Preview mode:</strong> Supabase environment variables are not configured, so this submission was not written to the database. Add them to `.env.local` to enable persistence.
            </div>
          ) : null}
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/">Return to LeadFlow NYC</Link>
            </Button>
            <Button variant="outline" onClick={() => { setSubmitted(false); setCurrentStep(0); setForm(initialForm); }}>
              Start another check
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }


  if (submitted) return renderSuccess();

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-accent">Private home move check</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-[-0.035em] sm:text-4xl">Tell us what you’re planning.</h1>
          <p className="mt-3 max-w-xl leading-7 text-muted-foreground">A few thoughtful questions help us understand the full picture of your move.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
          <LockKeyhole className="size-4 text-accent" />
          Private by default
        </div>
      </div>
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          { icon: Home, label: "Property", value: form.streetAddress || "Add your address" },
          { icon: Layers3, label: "Move profile", value: form.isBuyingNextHome === null ? "Not chosen" : form.isBuyingNextHome ? "Sell + buy" : "Sell only" },
          { icon: Clock3, label: "Timeline", value: form.timeline ? timelineOptions.find((option) => option.value === form.timeline)?.label ?? "Set" : "Not set" },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-3 rounded-2xl border border-[#10243b]/10 bg-white px-4 py-3 shadow-soft">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#fff2ee] text-coral-500"><Icon className="size-4" /></div>
            <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8a98a4]">{label}</p><p className="mt-0.5 truncate text-sm font-black text-[#10243b]">{value}</p></div>
          </div>
        ))}
      </div>
      <Card className="overflow-hidden rounded-[1.75rem] border-[#10243b]/10 bg-white shadow-lift">
        <CardHeader className="border-b border-border/70 bg-muted/25 pb-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Your move profile</CardTitle>
              <CardDescription className="mt-1">Step {currentStep + 1} of {steps.length} · {steps[currentStep]}</CardDescription>
            </div>
            <span className="hidden text-xs font-bold text-muted-foreground sm:block">{Math.round(((currentStep + 1) / steps.length) * 100)}% complete</span>
          </div>
          <Progress value={((currentStep + 1) / steps.length) * 100} className="mt-5" />
          <div className="mt-4 grid grid-cols-4 gap-2">
            {steps.map((step, index) => (
              <div key={step} className="flex items-center gap-2">
                <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${index <= currentStep ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                  {index < currentStep ? <Check className="size-3.5" /> : index + 1}
                </span>
                <span className={`hidden text-xs font-bold sm:block ${index === currentStep ? "text-foreground" : "text-muted-foreground"}`}>{step}</span>
              </div>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} noValidate>
            {currentStep === 0 ? renderPropertyStep() : null}
            {currentStep === 1 ? renderNextMoveStep() : null}
            {currentStep === 2 ? renderTimingStep() : null}
            {currentStep === 3 ? renderContactStep() : null}
            {submitError ? <p role="alert" className="mt-6 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm font-medium text-destructive">{submitError}</p> : null}
            {errors.form ? <p role="alert" className="mt-6 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm font-medium text-destructive">{errors.form}</p> : null}
            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border/70 pt-6 sm:flex-row sm:items-center sm:justify-between">
              {currentStep > 0 ? (
                <Button type="button" variant="ghost" onClick={goBack} className="sm:mr-auto">
                  <ArrowLeft />
                  Back
                </Button>
              ) : <span className="hidden sm:block" />}
              {currentStep < steps.length - 1 ? (
                <Button type="button" onClick={goNext} className="group">
                  Continue
                  <ArrowRight className="transition-transform group-hover:translate-x-1" />
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting} className="group">
                  {isSubmitting ? <Loader2 className="animate-spin" /> : <Sparkles />}
                  {isSubmitting ? "Submitting securely…" : "Submit my move profile"}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
      <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">By submitting, you agree to be contacted about your real estate needs. We never sell your information.</p>
    </div>
  );
}
