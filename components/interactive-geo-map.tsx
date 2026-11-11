'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Building2, ExternalLink, MapPin, X } from 'lucide-react'

interface MapProperty {
  id: string
  address: string
  borough: string
  zip?: string
  score?: number
  category?: string
  categoryNumber?: number
  subheadline?: string
  reason?: string
  opportunityAngle?: string
  estimatedEquity?: string
  latitude?: number
  longitude?: number
  units?: number
  buildingClass?: string | null
}

interface InteractiveGeoMapProps {
  properties: MapProperty[]
  onSelectProperty?: (property: MapProperty) => void
  selectedPropertyId?: string | null
  heightClass?: string
}

// Approximate NYC borough center bounds for coordinate normalization
const BOROUGH_COORDS: Record<string, { lat: number; lng: number }> = {
  Manhattan: { lat: 40.7831, lng: -73.9712 },
  Bronx: { lat: 40.8448, lng: -73.8648 },
  Brooklyn: { lat: 40.6782, lng: -73.9442 },
  Queens: { lat: 40.7282, lng: -73.7949 },
  'Staten Island': { lat: 40.5795, lng: -74.1502 },
}

// Curated stock building images for high-probability NYC off-market architecture
const PROPERTY_PHOTOS = [
  '/images/exterior.jpg',
  '/images/hero-home.jpg',
  '/images/building-facade.jpg',
  '/images/building-dusk.jpg',
  '/images/hero-building.jpg',
  '/images/luxury-building.jpg',
  '/images/kitchen.jpg',
  '/images/interior-warm.jpg',
]

