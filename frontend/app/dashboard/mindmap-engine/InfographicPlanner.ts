import {
  ExtractedContent,
  ExtractedSection,
  PlannedInfographicLayout,
  InfographicBranch,
} from "./types";
import { getSectionTheme } from "./InformationArchitect";
import { wrapLines } from "./BoxSizer";

// Slot geometry configurations for 1 to 8 branches
interface SlotConfig {
  angleDeg: number; // Angle on hub rim (0 = Right, 90 = Top, 180 = Left, 270 = Bottom)
  discOffset: { dx: number; dy: number };
  side: "left" | "right" | "top";
}

// Pre-tuned ergonomic slots matching the executive infographic aesthetic
const PRESET_SLOTS_BY_COUNT: Record<number, SlotConfig[]> = {
  3: [
    { angleDeg: 155, discOffset: { dx: -300, dy: -60 },  side: "left" },
    { angleDeg: 90,  discOffset: { dx: 0,    dy: -240 }, side: "top" },
    { angleDeg: 25,  discOffset: { dx: 300,  dy: -60 },  side: "right" },
  ],
  4: [
    { angleDeg: 195, discOffset: { dx: -320, dy: 80 },   side: "left" },
    { angleDeg: 145, discOffset: { dx: -280, dy: -140 }, side: "left" },
    { angleDeg: 35,  discOffset: { dx: 280,  dy: -140 }, side: "right" },
    { angleDeg: -15, discOffset: { dx: 320,  dy: 80 },   side: "right" },
  ],
  5: [
    { angleDeg: 195, discOffset: { dx: -320, dy: 90 },   side: "left" },
    { angleDeg: 145, discOffset: { dx: -290, dy: -110 }, side: "left" },
    { angleDeg: 90,  discOffset: { dx: 0,    dy: -240 }, side: "top" },
    { angleDeg: 35,  discOffset: { dx: 290,  dy: -110 }, side: "right" },
    { angleDeg: -15, discOffset: { dx: 320,  dy: 90 },   side: "right" },
  ],
  6: [
    // Matches the 6-node reference diagram with clean non-overlapping spacing
    { angleDeg: 200, discOffset: { dx: -340, dy: 100 },  side: "left" },  // Bottom-left
    { angleDeg: 155, discOffset: { dx: -320, dy: -100 }, side: "left" },  // Mid-left
    { angleDeg: 112, discOffset: { dx: -150, dy: -240 }, side: "top" },   // Top-left
    { angleDeg: 68,  discOffset: { dx: 150,  dy: -240 }, side: "top" },   // Top-right
    { angleDeg: 25,  discOffset: { dx: 320,  dy: -100 }, side: "right" }, // Mid-right
    { angleDeg: -20, discOffset: { dx: 340,  dy: 100 },  side: "right" }, // Bottom-right
  ],
  7: [
    { angleDeg: 205, discOffset: { dx: -340, dy: 110 },  side: "left" },
    { angleDeg: 165, discOffset: { dx: -320, dy: -30 },  side: "left" },
    { angleDeg: 130, discOffset: { dx: -230, dy: -180 }, side: "left" },
    { angleDeg: 90,  discOffset: { dx: 0,    dy: -250 }, side: "top" },
    { angleDeg: 50,  discOffset: { dx: 230,  dy: -180 }, side: "right" },
    { angleDeg: 15,  discOffset: { dx: 320,  dy: -30 },  side: "right" },
    { angleDeg: -25, discOffset: { dx: 340,  dy: 110 },  side: "right" },
  ],
  8: [
    { angleDeg: 210, discOffset: { dx: -340, dy: 120 },  side: "left" },
    { angleDeg: 175, discOffset: { dx: -330, dy: -20 },  side: "left" },
    { angleDeg: 140, discOffset: { dx: -260, dy: -160 }, side: "left" },
    { angleDeg: 105, discOffset: { dx: -110, dy: -250 }, side: "top" },
    { angleDeg: 75,  discOffset: { dx: 110,  dy: -250 }, side: "top" },
    { angleDeg: 40,  discOffset: { dx: 260,  dy: -160 }, side: "right" },
    { angleDeg: 5,   discOffset: { dx: 330,  dy: -20 },  side: "right" },
    { angleDeg: -30, discOffset: { dx: 340,  dy: 120 },  side: "right" },
  ],
};

