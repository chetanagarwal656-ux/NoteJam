import { PlannedConnector } from "./types";

export const createBezierHubPath = (
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): string => {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const dist = Math.hypot(dx, dy);

  // Perpendicular offset for organic sketch curve
  const normalX = -dy / (dist || 1);
  const normalY = dx / (dist || 1);
  const curvature = Math.min(45, Math.max(20, dist * 0.12));

  const cp1X = fromX + dx * 0.35 + normalX * curvature;
  const cp1Y = fromY + dy * 0.35 + normalY * curvature;
  const cp2X = fromX + dx * 0.7 + normalX * (curvature * 0.6);
  const cp2Y = fromY + dy * 0.7 + normalY * (curvature * 0.6);

  return `M ${fromX.toFixed(1)} ${fromY.toFixed(1)} C ${cp1X.toFixed(1)} ${cp1Y.toFixed(1)}, ${cp2X.toFixed(1)} ${cp2Y.toFixed(1)}, ${toX.toFixed(1)} ${toY.toFixed(1)}`;
};

export const createSequenceChevronPath = (
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): string => {
  const dx = toX - fromX;
  const dy = toY - fromY;

  // If mostly horizontal
  if (Math.abs(dy) < 50) {
    return `M ${fromX.toFixed(1)} ${fromY.toFixed(1)} L ${toX.toFixed(1)} ${toY.toFixed(1)}`;
  }

  // Snake wrap path (e.g. from row 1 end to row 2 start)
  const midX = fromX + dx * 0.5;
  return `M ${fromX.toFixed(1)} ${fromY.toFixed(1)} C ${(fromX + 80).toFixed(1)} ${fromY.toFixed(1)}, ${(toX - 80).toFixed(1)} ${toY.toFixed(1)}, ${toX.toFixed(1)} ${toY.toFixed(1)}`;
};

export const createElbowTreePath = (
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): string => {
  const midY = fromY + (toY - fromY) * 0.5;
  const radius = 8;

  // Smooth rounded corners for tree branch
  const dir = toX > fromX ? 1 : -1;
  const corner1X = fromX;
  const corner1Y = midY - radius;
  const corner2X = fromX + dir * radius;
  const corner2Y = midY;

  const corner3X = toX - dir * radius;
  const corner3Y = midY;
  const corner4X = toX;
  const corner4Y = midY + radius;

  if (Math.abs(toX - fromX) < 16) {
    return `M ${fromX.toFixed(1)} ${fromY.toFixed(1)} L ${toX.toFixed(1)} ${toY.toFixed(1)}`;
  }

  return `M ${fromX.toFixed(1)} ${fromY.toFixed(1)} L ${corner1X.toFixed(1)} ${corner1Y.toFixed(1)} Q ${fromX.toFixed(1)} ${midY.toFixed(1)} ${corner2X.toFixed(1)} ${corner2Y.toFixed(1)} L ${corner3X.toFixed(1)} ${corner3Y.toFixed(1)} Q ${toX.toFixed(1)} ${midY.toFixed(1)} ${corner4X.toFixed(1)} ${corner4Y.toFixed(1)} L ${toX.toFixed(1)} ${toY.toFixed(1)}`;
};

export const createDividerPath = (
  x: number,
  startY: number,
  endY: number
): PlannedConnector => {
  return {
    id: `divider-${x}`,
    fromX: x,
    fromY: startY,
    toX: x,
    toY: endY,
    pathData: `M ${x} ${startY} L ${x} ${endY}`,
    style: "divider",
    color: "#cbd5e1",
    strokeWidth: 2,
    dashed: true,
  };
};

export const createTimelinePinPath = (
  axisY: number,
  nodeX: number,
  cardEdgeY: number
): string => {
  return `M ${nodeX.toFixed(1)} ${axisY.toFixed(1)} L ${nodeX.toFixed(1)} ${cardEdgeY.toFixed(1)}`;
};
