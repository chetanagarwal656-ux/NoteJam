import React from "react";
import { PositionedCard } from "./types";
import { wrapLines } from "./BoxSizer";
import { createLoopingArrow } from "./ArrowRouter";

interface SketchRendererProps {
  svgRef: React.RefObject<SVGSVGElement | null>;
  title: string;
  centralConcept: string;
  centralList: string[];
  cards: PositionedCard[];
  isExpanded?: boolean;
}

export const SketchRenderer: React.FC<SketchRendererProps> = ({
  svgRef,
  title,
  centralConcept,
  cards,
}) => {
  const centerCX = 800;
  const centerCY = 500;
  const centerRX = 170;
  const centerRY = 140;

  const renderText = (
    lines: string[],
    x: number,
    y: number,
    lineHeight: number,
    className: string,
    anchor: "start" | "middle" | "end" = "start"
  ) => (
    <text x={x} y={y} className={className} textAnchor={anchor}>
      {lines.map((line, idx) => (
        <tspan key={idx} x={x} dy={idx === 0 ? 0 : lineHeight}>{line}</tspan>
      ))}
    </text>
  );

  const centralTitleLines = wrapLines((centralConcept || title || "Mind Map").toUpperCase(), 16);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <svg ref={svgRef} viewBox="0 0 1600 1000" style={{ width: "100%", height: "auto", background: "#f8fafc" }} role="img" aria-label={`${title} mind map`}>
        <defs>
          {/* Soft elevation shadow for sticky notes */}
          <filter id="stickyShadow" x="-10%" y="-10%" width="130%" height="130%">
            <feDropShadow dx="3" dy="5" stdDeviation="4" floodColor="#0f172a" floodOpacity="0.12" />
          </filter>
          {/* Drop shadow for central sketched circle */}
          <filter id="circleShadow" x="-10%" y="-10%" width="130%" height="130%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#0f172a" floodOpacity="0.1" />
          </filter>
        </defs>

        <style>{`
          .stickyPaper { fill: #f8fafc; }
          .centerCircle { fill: #ffffff; stroke: #1e293b; stroke-width: 4.5; stroke-linecap: round; stroke-linejoin: round; }
          .centerOuterSketch { fill: none; stroke: #1e293b; stroke-width: 2.5; opacity: 0.35; stroke-dasharray: 140 10; }
          .centerTitle { font: 900 40px var(--font-kalam), "Comic Sans MS", cursive; fill: #1e293b; letter-spacing: 1px; }
          .stickyTitle { font: 800 22px var(--font-kalam), "Comic Sans MS", cursive; fill: #1e293b; letter-spacing: 0.5px; }
          .stickyBullet { font: 600 17px var(--font-kalam), "Comic Sans MS", cursive; fill: #334155; }
          .loopingArrow { fill: none; stroke: #1e293b; stroke-width: 3.5; stroke-linecap: round; stroke-linejoin: round; }
        `}</style>

        <rect className="stickyPaper" width="1600" height="1000" />

        {/* 1. Connecting Looping Arrows */}
        {cards.map((card, index) => {
          const arrow = createLoopingArrow(card.edgeSX, card.edgeSY, card.targetX, card.targetY, index);
          return (
            <g key={`arrow-${card.id}`}>
              <path d={arrow.pathD} className="loopingArrow" />
              <path d={arrow.arrowHeadD} fill="none" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          );
        })}

        {/* 2. Central Sketched Circle */}
        <g filter="url(#circleShadow)">
          <ellipse cx={centerCX} cy={centerCY} rx={centerRX} ry={centerRY} className="centerCircle" />
          <ellipse cx={centerCX + 2} cy={centerCY - 2} rx={centerRX + 8} ry={centerRY + 6} className="centerOuterSketch" />
          <ellipse cx={centerCX - 3} cy={centerCY + 3} rx={centerRX - 6} ry={centerRY - 5} className="centerOuterSketch" />
          {renderText(centralTitleLines, centerCX, centerCY - (centralTitleLines.length - 1) * 18 + 10, 42, "centerTitle", "middle")}
        </g>

        {/* 3. Sticky Notes (Post-Its) */}
        {cards.map((card) => {
          const { section, cx, cy, x, y, w, h, rotate } = card;
          const theme = section.theme;
          const titleLines = section.titleLines;

          // Corner adhesive tape positions
          const tapeW = 60;
          const tapeH = 22;
          const tape1X = x + 15;
          const tape1Y = y - 10;
          const tape2X = x + w - 75;
          const tape2Y = y - 10;

          let cursorY = y + 42 + (titleLines.length - 1) * 24;

          return (
            <g key={card.id} transform={`rotate(${rotate} ${cx} ${cy})`} filter="url(#stickyShadow)">
              {/* Sticky Note Base */}
              <rect x={x} y={y} width={w} height={h} rx="4" fill={theme.bg} stroke={theme.border} strokeWidth="1.5" />

              {/* Translucent Corner Washi Tapes */}
              <rect x={tape1X} y={tape1Y} width={tapeW} height={tapeH} rx="2" fill={theme.tape} transform={`rotate(-12 ${tape1X + tapeW / 2} ${tape1Y + tapeH / 2})`} />
              <rect x={tape2X} y={tape2Y} width={tapeW} height={tapeH} rx="2" fill={theme.tape} transform={`rotate(12 ${tape2X + tapeW / 2} ${tape2Y + tapeH / 2})`} />

              {/* Title */}
              {renderText(titleLines, x + 20, y + 36, 24, "stickyTitle", "start")}
              <path d={`M ${x + 20} ${y + 44 + (titleLines.length - 1) * 24} L ${x + w - 20} ${y + 44 + (titleLines.length - 1) * 24}`} stroke={theme.border} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.6" />

              {/* Bullet Lines */}
              {section.bulletLinesList.map((lines: string[], idx: number) => {
                const curY = cursorY;
                cursorY += lines.length * 20 + 8;
                return (
                  <g key={idx}>
                    <circle cx={x + 24} cy={curY - 5} r="3" fill="#334155" />
                    {renderText(lines, x + 36, curY, 19, "stickyBullet", "start")}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
};
