import { ArchitectSection, PositionedCard } from "./types";

export interface LayoutOptions {
  canvasWidth: number;
  canvasHeight: number;
  centerCX: number;
  centerCY: number;
  centerRX: number;
  centerRY: number;
}

export const planLayout = (
  sections: ArchitectSection[],
  options: LayoutOptions = {
    canvasWidth: 1600,
    canvasHeight: 1000,
    centerCX: 800,
    centerCY: 500,
    centerRX: 170,
    centerRY: 140,
  }
): PositionedCard[] => {
  const { centerCX, centerCY } = options;

  // 8 beautifully balanced sticky note anchor positions matching Design 2
  const POSITIONS = [
    { cx: 220, cy: 160, rotate: -3.5 }, // 0: Top-Left Far
    { cx: 540, cy: 140, rotate: 2.8 },  // 1: Top-Left Near
    { cx: 1060, cy: 140, rotate: -2.2 },// 2: Top-Right Near
    { cx: 1380, cy: 160, rotate: 3.8 }, // 3: Top-Right Far
    { cx: 240, cy: 500, rotate: 2.5 },  // 4: Mid-Left
    { cx: 1360, cy: 500, rotate: -3.0 },// 5: Mid-Right
    { cx: 420, cy: 820, rotate: -2.8 }, // 6: Bottom-Left
    { cx: 1180, cy: 820, rotate: 3.2 }, // 7: Bottom-Right
  ];

  return sections.map((sec, index) => {
    const pos = POSITIONS[index % POSITIONS.length];
    const w = sec.cardWidth;
    const h = sec.cardHeight;
    const x = pos.cx - w / 2;
    const y = pos.cy - h / 2;

    // Center edge point calculation
    const dx = pos.cx - centerCX;
    const dy = pos.cy - centerCY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const edgeSX = centerCX + (dx / dist) * options.centerRX;
    const edgeSY = centerCY + (dy / dist) * options.centerRY;

    // Target point on sticky note edge
    const targetX = pos.cx < centerCX ? x + w - 10 : pos.cx > centerCX ? x + 10 : pos.cx;
    const targetY = pos.cy < centerCY ? y + h - 10 : pos.cy > centerCY ? y + 10 : pos.cy;

    return {
      id: sec.id,
      section: sec,
      cx: pos.cx,
      cy: pos.cy,
      x,
      y,
      w,
      h,
      rotate: pos.rotate,
      edgeSX,
      edgeSY,
      targetX,
      targetY,
    };
  });
};