// Generates smooth orthogonal stepped conduit paths with 90-degree rounded curves
const createSteppedConduitPath = (
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  side: "left" | "right" | "top"
): string => {
  const radius = 18;

  if (side === "top") {
    const dx = toX - fromX;
    if (Math.abs(dx) < 10) {
      return `M ${fromX.toFixed(1)} ${fromY.toFixed(1)} L ${toX.toFixed(1)} ${toY.toFixed(1)}`;
    }

    const midY = fromY + (toY - fromY) * 0.48;
    const dirX = dx > 0 ? 1 : -1;

    const p1X = fromX;
    const p1Y = midY + radius;
    const p2X = fromX + dirX * radius;
    const p2Y = midY;

    const p3X = toX - dirX * radius;
    const p3Y = midY;
    const p4X = toX;
    const p4Y = midY - radius;

    return `M ${fromX.toFixed(1)} ${fromY.toFixed(1)} L ${p1X.toFixed(1)} ${p1Y.toFixed(1)} Q ${fromX.toFixed(1)} ${midY.toFixed(1)} ${p2X.toFixed(1)} ${p2Y.toFixed(1)} L ${p3X.toFixed(1)} ${p3Y.toFixed(1)} Q ${toX.toFixed(1)} ${midY.toFixed(1)} ${p4X.toFixed(1)} ${p4Y.toFixed(1)} L ${toX.toFixed(1)} ${toY.toFixed(1)}`;
  }

  const dy = toY - fromY;
  const dx = toX - fromX;

  if (Math.abs(dy) < 12) {
    return `M ${fromX.toFixed(1)} ${fromY.toFixed(1)} L ${toX.toFixed(1)} ${toY.toFixed(1)}`;
  }

  const midX = fromX + dx * 0.48;
  const dirY = dy > 0 ? 1 : -1;
  const dirX = dx > 0 ? 1 : -1;

  const p1X = midX - dirX * radius;
  const p1Y = fromY;
  const p2X = midX;
  const p2Y = fromY + dirY * radius;

  const p3X = midX;
  const p3Y = toY - dirY * radius;
  const p4X = midX + dirX * radius;
  const p4Y = toY;

  return `M ${fromX.toFixed(1)} ${fromY.toFixed(1)} L ${p1X.toFixed(1)} ${p1Y.toFixed(1)} Q ${midX.toFixed(1)} ${fromY.toFixed(1)} ${p2X.toFixed(1)} ${p2Y.toFixed(1)} L ${p3X.toFixed(1)} ${p3Y.toFixed(1)} Q ${midX.toFixed(1)} ${toY.toFixed(1)} ${p4X.toFixed(1)} ${p4Y.toFixed(1)} L ${toX.toFixed(1)} ${toY.toFixed(1)}`;
};

