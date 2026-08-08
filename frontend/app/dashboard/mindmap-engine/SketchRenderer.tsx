import React from "react";
import { PlannedLayout, CardTheme } from "./types";
import { wrapLines } from "./BoxSizer";
import { ICON_DEFINITIONS } from "./IconSelector";

interface SketchRendererProps {
  svgRef: React.RefObject<SVGSVGElement | null>;
  layout: PlannedLayout;
  title: string;
  isExpanded?: boolean;
}

// Formats bullet text to intelligently highlight numbers, math expressions, and keywords
const renderFormattedSpans = (
  text: string,
  baseX: number,
  accentColor: string
): React.ReactNode => {
  // Regex to detect numbers, fractions (13/25), time spans (15-min), math vars, or uppercase terms
  const tokenRegex = /(\b\d+(?:[\/.:-]\d+)*\b|\b\d+(?:-[a-zA-Z]+)?\b|[A-Za-z]\s*=\s*[^,;]+|\b[A-Z]{2,}\b)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, pIdx) => {
    if (!part) return null;
    const isHighlight = tokenRegex.test(part);
    tokenRegex.lastIndex = 0; // reset state

    return (
      <tspan
        key={pIdx}
        style={{
          fontWeight: isHighlight ? 700 : 500,
          fill: isHighlight ? "#0f172a" : "#334155",
        }}
      >
        {part}
      </tspan>
    );
  });
};

