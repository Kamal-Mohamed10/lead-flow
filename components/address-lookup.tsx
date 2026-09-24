"use client";

import { useEffect, useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AddressSuggestion } from "@/lib/address";
import { cn } from "@/lib/utils";

type AddressLookupProps = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: AddressSuggestion) => void;
};

export function AddressLookup({ value, onChange, onSelect }: AddressLookupProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    const query = value.trim();
    if (query.length < 3) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/address-search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const data = (await response.json()) as {
          suggestions?: AddressSuggestion[];
          demo?: boolean;
        };
        if (!response.ok) throw new Error("Address search failed");
        setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
        setIsDemo(Boolean(data.demo));
        setIsOpen(true);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setSuggestions([]);
          setIsOpen(false);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [value]);

  return (
    <div className="relative space-y-2">
      <Label htmlFor="address-search">Current property address</Label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="address-search"
          value={value}
          onChange={(event) => {
            const nextValue = event.target.value;
            onChange(nextValue);
            if (nextValue.trim().length < 3) {
              setSuggestions([]);
              setIsLoading(false);
              setIsOpen(false);
            } else {
              setIsOpen(true);
            }
          }}
          onFocus={() => value.trim().length >= 3 && setIsOpen(true)}
          placeholder="Start typing your address"
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen && suggestions.length > 0}
          aria-controls="address-suggestions"
          className="pl-10 pr-11"
        />
        {isLoading ? (
          <Loader2 className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-primary" />
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        {isDemo ? "Demo search is active. Add the city, state, and ZIP below." : "Use the autocomplete to avoid address typos."}
      </p>
      {isOpen && suggestions.length > 0 ? (
        <div id="address-suggestions" role="listbox" className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-border bg-popover p-1.5 shadow-xl">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              role="option"
              aria-selected="false"
              className={cn(
                "flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-accent",
                "focus:bg-accent focus:outline-none",
              )}
              onClick={() => {
                onSelect(suggestion);
                setIsOpen(false);
              }}
            >
              <MapPin className="mt-0.5 size-4 shrink-0 text-accent" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-foreground">{suggestion.streetAddress}</span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">{suggestion.label}</span>
              </span>
              {suggestion.demo ? <span className="ml-auto shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">DEMO</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