export const planInfographicLayout = (
  content: ExtractedContent
): PlannedInfographicLayout => {
  const sections = content.sections || [];
  const count = Math.min(8, Math.max(1, sections.length));
  const activeSections = sections.slice(0, count);

  // Center coordinates of the 3D dome hub
  const hubX = 640;
  const hubY = 480;
  const hubR = 75;
  const discRadius = 26;
  const lineHeight = 19;

  // Select slot config
  const slotConfigs = PRESET_SLOTS_BY_COUNT[count] || PRESET_SLOTS_BY_COUNT[6];

  const branches: InfographicBranch[] = [];

  activeSections.forEach((sec, idx) => {
    const slot = slotConfigs[idx] || slotConfigs[slotConfigs.length - 1];
    const theme = getSectionTheme(sec.kind, idx);

    // Terminal position on hub perimeter
    const angleRad = (slot.angleDeg * Math.PI) / 180;
    const termX = Math.round(hubX + Math.cos(angleRad) * (hubR + 2));
    const termY = Math.round(hubY - Math.sin(angleRad) * (hubR + 2));

    // Floating Disc Center
    const discX = Math.round(hubX + slot.discOffset.dx);
    const discY = Math.round(hubY + slot.discOffset.dy);

    // Target connection point on disc circumference depending on orientation
    let discConnX = discX;
    let discConnY = discY;

    if (slot.side === "top") {
      discConnX = discX;
      discConnY = discY + discRadius;
    } else if (slot.side === "left") {
      discConnX = discX + discRadius;
      discConnY = discY;
    } else {
      discConnX = discX - discRadius;
      discConnY = discY;
    }

    const conduitPath = createSteppedConduitPath(
      termX,
      termY,
      discConnX,
      discConnY,
      slot.side
    );

    // Text formatting (larger, readable font wrapping)
    const rawBullets = sec.bullets || [];
    const textLines: string[] = [];
    const maxChars = slot.side === "top" ? 26 : 30;

    rawBullets.slice(0, 2).forEach((b) => {
      const wrapped = wrapLines(b, maxChars);
      wrapped.slice(0, 2).forEach((line) => {
        if (textLines.length < 3) {
          textLines.push(line);
        }
      });
    });

    if (textLines.length === 0) {
      textLines.push("Core concept details");
    }

    // Precise Non-Overlapping Text Placement
    let textAnchor: "start" | "middle" | "end" = "start";
    let textAlign: "left" | "right" | "center" = "left";
    const titlePos = { x: discX, y: discY };
    const textStartPos = { x: discX, y: discY };

    if (slot.side === "top") {
      // Positioned ABOVE the disc with guaranteed 18px+ vertical clearance
      textAnchor = "middle";
      textAlign = "center";
      const totalTextHeight = 22 + textLines.length * lineHeight;
      titlePos.x = discX;
      titlePos.y = discY - discRadius - totalTextHeight - 16;
      textStartPos.x = discX;
      textStartPos.y = titlePos.y + 22;
    } else if (slot.side === "left") {
      // Positioned to the LEFT of the disc with guaranteed 18px horizontal clearance
      textAnchor = "end";
      textAlign = "right";
      const totalTextHeight = 22 + textLines.length * lineHeight;
      titlePos.x = discX - discRadius - 18;
      titlePos.y = Math.round(discY - totalTextHeight / 2 + 8);
      textStartPos.x = discX - discRadius - 18;
      textStartPos.y = titlePos.y + 22;
    } else {
      // Positioned to the RIGHT of the disc with guaranteed 18px horizontal clearance
      textAnchor = "start";
      textAlign = "left";
      const totalTextHeight = 22 + textLines.length * lineHeight;
      titlePos.x = discX + discRadius + 18;
      titlePos.y = Math.round(discY - totalTextHeight / 2 + 8);
      textStartPos.x = discX + discRadius + 18;
      textStartPos.y = titlePos.y + 22;
    }

    branches.push({
      id: sec.id,
      section: sec,
      theme,
      terminal: {
        x: termX,
        y: termY,
        color: theme.accent,
      },
      discCenter: { x: discX, y: discY },
      discRadius,
      conduitPath,
      color: theme.accent,
      textAnchor,
      textAlign,
      titlePos,
      textLines,
      textStartPos,
    });
  });

  // Calculate dynamic tight bounding box with generous padding
  let minX = hubX - hubR - 40;
  let maxX = hubX + hubR + 40;
  let minY = hubY - hubR - 40;
  let maxY = hubY + hubR + 60;

  branches.forEach((b) => {
    const textWidthEstimate = 240;
    let bLeft = b.discCenter.x - b.discRadius;
    let bRight = b.discCenter.x + b.discRadius;

    if (b.textAnchor === "end") {
      bLeft = Math.min(bLeft, b.titlePos.x - textWidthEstimate);
    } else if (b.textAnchor === "start") {
      bRight = Math.max(bRight, b.titlePos.x + textWidthEstimate);
    } else {
      bLeft = Math.min(bLeft, b.titlePos.x - textWidthEstimate / 2);
      bRight = Math.max(bRight, b.titlePos.x + textWidthEstimate / 2);
    }

    const bTop = Math.min(b.discCenter.y - b.discRadius, b.titlePos.y - 20);
    const bBottom = Math.max(
      b.discCenter.y + b.discRadius + 20,
      b.textStartPos.y + b.textLines.length * lineHeight + 16
    );

    if (bLeft < minX) minX = bLeft;
    if (bRight > maxX) maxX = bRight;
    if (bTop < minY) minY = bTop;
    if (bBottom > maxY) maxY = bBottom;
  });

  const padding = 55;
  const boundX = Math.round(minX - padding);
  const boundY = Math.round(minY - padding);
  const boundWidth = Math.round(maxX - minX + padding * 2);
  const boundHeight = Math.round(maxY - minY + padding * 2);

  return {
    canvasWidth: boundWidth,
    canvasHeight: boundHeight,
    viewBox: `${boundX} ${boundY} ${boundWidth} ${boundHeight}`,
    centralDome: {
      cx: hubX,
      cy: hubY,
      r: hubR,
      title: content.centralConcept || content.title || "Core Topic",
      thesis: content.thesis,
    },
    branches,
    takeaways: content.takeaways || [],
  };
};
