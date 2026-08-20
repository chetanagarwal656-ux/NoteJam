import React from "react";
import { PlannedInfographicLayout } from "./types";
import { wrapLines } from "./BoxSizer";
import { ICON_DEFINITIONS } from "./IconSelector";

interface InfographicRendererProps {
  svgRef: React.RefObject<SVGSVGElement | null>;
  layout: PlannedInfographicLayout;
  title: string;
}

export const InfographicRenderer: React.FC<InfographicRendererProps> = ({
  svgRef,
  layout,
  title,
}) => {
  const { canvasWidth, canvasHeight, viewBox, centralDome, branches } = layout;
  const [vbX, vbY, vbW, vbH] = viewBox.split(" ").map(Number);

  // Wrap central dome title
  const domeTitleLines = wrapLines(centralDome.title, 14).slice(0, 2);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <svg
        ref={svgRef}
        viewBox={viewBox}
        style={{
          width: "100%",
          height: "auto",
          background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
          borderRadius: "16px",
          display: "block",
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
        }}
        role="img"
        aria-label={`${title} infographic mind map`}
      >
        <defs>
          {/* Deep 3D Dome Elevation Shadow */}
          <filter id="domeShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="16" stdDeviation="16" floodColor="#0f172a" floodOpacity="0.22" />
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#0f172a" floodOpacity="0.12" />
          </filter>

          {/* Floating Icon Disc Shadow */}
          <filter id="discShadow" x="-25%" y="-25%" width="150%" height="150%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#0f172a" floodOpacity="0.1" />
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#0f172a" floodOpacity="0.06" />
          </filter>

          {/* 3D Metallic Dome Radial Gradient */}
          <radialGradient id="metallicDome" cx="45%" cy="38%" r="62%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="35%" stopColor="#f1f5f9" />
            <stop offset="70%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#94a3b8" />
          </radialGradient>

          {/* Inner Bevel Gradient */}
          <radialGradient id="innerDome" cx="50%" cy="50%" r="50%">
            <stop offset="75%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f8fafc" />
          </radialGradient>
        </defs>

        <style>{`
          .domeTitle { font: 800 17.5px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; fill: #0f172a; letter-spacing: -0.2px; }
          .branchTitle { font: 800 16px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; letter-spacing: -0.1px; }
          .branchText { font: 500 13.8px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; fill: #334155; }
        `}</style>

        {/* Clean Canvas Background */}
        <rect x={vbX} y={vbY} width={vbW} height={vbH} fill="#ffffff" />

        {/* Perimeter Orbit Guide Arc */}
        <circle
          cx={centralDome.cx}
          cy={centralDome.cy}
          r={centralDome.r + 14}
          fill="none"
          stroke="#cbd5e1"
          strokeWidth="1.5"
          strokeDasharray="6 6"
          opacity="0.6"
        />

        {/* Stepped Conduit Lines */}
        {branches.map((b) => (
          <path
            key={`conduit-${b.id}`}
            d={b.conduitPath}
            fill="none"
            stroke={b.color}
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {/* 3D Central Metallic Dome Hub */}
        <g filter="url(#domeShadow)">
          {/* Outer Bevel Ring */}
          <circle
            cx={centralDome.cx}
            cy={centralDome.cy}
            r={centralDome.r}
            fill="url(#metallicDome)"
            stroke="#94a3b8"
            strokeWidth="1.2"
          />

          {/* Inner Highlight Layer */}
          <circle
            cx={centralDome.cx}
            cy={centralDome.cy}
            r={centralDome.r - 16}
            fill="url(#innerDome)"
            stroke="#e2e8f0"
            strokeWidth="1"
          />

          {/* Central Dome Text */}
          <text
            x={centralDome.cx}
            y={centralDome.cy - (domeTitleLines.length - 1) * 11}
            className="domeTitle"
            textAnchor="middle"
          >
            {domeTitleLines.map((line, idx) => (
              <tspan key={idx} x={centralDome.cx} dy={idx === 0 ? 0 : 22}>
                {line}
              </tspan>
            ))}
          </text>
        </g>

        {/* Hub Circumference Terminal Pins */}
        {branches.map((b) => (
          <g key={`terminal-${b.id}`}>
            <circle
              cx={b.terminal.x}
              cy={b.terminal.y}
              r="6.5"
              fill={b.terminal.color}
              stroke="#ffffff"
              strokeWidth="2"
            />
            <circle cx={b.terminal.x - 1} cy={b.terminal.y - 1} r="1.5" fill="#ffffff" opacity="0.8" />
          </g>
        ))}

        {/* Floating Circular Icon Discs & Direct Typography */}
        {branches.map((b) => {
          const iconDef = ICON_DEFINITIONS[b.section.icon] || ICON_DEFINITIONS.bulb;
          const iconSize = 20;

          return (
            <g key={`branch-item-${b.id}`}>
              {/* Floating Circular Icon Disc */}
              <g filter="url(#discShadow)">
                <circle
                  cx={b.discCenter.x}
                  cy={b.discCenter.y}
                  r={b.discRadius}
                  fill="#ffffff"
                  stroke="#f1f5f9"
                  strokeWidth="1.5"
                />
                {/* Silhouette SVG Icon */}
                <g
                  transform={`translate(${b.discCenter.x - iconSize / 2}, ${
                    b.discCenter.y - iconSize / 2
                  })`}
                >
                  <svg
                    width={iconSize}
                    height={iconSize}
                    viewBox={iconDef.viewBox}
                    style={{ color: b.color }}
                  >
                    {iconDef.paths.map((p, pIdx) => (
                      <path
                        key={pIdx}
                        d={p.d}
                        fill={p.fill || "none"}
                        stroke={p.stroke ? b.color : undefined}
                        strokeWidth={p.strokeWidth || 2}
                        strokeLinecap={p.strokeLinecap}
                        strokeLinejoin={p.strokeLinejoin}
                      />
                    ))}
                  </svg>
                </g>
              </g>

              {/* Direct Heading (styled in branch accent color) */}
              <text
                x={b.titlePos.x}
                y={b.titlePos.y}
                className="branchTitle"
                fill={b.color}
                textAnchor={b.textAnchor}
              >
                {b.section.title}
              </text>

              {/* Direct Subtext Lines (clean readable slate) */}
              <text
                x={b.textStartPos.x}
                y={b.textStartPos.y}
                className="branchText"
                textAnchor={b.textAnchor}
              >
                {b.textLines.map((line, lIdx) => (
                  <tspan
                    key={lIdx}
                    x={b.textStartPos.x}
                    dy={lIdx === 0 ? 0 : 19}
                  >
                    {line}
                  </tspan>
                ))}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