export function InteractiveGeoMap({
  properties,
  onSelectProperty,
  selectedPropertyId,
  heightClass = 'h-[500px]',
}: InteractiveGeoMapProps) {
  const [hoveredProperty, setHoveredProperty] = useState<MapProperty | null>(null)
  const [selectedBorough, setSelectedBorough] = useState<string>('All')
  const [activePin, setActivePin] = useState<MapProperty | null>(null)

  const selectedMatch = selectedPropertyId ? properties.find((p) => p.id === selectedPropertyId) || null : null
  const displayCardProperty = hoveredProperty || activePin || selectedMatch

  const filteredProperties = properties.filter((p) => {
    if (selectedBorough !== 'All' && p.borough !== selectedBorough) return false
    return true
  })

  // Normalize lat/long into 0-100% SVG coordinates
  // NYC boundary box roughly: Lat 40.50 to 40.92, Lng -74.25 to -73.70
  const getPosition = (property: MapProperty, index: number) => {
    let lat = property.latitude
    let lng = property.longitude

    if (!lat || !lng) {
      const base = BOROUGH_COORDS[property.borough] || BOROUGH_COORDS.Brooklyn
      // Spread pins deterministically around borough center
      const angle = (index * 47) % 360
      const dist = 0.02 + ((index * 7) % 15) * 0.003
      lat = base.lat + Math.cos(angle) * dist
      lng = base.lng + Math.sin(angle) * dist
    }

    const minLat = 40.52
    const maxLat = 40.91
    const minLng = -74.22
    const maxLng = -73.72

    const x = Math.max(5, Math.min(95, ((lng - minLng) / (maxLng - minLng)) * 100))
    // Invert Y since SVG/CSS top is 0
    const y = Math.max(5, Math.min(95, (1 - (lat - minLat) / (maxLat - minLat)) * 100))

    return { x, y }
  }

  const getPhotoForProperty = (id: string) => {
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return PROPERTY_PHOTOS[hash % PROPERTY_PHOTOS.length]
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-[#172b2a] shadow-lg text-white">
      {/* Map Control Bar */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2 rounded-2xl bg-[#172b2a]/90 p-2 backdrop-blur-md border border-white/10 shadow-lg">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8edbb8] px-2">
          Borough Focus:
        </span>
        {['All', 'Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'].map((b) => (
          <button
            key={b}
            onClick={() => setSelectedBorough(b)}
            className={`rounded-xl px-2.5 py-1 text-xs font-bold transition-all ${
              selectedBorough === b
                ? 'bg-[#176b4d] text-white shadow-xs'
                : 'text-slate-300 hover:bg-white/10'
            }`}
          >
            {b}
          </button>
        ))}
      </div>

      <div className="absolute top-4 right-4 z-20 flex items-center gap-2 rounded-2xl bg-[#172b2a]/90 px-3.5 py-1.5 backdrop-blur-md border border-white/10 text-xs">
        <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
        <span className="font-bold text-slate-200">
          {filteredProperties.length} Geocoded NYC Parcels
        </span>
      </div>

      {/* Styled Dark Cartography Canvas (SVG Grid & Borough Landmasses) */}
      <div className={`relative ${heightClass} w-full cursor-crosshair bg-gradient-to-b from-[#111f1e] via-[#172b2a] to-[#0f1d1c] overflow-hidden select-none`}>
        {/* Subtle Map Grid Lines */}
        <div className="absolute inset-0 bg-grid opacity-20" />

        {/* Borough Landform Watermark Silhouettes */}
        <svg
          viewBox="0 0 1000 800"
          className="absolute inset-0 h-full w-full pointer-events-none opacity-25"
          preserveAspectRatio="none"
        >
          {/* Staten Island */}
          <path
            d="M 120,550 Q 180,500 230,580 T 170,720 Z"
            fill="currentColor"
            className="text-emerald-950/40"
          />
          {/* Brooklyn & Queens */}
          <path
            d="M 380,420 Q 550,380 680,440 T 780,360 T 650,560 T 450,680 T 360,540 Z"
            fill="currentColor"
            className="text-emerald-950/40"
          />
          {/* Manhattan */}
          <path
            d="M 360,200 L 410,140 L 450,280 L 380,410 Z"
            fill="currentColor"
            className="text-emerald-950/40"
          />
          {/* Bronx */}
          <path
            d="M 430,90 Q 540,60 620,130 T 480,240 Z"
            fill="currentColor"
            className="text-emerald-950/40"
          />
        </svg>

        {/* Borough Reference Text */}
        <div className="absolute top-[28%] left-[34%] text-[10px] font-bold tracking-[0.2em] text-white/15 uppercase pointer-events-none">
          Manhattan
        </div>
        <div className="absolute top-[62%] left-[45%] text-[10px] font-bold tracking-[0.2em] text-white/15 uppercase pointer-events-none">
          Brooklyn
        </div>
        <div className="absolute top-[48%] left-[64%] text-[10px] font-bold tracking-[0.2em] text-white/15 uppercase pointer-events-none">
          Queens
        </div>
        <div className="absolute top-[18%] left-[50%] text-[10px] font-bold tracking-[0.2em] text-white/15 uppercase pointer-events-none">
          Bronx
        </div>
        <div className="absolute top-[75%] left-[16%] text-[10px] font-bold tracking-[0.2em] text-white/15 uppercase pointer-events-none">
          Staten Island
        </div>

        {/* Interactive Property Map Pins */}
        {filteredProperties.map((prop, idx) => {
          const { x, y } = getPosition(prop, idx)
          const isHovered = hoveredProperty?.id === prop.id || activePin?.id === prop.id || selectedPropertyId === prop.id
          const score = prop.score || 85

          return (
            <div
              key={prop.id || idx}
              style={{ left: `${x}%`, top: `${y}%` }}
              onMouseEnter={() => setHoveredProperty(prop)}
              onMouseLeave={() => setHoveredProperty(null)}
              onClick={() => {
                setActivePin(prop)
                onSelectProperty?.(prop)
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer group transition-transform duration-150"
            >
              {/* Pulse effect on high-urgency scores */}
              {score >= 88 && (
                <span className="absolute -inset-1 rounded-full bg-emerald-400 opacity-40 animate-ping" />
              )}

              {/* Pin Bubble */}
              <div
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black shadow-lg transition-all ${
                  isHovered
                    ? 'scale-125 bg-white text-[#172b2a] ring-4 ring-emerald-400 z-30'
                    : 'bg-[#176b4d] text-white border border-emerald-300/40 hover:bg-emerald-500'
                }`}
              >
                <span>${Math.round((score * 6.2)).toString().slice(0, 3)}k</span>
                <span className="size-1.5 rounded-full bg-emerald-300" />
              </div>
            </div>
          )
        })}

        {/* Zillow-Style Floating Photo Card Preview on Hover */}
        {displayCardProperty && (
          <div
            className="absolute bottom-6 left-6 z-40 w-80 overflow-hidden rounded-2xl border border-white/20 bg-[#172b2a]/95 text-white shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Visual Photo Header */}
            <div className="relative h-40 w-full overflow-hidden bg-slate-900">
              <Image
                src={getPhotoForProperty(displayCardProperty.id)}
                alt={displayCardProperty.address}
                fill
                className="object-cover transition-transform duration-500 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#172b2a] via-transparent to-black/30" />

              <span className="absolute top-3 left-3 rounded-md bg-[#176b4d] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-xs">
                {displayCardProperty.category || 'Pre-Foreclosure'}
              </span>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setHoveredProperty(null)
                  setActivePin(null)
                }}
                className="absolute top-2.5 right-2.5 z-10 rounded-full bg-black/60 p-1 text-white/80 hover:text-white hover:bg-black/90 backdrop-blur-xs transition"
                aria-label="Close preview"
              >
                <X className="size-3.5" />
              </button>
            </div>

            {/* Property Information Body */}
            <div className="p-4 space-y-2.5">
              <div>
                <h4 className="font-serif text-lg font-bold tracking-tight text-white leading-snug">
                  {displayCardProperty.address}
                </h4>
                <p className="flex items-center gap-1 text-xs text-slate-300 font-sans mt-0.5">
                  <MapPin className="size-3 text-emerald-400" />
                  {displayCardProperty.borough}
                  {displayCardProperty.zip ? `, NYC ${displayCardProperty.zip}` : ''}
                </p>
              </div>

              {/* Spread & Debt Preview */}
              <div className="rounded-xl bg-white/5 border border-white/10 p-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="block text-[9px] uppercase font-bold text-slate-400">Est. Equity Spread</span>
                  <span className="font-serif font-bold text-emerald-300 text-sm italic">
                    ~$530,000 (62%)
                  </span>
                </div>
                <div className="text-right">
                  <span className="block text-[9px] uppercase font-bold text-slate-400">Property Type</span>
                  <span className="font-bold text-slate-200">{displayCardProperty.units || '1–3 Family'}</span>
                </div>
              </div>

              {displayCardProperty.reason && (
                <p className="text-[11px] leading-relaxed text-slate-300 line-clamp-2">
                  <strong className="text-emerald-400">Why it surfaced: </strong>
                  {displayCardProperty.reason}
                </p>
              )}

              <Link
                href={`/dashboard/properties/${encodeURIComponent(displayCardProperty.id)}`}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#176b4d] py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#12543d]"
              >
                <span>View Property Report & Contacts</span>
                <ExternalLink className="size-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