export const SketchRenderer: React.FC<SketchRendererProps> = ({
  svgRef,
  layout,
  title,
}) => {
  const {
    canvasWidth,
    canvasHeight,
    viewBox,
    structureType,
    centralHub,
    nodes,
    connectors,
    takeaways,
    compareLabels,
    timelineAxis,
  } = layout;

  const [vbX, vbY, vbW, vbH] = viewBox.split(" ").map(Number);
  const hasTakeaways = Boolean(takeaways && takeaways.length > 0);
  const takeawayY = vbY + vbH - 85;
  const takeawayWidth = Math.max(300, vbW - 70);
  const takeawayX = vbX + 35;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <svg
        ref={svgRef}
        viewBox={viewBox}
        style={{
          width: "100%",
          height: "auto",
          background: "#faf9f5",
          borderRadius: "14px",
          display: "block",
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
        }}
        role="img"
        aria-label={`${title} mind map (${structureType} layout)`}
      >
        <defs>
          {/* Dot Grid Background Pattern */}
          <pattern id="dotGrid" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="11" cy="11" r="1.1" fill="#94a3b8" opacity="0.22" />
          </pattern>

          {/* Premium Card Elevation Shadow */}
          <filter id="cardShadow" x="-10%" y="-10%" width="125%" height="125%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#0f172a" floodOpacity="0.05" />
            <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#0f172a" floodOpacity="0.04" />
          </filter>

          {/* Central Hub Glow Shadow */}
          <filter id="hubShadow" x="-15%" y="-15%" width="130%" height="130%">
            <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#2563eb" floodOpacity="0.12" />
            <feDropShadow dx="0" dy="12" stdDeviation="20" floodColor="#0f172a" floodOpacity="0.06" />
          </filter>

          {/* Frosted Badge Shadow */}
          <filter id="badgeShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#0f172a" floodOpacity="0.06" />
          </filter>

          {/* Ribbon Shadow */}
          <filter id="ribbonShadow" x="-4%" y="-8%" width="108%" height="125%">
            <feDropShadow dx="0" dy="3" stdDeviation="6" floodColor="#0f172a" floodOpacity="0.05" />
          </filter>

          {/* Connector Gradients */}
          {nodes.map((node) => (
            <linearGradient
              key={`grad-${node.id}`}
              id={`conn-grad-${node.id}`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.9" />
              <stop offset="100%" stopColor={node.theme.accent} stopOpacity="1" />
            </linearGradient>
          ))}

          {/* Arrowhead Markers */}
          <marker
            id="arrowhead-generic"
            viewBox="0 0 10 10"
            refX="7"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#0d9488" />
          </marker>
        </defs>

        <style>{`
          .hubTitleText { font: 800 24px var(--font-kalam), "Comic Sans MS", cursive; fill: #0f172a; }
          .hubThesisText { font: 500 12px system-ui, -apple-system, sans-serif; fill: #475569; }
          .cardTitleText { font: 700 15px var(--font-kalam), "Comic Sans MS", cursive; fill: #0f172a; letter-spacing: 0.1px; }
          .cardCueText { font: 700 10px system-ui, -apple-system, sans-serif; text-transform: uppercase; letter-spacing: 0.8px; }
          .cardBulletText { font: 500 12.5px system-ui, -apple-system, sans-serif; fill: #334155; line-height: 1.45; }
          .formulaPillText { font: 600 11px "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace; fill: #475569; }
          .compareHeaderTitle { font: 800 18px var(--font-kalam), "Comic Sans MS", cursive; fill: #0f172a; }
          .takeawayTitle { font: 700 12px system-ui, -apple-system, sans-serif; fill: #92400e; text-transform: uppercase; letter-spacing: 0.7px; }
          .takeawayBullet { font: 500 12px system-ui, -apple-system, sans-serif; fill: #334155; }
          .watermarkText { font: 700 10px system-ui, -apple-system, sans-serif; fill: #94a3b8; text-transform: uppercase; letter-spacing: 0.9px; }
        `}</style>

        {/* Paper Background with Dot Grid */}
        <rect x={vbX} y={vbY} width={vbW} height={vbH} fill="#faf9f5" rx="14" />
        <rect x={vbX} y={vbY} width={vbW} height={vbH} fill="url(#dotGrid)" rx="14" />

        {/* Top Watermark Tag */}
        <g transform={`translate(${vbX + 24}, ${vbY + 22})`}>
          <rect width="170" height="22" rx="11" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" filter="url(#badgeShadow)" />
          <circle cx="12" cy="11" r="3.5" fill="#3b82f6" />
          <text x="22" y="14.5" className="watermarkText">
            NoteJam • Revision Map
          </text>
        </g>

        {/* Timeline Axis line (if timeline archetype) */}
        {timelineAxis && (
          <g>
            <line
              x1={timelineAxis.startX}
              y1={timelineAxis.y}
              x2={timelineAxis.endX}
              y2={timelineAxis.y}
              stroke="#cbd5e1"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <circle cx={timelineAxis.startX} cy={timelineAxis.y} r="6" fill="#3b82f6" stroke="#ffffff" strokeWidth="2" />
            <circle cx={timelineAxis.endX} cy={timelineAxis.y} r="6" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
          </g>
        )}

        {/* Comparison Header Badges (if comparison archetype) */}
        {structureType === "comparison" && compareLabels && (
          <g>
            <rect x={vbX + 50} y={vbY + 45} width="260" height="42" rx="8" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="1.2" />
            <text x={vbX + 180} y={vbY + 71} className="compareHeaderTitle" textAnchor="middle" fill="#1e40af">
              {compareLabels.A}
            </text>

            <rect x={vbX + 370} y={vbY + 45} width="260" height="42" rx="8" fill="#f5f3ff" stroke="#ddd6fe" strokeWidth="1.2" />
            <text x={vbX + 500} y={vbY + 71} className="compareHeaderTitle" textAnchor="middle" fill="#5b21b6">
              {compareLabels.B}
            </text>
          </g>
        )}

        {/* Connectors & Flow Branches */}
        {connectors.map((conn) => {
          if (conn.style === "divider") {
            return (
              <line
                key={conn.id}
                x1={conn.fromX}
                y1={conn.fromY}
                x2={conn.toX}
                y2={conn.toY}
                stroke={conn.color}
                strokeWidth={conn.strokeWidth}
                strokeDasharray="5 5"
              />
            );
          }

          if (conn.style === "axis") {
            return (
              <g key={conn.id}>
                <path d={conn.pathData} stroke={conn.color} strokeWidth={conn.strokeWidth} strokeDasharray="3 3" />
                <circle cx={conn.fromX} cy={conn.fromY} r="5" fill="#ffffff" stroke={conn.color} strokeWidth="2.5" />
              </g>
            );
          }

          const marker = conn.style === "chevron" ? "url(#arrowhead-generic)" : undefined;

          return (
            <g key={conn.id}>
              {/* Connector Path */}
              <path
                d={conn.pathData}
                fill="none"
                stroke={conn.color}
                strokeWidth={conn.strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                markerEnd={marker}
                opacity={0.88}
              />
              {/* Start Junction Node */}
              <circle cx={conn.fromX} cy={conn.fromY} r="4" fill="#ffffff" stroke={conn.color} strokeWidth="2.2" />
              {/* End Junction Node */}
              <circle cx={conn.toX} cy={conn.toY} r="3.5" fill={conn.color} />
            </g>
          );
        })}

        {/* Central Hub (if hub archetype) */}
        {centralHub && (
          <g filter="url(#hubShadow)">
            {/* Outer Subtle Orbit Ring */}
            <ellipse
              cx={centralHub.x}
              cy={centralHub.y}
              rx={centralHub.rx + 8}
              ry={centralHub.ry + 8}
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="1.5"
              strokeDasharray="8 6"
            />

            {/* Hub Body */}
            <ellipse
              cx={centralHub.x}
              cy={centralHub.y}
              rx={centralHub.rx}
              ry={centralHub.ry}
              fill="#ffffff"
              stroke="#0f172a"
              strokeWidth="2.2"
            />

            {/* Inner Accent Ring */}
            <ellipse
              cx={centralHub.x}
              cy={centralHub.y}
              rx={centralHub.rx - 5}
              ry={centralHub.ry - 5}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="1"
            />

            {/* Central Concept Title */}
            {(() => {
              const lines = wrapLines(centralHub.title, 17).slice(0, 2);
              const thesisLines = centralHub.thesis ? wrapLines(centralHub.thesis, 26).slice(0, 2) : [];
              const startY = centralHub.y - (lines.length + (thesisLines.length > 0 ? 1 : 0) - 1) * 13;

              return (
                <>
                  <text x={centralHub.x} y={startY} className="hubTitleText" textAnchor="middle">
                    {lines.map((l, i) => (
                      <tspan key={i} x={centralHub.x} dy={i === 0 ? 0 : 26}>
                        {l}
                      </tspan>
                    ))}
                  </text>
                  {thesisLines.length > 0 && (
                    <text
                      x={centralHub.x}
                      y={startY + lines.length * 24 + 4}
                      className="hubThesisText"
                      textAnchor="middle"
                    >
                      {thesisLines.map((tl, ti) => (
                        <tspan key={ti} x={centralHub.x} dy={ti === 0 ? 0 : 15}>
                          {tl}
                        </tspan>
                      ))}
                    </text>
                  )}
                </>
              );
            })()}
          </g>
        )}

        {/* Concept Cards (Nodes) */}
        {nodes.map((node) => {
          const { x, y, width: w, height: h, section, theme, timeMarker, stepNumber, anchoredFormulas } = node;
          const iconDef = ICON_DEFINITIONS[section.icon] || ICON_DEFINITIONS.book;

          const titleLines = wrapLines(section.title, Math.floor(w / 11.5)).slice(0, 2);

          // Top Header container coordinates
          const headerHeight = 36;
          const iconBadgeSize = 24;
          const iconBadgeX = x + 12;
          const iconBadgeY = y + 7;

          const cueX = iconBadgeX + iconBadgeSize + 8;
          const cueText = timeMarker || section.cue;
          const cueWidth = Math.min(130, cueText.length * 7.2 + 14);

          const titleStartY = y + headerHeight + 18;
          const dividerY = titleStartY + (titleLines.length - 1) * 18 + 8;
          let bulletY = dividerY + 16;

          return (
            <g key={node.id} filter="url(#cardShadow)">
              {/* Card Base Container */}
              <rect x={x} y={y} width={w} height={h} rx="10" fill={theme.bg} stroke={theme.border} strokeWidth="1.2" />

              {/* Header Tinted Background Strip */}
              <path
                d={`M ${x} ${y + 10} Q ${x} ${y} ${x + 10} ${y} H ${x + w - 10} Q ${x + w} ${y} ${x + w} ${y + 10} V ${y + headerHeight} H ${x} Z`}
                fill={theme.headerBg}
              />

              {/* Top Accent Color Bar */}
              <path
                d={`M ${x + 6} ${y + 1.5} H ${x + w - 6}`}
                stroke={theme.accent}
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Circular Frosted Icon Badge */}
              <circle
                cx={iconBadgeX + iconBadgeSize / 2}
                cy={iconBadgeY + iconBadgeSize / 2}
                r={iconBadgeSize / 2}
                fill={theme.badgeBg}
                stroke={theme.border}
                strokeWidth="1"
              />
              <g transform={`translate(${iconBadgeX + 4.5}, ${iconBadgeY + 4.5})`}>
                <svg width="15" height="15" viewBox={iconDef.viewBox} style={{ color: theme.accent }}>
                  {iconDef.paths.map((p, pIdx) => (
                    <path
                      key={pIdx}
                      d={p.d}
                      fill={p.fill || "none"}
                      stroke={p.stroke ? theme.accent : undefined}
                      strokeWidth={p.strokeWidth || 2}
                      strokeLinecap={p.strokeLinecap}
                      strokeLinejoin={p.strokeLinejoin}
                    />
                  ))}
                </svg>
              </g>

              {/* Cue Pill Tag */}
              <rect
                x={cueX}
                y={iconBadgeY + 2}
                width={cueWidth}
                height="19"
                rx="4.5"
                fill={theme.badgeBg}
                stroke={theme.border}
                strokeWidth="0.8"
              />
              <text
                x={cueX + cueWidth / 2}
                y={iconBadgeY + 14.5}
                className="cardCueText"
                textAnchor="middle"
                fill={theme.badgeText}
              >
                {cueText}
              </text>

              {/* Step indicator on top-right */}
              {stepNumber && (
                <text x={x + w - 12} y={iconBadgeY + 14} font-size="11px" font-weight="700" fill={theme.accent} textAnchor="end">
                  #{stepNumber}
                </text>
              )}

              {/* Card Title */}
              <text x={x + 14} y={titleStartY} className="cardTitleText" textAnchor="start">
                {titleLines.map((line, idx) => (
                  <tspan key={idx} x={x + 14} dy={idx === 0 ? 0 : 18}>
                    {line}
                  </tspan>
                ))}
              </text>

              {/* Divider Line */}
              <line x1={x + 14} y1={dividerY} x2={x + w - 14} y2={dividerY} stroke="#f1f5f9" strokeWidth="1" />

              {/* Bullets with Smart Highlighting */}
              {(section.bullets || []).slice(0, 3).map((bullet, bIdx) => {
                const lines = wrapLines(bullet, Math.floor((w - 36) / 7.2)).slice(0, 2);
                const currentY = bulletY;
                bulletY += lines.length * 16 + 5;

                return (
                  <g key={bIdx}>
                    {/* Bullet marker */}
                    <circle cx={x + 18} cy={currentY - 4} r="2.2" fill={theme.accent} />
                    <text x={x + 28} y={currentY} className="cardBulletText" textAnchor="start">
                      {lines.map((l, lIdx) => (
                        <tspan key={lIdx} x={x + 28} dy={lIdx === 0 ? 0 : 15.5}>
                          {renderFormattedSpans(l, x + 28, theme.accent)}
                        </tspan>
                      ))}
                    </text>
                  </g>
                );
              })}

              {/* Anchored Formula Inset (if present) */}
              {anchoredFormulas && anchoredFormulas.length > 0 && (
                <g transform={`translate(${x + 12}, ${y + h - 26})`}>
                  <rect
                    width={w - 24}
                    height="19"
                    rx="4"
                    fill="#f8fafc"
                    stroke="#e2e8f0"
                    strokeWidth="0.8"
                    strokeDasharray="2 2"
                  />
                  <text x={8} y="13.5" className="formulaPillText" textAnchor="start">
                    fx: {anchoredFormulas[0].label} ({anchoredFormulas[0].detail.slice(0, 22)})
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Exam Takeaways Hero Ribbon (if takeaways present) */}
        {hasTakeaways && (
          <g filter="url(#ribbonShadow)">
            <rect
              x={takeawayX}
              y={takeawayY}
              width={takeawayWidth}
              height="62"
              rx="10"
              fill="#ffffff"
              stroke="#fde68a"
              strokeWidth="1.2"
            />
            {/* Left amber highlight tab */}
            <path
              d={`M ${takeawayX + 3} ${takeawayY + 8} V ${takeawayY + 54}`}
              stroke="#f59e0b"
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/* Header label */}
            <g transform={`translate(${takeawayX + 16}, ${takeawayY + 18})`}>
              <rect width="124" height="24" rx="12" fill="#fef3c7" stroke="#fde68a" strokeWidth="0.8" />
              <text x="62" y="16" className="takeawayTitle" textAnchor="middle">
                ★ Exam Takeaways
              </text>
            </g>

            {/* Takeaways horizontal item chips */}
            {takeaways.slice(0, 3).map((t, idx) => {
              const availableWidth = takeawayWidth - 170;
              const itemWidth = availableWidth / Math.min(3, takeaways.length);
              const itemX = takeawayX + 160 + idx * itemWidth;

              return (
                <g key={idx}>
                  <circle cx={itemX} cy={takeawayY + 31} r="2.5" fill="#f59e0b" />
                  <text x={itemX + 8} y={takeawayY + 35} className="takeawayBullet" textAnchor="start">
                    {t.length > 50 ? `${t.slice(0, 48)}...` : t}
                  </text>
                </g>
              );
            })}
          </g>
        )}
      </svg>
    </div>
  );
};
