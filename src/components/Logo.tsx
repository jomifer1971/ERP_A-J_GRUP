/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export default function Logo({ className = "h-12", showText = true }: LogoProps) {
  // Brand colors matched precisely to a Slate Navy and Ice-Blue theme:
  const mainTeal = "#1e293b"; // Primary Slate Navy
  const arrowTeal = "#0284c7"; // Arrow Accent Ice-Blue
  const textColor = "#1e293b"; // "A&J" color (Slate Navy)
  const subtextColor = "#64748b"; // "BCN 2025" color (Grey-Slate)

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg 
        viewBox="0 0 450 250" 
        className="h-full w-auto"
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* === 1. ARCHITECTURAL COLUMNS (LEFT RETRO-PERSPECTIVE STRUCTURE) === */}
        {/* Leftmost Column (Smallest) */}
        <path 
          d="M30 155 L45 155 L45 130 L30 137 Z" 
          stroke={arrowTeal} 
          strokeWidth="3" 
          strokeLinejoin="round"
          fill="none"
        />
        {/* Second Column (Medium) */}
        <path 
          d="M48 150 L63 150 L63 108 L48 118 Z" 
          stroke={arrowTeal} 
          strokeWidth="3" 
          strokeLinejoin="round"
          fill="none"
        />
        {/* Third Column (Tallest) */}
        <path 
          d="M66 140 L81 140 L81 83 L66 95 Z" 
          stroke={arrowTeal} 
          strokeWidth="3" 
          strokeLinejoin="round"
          fill="none"
        />

        {/* === 2. THE STYLIZED "A" CHARACTER === */}
        {/* Main bold body of the 'A', using coordinates matching the slanted geometric letter */}
        <path 
          d="M102 46 L134 46 L181 173 L155 173 L142 133 L112 133 L98 173 L12 173 L58 159 Z" 
          fill={mainTeal} 
        />
        <path 
          d="M141 126 L127 82 L113 126 Z" 
          fill="#ffffff" 
        />
        {/* Cover overlapping leg with a pristine look */}
        <path 
          d="M105 46 Q134 44 140 100 L115 173 L90 173 Z" 
          fill={mainTeal} 
        />

        {/* === 3. SWEEPING ASCENDING ARROW === */}
        {/* Perfectly curved dynamic arrow representing growth/success/management metrics */}
        <path 
          d="M15 155 Q80 152 130 115 Q158 92 172 73 L159 66 L192 61 L187 93 L178 81 Q160 105 125 127 Q75 160 15 155 Z" 
          fill={arrowTeal} 
        />

        {/* === 4. BRAND TYPOGRAPHY (IF showText IS TRUE) === */}
        {showText && (
          <>
            {/* "A&J GRUP" */}
            <text 
              x="185" 
              y="126" 
              fontFamily="system-ui, -apple-system, sans-serif" 
              letterSpacing="-1"
              fontSize="48"
            >
              <tspan fill={textColor} fontWeight="900">A&amp;J </tspan>
              <tspan fill={arrowTeal} fontWeight="400">GRUP</tspan>
            </text>

            {/* "BCN 2025" */}
            <text 
              x="187" 
              y="173" 
              fontFamily="system-ui, -apple-system, sans-serif" 
              fontWeight="400" 
              fontSize="34" 
              fill={subtextColor}
              letterSpacing="3"
            >
              BCN 2025
            </text>

            {/* Subtle underline chevron matching real logo */}
            <path 
              d="M187 190 L220 190 L228 195 L215 195 Z" 
              fill={arrowTeal}
            />
          </>
        )}
      </svg>
    </div>
  );
}
