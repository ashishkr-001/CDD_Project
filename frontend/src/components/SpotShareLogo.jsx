import React from 'react'

/**
 * SpotShareCorporateLogo
 * High-end, bright, modern corporate mobility mark:
 * - Luminous sapphire (Parking) & vibrant emerald (EV) squircle
 * - Aerodynamic interlocking 'S' mobility flow in brilliant white
 * - Precision focal spot & destination power nodes
 */
export default function SpotShareLogo({ size = 36, category = 'parking', className = '' }) {
  const bgGradId = `spotshare-bg-grad-${size}`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`spotshare-logo-svg ${className}`}
      aria-label="SpotShare Logo"
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        filter: 'drop-shadow(0 3px 8px rgba(37, 99, 235, 0.25))',
      }}
    >
      <defs>
        <linearGradient id={bgGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>

      {/* Radiant Corporate Brand Base */}
      <rect width="40" height="40" rx="10" fill={`url(#${bgGradId})`} />

      {/* Subtle Specular Top Highlight Rim */}
      <rect
        x="0.75"
        y="0.75"
        width="38.5"
        height="38.5"
        rx="9.25"
        stroke="rgba(255, 255, 255, 0.4)"
        strokeWidth="1.5"
      />

      {/* Aerodynamic Dual-Loop 'S' Mobility Ribbon in Pure White */}
      <path
        d="M26.5 12C26.5 8.5 23 6.5 19.5 6.5C15.5 6.5 13 9.2 13 12.8C13 16.2 15.8 17.6 20 18.6C24.2 19.6 27 21.4 27 25.2C27 29.2 24 32 19.8 32C16 32 13 29.5 13 26"
        stroke="#FFFFFF"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Precision Destination & Spot Nodes */}
      <circle cx="19.8" cy="12.2" r="2.2" fill="#FFFFFF" />
      <circle cx="20.2" cy="25.8" r="2.2" fill="#FFFFFF" />
    </svg>
  )
}


