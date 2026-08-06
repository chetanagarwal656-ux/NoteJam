export interface ArrowPathResult {
  pathD: string;
  arrowHeadD: string;
}

export const createLoopingArrow = (
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  index: number
): ArrowPathResult => {
  const dx = ex - sx;
  const dy = ey - sy;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;

  // Normal vector
  const nx = -dy / dist;
  const ny = dx / dist;

  // Add a playful loop / curl for odd indexes or curved arc for evens
  const curvature = (index % 2 === 0 ? 60 : -60) * (dist / 400);

  // Control points for cubic bezier
  const c1x = sx + dx * 0.35 + nx * curvature * 1.5;
  const c1y = sy + dy * 0.35 + ny * curvature * 1.5;

  const c2x = sx + dx * 0.7 - nx * curvature * 0.8;
  const c2y = sy + dy * 0.7 - ny * curvature * 0.8;

  const pathD = `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${ex} ${ey}`;

  // Calculate arrow head angle at endpoint from c2 to (ex, ey)
  const angle = Math.atan2(ey - c2y, ex - c2x);
  const headLen = 14;
  const a1x = ex - headLen * Math.cos(angle - Math.PI / 6);
  const a1y = ey - headLen * Math.sin(angle - Math.PI / 6);
  const a2x = ex - headLen * Math.cos(angle + Math.PI / 6);
  const a2y = ey - headLen * Math.sin(angle + Math.PI / 6);

  const arrowHeadD = `M ${a1x} ${a1y} L ${ex} ${ey} L ${a2x} ${a2y}`;

  return { pathD, arrowHeadD };
};
