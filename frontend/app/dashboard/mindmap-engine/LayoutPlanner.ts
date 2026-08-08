import {
  ExtractedContent,
  ExtractedSection,
  PlannedLayout,
  PlannedNode,
  PlannedConnector,
  StructureType,
} from "./types";
import { validateStructureType, getSectionTheme } from "./InformationArchitect";
import { calculateCardDimensions } from "./BoxSizer";
import {
  createBezierHubPath,
  createSequenceChevronPath,
  createElbowTreePath,
  createDividerPath,
  createTimelinePinPath,
} from "./ArrowRouter";

// ==========================================
// 1. HUB LAYOUT PLANNER
// ==========================================
export const planHubLayout = (content: ExtractedContent): PlannedLayout => {
  const sections = content.sections || [];
  const count = sections.length;
  const hasTakeaways = Boolean(content.takeaways && content.takeaways.length > 0);

  // Initial center anchor
  const hubX = 750;
  const hubY = hasTakeaways ? 420 : 440;
  const hubRx = 140;
  const hubRy = 95;

  const nodes: PlannedNode[] = [];
  const connectors: PlannedConnector[] = [];

  // Match formulas with sections
  const formulaMap = new Map<string, typeof content.formulas>();
  content.formulas.forEach((f) => {
    if (f.relatedSection) {
      const key = f.relatedSection.toLowerCase().trim();
      const existing = formulaMap.get(key) || [];
      existing.push(f);
      formulaMap.set(key, existing);
    }
  });

  // Balanced radial orbit
  const orbitRx = count <= 4 ? 410 : count <= 6 ? 440 : 470;
  const orbitRy = count <= 4 ? 250 : count <= 6 ? 270 : 290;

  sections.forEach((sec, idx) => {
    // Distribute angles starting from top-center (-PI/2)
    const angle = -Math.PI / 2 + (2 * Math.PI * idx) / Math.max(1, count);
    const rawDims = calculateCardDimensions(sec);
    const theme = getSectionTheme(sec.kind, idx);

    const cardCenterX = hubX + Math.cos(angle) * orbitRx;
    const cardCenterY = hubY + Math.sin(angle) * orbitRy;

    const posX = Math.round(cardCenterX - rawDims.width / 2);
    const posY = Math.round(cardCenterY - rawDims.height / 2);

    const matchedFormulas = formulaMap.get(sec.title.toLowerCase().trim());

    const plannedNode: PlannedNode = {
      id: sec.id,
      x: posX,
      y: posY,
      width: rawDims.width,
      height: rawDims.height,
      section: sec,
      theme,
      role: sec.importance === 1 ? "primary" : "secondary",
      parentTitle: sec.parentTitle,
      anchoredFormulas: matchedFormulas,
    };
    nodes.push(plannedNode);

    // Calculate edge intersection for organic arrow
    const cardTargetX = posX + rawDims.width / 2;
    const cardTargetY = posY + rawDims.height / 2;

    const hubEdgeX = hubX + Math.cos(angle) * (hubRx + 4);
    const hubEdgeY = hubY + Math.sin(angle) * (hubRy + 4);

    let targetX = cardTargetX;
    let targetY = cardTargetY;
    if (Math.abs(cardTargetX - hubX) > Math.abs(cardTargetY - hubY)) {
      targetX = cardTargetX > hubX ? posX : posX + rawDims.width;
    } else {
      targetY = cardTargetY > hubY ? posY : posY + rawDims.height;
    }

    const pathData = createBezierHubPath(hubEdgeX, hubEdgeY, targetX, targetY);
    connectors.push({
      id: `hub-conn-${sec.id}`,
      fromX: hubEdgeX,
      fromY: hubEdgeY,
      toX: targetX,
      toY: targetY,
      pathData,
      style: "bezier",
      color: theme.accent,
      strokeWidth: sec.importance === 1 ? 2.5 : 2.0,
    });
  });

  // Calculate dynamic tight bounding box
  let minX = hubX - hubRx - 30;
  let maxX = hubX + hubRx + 30;
  let minY = hubY - hubRy - 30;
  let maxY = hubY + hubRy + 30;

  nodes.forEach((n) => {
    if (n.x < minX) minX = n.x;
    if (n.x + n.width > maxX) maxX = n.x + n.width;
    if (n.y < minY) minY = n.y;
    if (n.y + n.height > maxY) maxY = n.y + n.height;
  });

  // Add takeaway banner height if takeaways exist
  const takeawayPadding = hasTakeaways ? 90 : 0;
  maxY += takeawayPadding;

  const padding = 45;
  const boundX = Math.round(minX - padding);
  const boundY = Math.round(minY - padding);
  const boundWidth = Math.round(maxX - minX + padding * 2);
  const boundHeight = Math.round(maxY - minY + padding * 2);

  return {
    structureType: "hub",
    canvasWidth: boundWidth,
    canvasHeight: boundHeight,
    viewBox: `${boundX} ${boundY} ${boundWidth} ${boundHeight}`,
    centralHub: {
      x: hubX,
      y: hubY,
      rx: hubRx,
      ry: hubRy,
      title: content.centralConcept || content.title,
      thesis: content.thesis || "",
      color: "#2563eb",
    },
    nodes,
    connectors,
    takeaways: content.takeaways,
    formulas: content.formulas,
  };
};

// ==========================================
// 2. SEQUENCE LAYOUT PLANNER
// ==========================================
export const planSequenceLayout = (content: ExtractedContent): PlannedLayout => {
  const sections = content.sections || [];
  const flow = content.flow || [];

  let orderedSections: ExtractedSection[] = [];
  if (flow.length > 0) {
    const secMap = new Map(sections.map((s) => [s.title.toLowerCase().trim(), s]));
    flow.forEach((fl) => {
      const match = secMap.get(fl.toLowerCase().trim());
      if (match && !orderedSections.includes(match)) {
        orderedSections.push(match);
      }
    });
    sections.forEach((s) => {
      if (!orderedSections.includes(s)) orderedSections.push(s);
    });
  } else {
    orderedSections = [...sections];
  }

  const count = orderedSections.length;
  const isMultiRow = count > 4;
  const nodes: PlannedNode[] = [];
  const connectors: PlannedConnector[] = [];
  const hasTakeaways = Boolean(content.takeaways && content.takeaways.length > 0);

  if (!isMultiRow) {
    const cardY = 280;
    const cardWidth = 270;
    const spacing = 320;
    const startX = 60;

    orderedSections.forEach((sec, idx) => {
      const dims = calculateCardDimensions(sec);
      const theme = getSectionTheme(sec.kind, idx);
      const posX = startX + idx * spacing;
      const posY = cardY - dims.height / 2;

      const node: PlannedNode = {
        id: sec.id,
        x: posX,
        y: posY,
        width: dims.width,
        height: dims.height,
        section: sec,
        theme,
        role: "step",
        stepNumber: idx + 1,
        timeMarker: sec.timeMarker || `Step ${idx + 1}`,
      };
      nodes.push(node);

      if (idx > 0) {
        const prev = nodes[idx - 1];
        const fromX = prev.x + prev.width + 4;
        const fromY = prev.y + prev.height / 2;
        const toX = posX - 4;
        const toY = posY + dims.height / 2;

        connectors.push({
          id: `seq-conn-${idx}`,
          fromX,
          fromY,
          toX,
          toY,
          pathData: createSequenceChevronPath(fromX, fromY, toX, toY),
          style: "chevron",
          color: theme.accent,
          strokeWidth: 2.5,
        });
      }
    });
  } else {
    const row1Count = Math.ceil(count / 2);
    const row1 = orderedSections.slice(0, row1Count);
    const row2 = orderedSections.slice(row1Count);

    const row1Y = 220;
    const row2Y = 560;
    const spacing = 320;
    const startX = 60;

    row1.forEach((sec, idx) => {
      const dims = calculateCardDimensions(sec);
      const theme = getSectionTheme(sec.kind, idx);
      const posX = startX + idx * spacing;
      const posY = row1Y - dims.height / 2;

      nodes.push({
        id: sec.id,
        x: posX,
        y: posY,
        width: dims.width,
        height: dims.height,
        section: sec,
        theme,
        role: "step",
        stepNumber: idx + 1,
        timeMarker: sec.timeMarker || `Step ${idx + 1}`,
      });

      if (idx > 0) {
        const prev = nodes[idx - 1];
        const fromX = prev.x + prev.width + 4;
        const fromY = prev.y + prev.height / 2;
        const toX = posX - 4;
        const toY = posY + dims.height / 2;

        connectors.push({
          id: `seq-conn-r1-${idx}`,
          fromX,
          fromY,
          toX,
          toY,
          pathData: createSequenceChevronPath(fromX, fromY, toX, toY),
          style: "chevron",
          color: theme.accent,
          strokeWidth: 2.5,
        });
      }
    });

    row2.forEach((sec, idx) => {
      const dims = calculateCardDimensions(sec);
      const theme = getSectionTheme(sec.kind, row1Count + idx);
      const stepNum = row1Count + idx + 1;
      const posX = startX + idx * spacing;
      const posY = row2Y - dims.height / 2;

      nodes.push({
        id: sec.id,
        x: posX,
        y: posY,
        width: dims.width,
        height: dims.height,
        section: sec,
        theme,
        role: "step",
        stepNumber: stepNum,
        timeMarker: sec.timeMarker || `Step ${stepNum}`,
      });

      if (idx === 0) {
        const lastRow1 = nodes[row1Count - 1];
        const fromX = lastRow1.x + lastRow1.width / 2;
        const fromY = lastRow1.y + lastRow1.height;
        const toX = posX + dims.width / 2;
        const toY = posY;

        connectors.push({
          id: `seq-conn-wrap`,
          fromX,
          fromY,
          toX,
          toY,
          pathData: `M ${fromX} ${fromY} C ${fromX} ${fromY + 50}, ${toX} ${toY - 50}, ${toX} ${toY}`,
          style: "chevron",
          color: theme.accent,
          strokeWidth: 2.5,
        });
      } else {
        const prev = nodes[row1Count + idx - 1];
        const fromX = prev.x + prev.width + 4;
        const fromY = prev.y + prev.height / 2;
        const toX = posX - 4;
        const toY = posY + dims.height / 2;

        connectors.push({
          id: `seq-conn-r2-${idx}`,
          fromX,
          fromY,
          toX,
          toY,
          pathData: createSequenceChevronPath(fromX, fromY, toX, toY),
          style: "chevron",
          color: theme.accent,
          strokeWidth: 2.5,
        });
      }
    });
  }

  // Calculate dynamic bounding box
  let minX = 10000;
  let maxX = -10000;
  let minY = 10000;
  let maxY = -10000;

  nodes.forEach((n) => {
    if (n.x < minX) minX = n.x;
    if (n.x + n.width > maxX) maxX = n.x + n.width;
    if (n.y < minY) minY = n.y;
    if (n.y + n.height > maxY) maxY = n.y + n.height;
  });

  const takeawayPadding = hasTakeaways ? 90 : 0;
  maxY += takeawayPadding;

  const padding = 45;
  const boundX = Math.round(minX - padding);
  const boundY = Math.round(minY - padding);
  const boundWidth = Math.round(maxX - minX + padding * 2);
  const boundHeight = Math.round(maxY - minY + padding * 2);

  return {
    structureType: "sequence",
    canvasWidth: boundWidth,
    canvasHeight: boundHeight,
    viewBox: `${boundX} ${boundY} ${boundWidth} ${boundHeight}`,
    nodes,
    connectors,
    takeaways: content.takeaways,
    formulas: content.formulas,
  };
};

// ==========================================
// 3. HIERARCHY LAYOUT PLANNER
// ==========================================
export const planHierarchyLayout = (content: ExtractedContent): PlannedLayout => {
  const sections = content.sections || [];
  const titleMap = new Map(sections.map((s) => [s.title.toLowerCase().trim(), s]));

  const roots: ExtractedSection[] = [];
  const childrenMap = new Map<string, ExtractedSection[]>();

  sections.forEach((sec) => {
    if (!sec.parentTitle || !titleMap.has(sec.parentTitle.toLowerCase().trim())) {
      roots.push(sec);
    } else {
      const parentKey = sec.parentTitle.toLowerCase().trim();
      const existing = childrenMap.get(parentKey) || [];
      existing.push(sec);
      childrenMap.set(parentKey, existing);
    }
  });

  if (roots.length === 0 && sections.length > 0) {
    roots.push(sections[0]);
  }

  const nodes: PlannedNode[] = [];
  const connectors: PlannedConnector[] = [];
  const nodeMap = new Map<string, PlannedNode>();
  const hasTakeaways = Boolean(content.takeaways && content.takeaways.length > 0);

  const rootY = 120;
  const rootSpacing = 380;
  const rootStartX = 60;

  roots.forEach((root, idx) => {
    const dims = calculateCardDimensions(root, 1);
    const theme = getSectionTheme(root.kind, idx);
    const posX = rootStartX + idx * rootSpacing;
    const posY = rootY;

    const plannedRoot: PlannedNode = {
      id: root.id,
      x: posX,
      y: posY,
      width: dims.width,
      height: dims.height,
      section: root,
      theme,
      role: "tree-node",
    };
    nodes.push(plannedRoot);
    nodeMap.set(root.title.toLowerCase().trim(), plannedRoot);
  });

  const childY = 440;
  const allChildren: Array<{ child: ExtractedSection; parentNode: PlannedNode }> = [];

  roots.forEach((root) => {
    const parentNode = nodeMap.get(root.title.toLowerCase().trim());
    if (parentNode) {
      const myChildren = childrenMap.get(root.title.toLowerCase().trim()) || [];
      myChildren.forEach((child) => allChildren.push({ child, parentNode }));
    }
  });

  sections.forEach((sec) => {
    if (!roots.includes(sec) && !allChildren.some((item) => item.child === sec)) {
      allChildren.push({ child: sec, parentNode: nodes[0] });
    }
  });

  const childSpacing = 300;
  const childStartX = 60;

  allChildren.forEach(({ child, parentNode }, idx) => {
    const dims = calculateCardDimensions(child, 2);
    const theme = getSectionTheme(child.kind, roots.length + idx);
    const posX = childStartX + idx * childSpacing;
    const posY = childY;

    const plannedChild: PlannedNode = {
      id: child.id,
      x: posX,
      y: posY,
      width: dims.width,
      height: dims.height,
      section: child,
      theme,
      role: "tree-node",
      parentTitle: parentNode.section.title,
    };
    nodes.push(plannedChild);

    const fromX = parentNode.x + parentNode.width / 2;
    const fromY = parentNode.y + parentNode.height;
    const toX = posX + dims.width / 2;
    const toY = posY;

    connectors.push({
      id: `tree-conn-${child.id}`,
      fromX,
      fromY,
      toX,
      toY,
      pathData: createElbowTreePath(fromX, fromY, toX, toY),
      style: "elbow",
      color: theme.accent,
      strokeWidth: 2.2,
    });
  });

  let minX = 10000;
  let maxX = -10000;
  let minY = 10000;
  let maxY = -10000;

  nodes.forEach((n) => {
    if (n.x < minX) minX = n.x;
    if (n.x + n.width > maxX) maxX = n.x + n.width;
    if (n.y < minY) minY = n.y;
    if (n.y + n.height > maxY) maxY = n.y + n.height;
  });

  const takeawayPadding = hasTakeaways ? 90 : 0;
  maxY += takeawayPadding;

  const padding = 45;
  const boundX = Math.round(minX - padding);
  const boundY = Math.round(minY - padding);
  const boundWidth = Math.round(maxX - minX + padding * 2);
  const boundHeight = Math.round(maxY - minY + padding * 2);

  return {
    structureType: "hierarchy",
    canvasWidth: boundWidth,
    canvasHeight: boundHeight,
    viewBox: `${boundX} ${boundY} ${boundWidth} ${boundHeight}`,
    nodes,
    connectors,
    takeaways: content.takeaways,
    formulas: content.formulas,
  };
};

// ==========================================
// 4. COMPARISON LAYOUT PLANNER
// ==========================================
export const planComparisonLayout = (content: ExtractedContent): PlannedLayout => {
  const sections = content.sections || [];
  const groupA: ExtractedSection[] = [];
  const groupB: ExtractedSection[] = [];

  sections.forEach((sec, idx) => {
    if (sec.compareGroup === "A") groupA.push(sec);
    else if (sec.compareGroup === "B") groupB.push(sec);
    else if (idx % 2 === 0) groupA.push(sec);
    else groupB.push(sec);
  });

  const nodes: PlannedNode[] = [];
  const connectors: PlannedConnector[] = [];
  const hasTakeaways = Boolean(content.takeaways && content.takeaways.length > 0);

  const startY = 160;
  const rowHeight = 220;
  const cardWidth = 280;

  const colAX = 100;
  const colBX = 500;
  const dividerX = 440;

  groupA.forEach((sec, idx) => {
    const dims = calculateCardDimensions(sec, 2);
    const theme = getSectionTheme(sec.kind, idx);
    const posY = startY + idx * rowHeight;

    nodes.push({
      id: sec.id,
      x: colAX,
      y: posY,
      width: cardWidth,
      height: dims.height,
      section: sec,
      theme,
      role: "column-a",
    });
  });

  groupB.forEach((sec, idx) => {
    const dims = calculateCardDimensions(sec, 2);
    const theme = getSectionTheme(sec.kind, groupA.length + idx);
    const posY = startY + idx * rowHeight;

    nodes.push({
      id: sec.id,
      x: colBX,
      y: posY,
      width: cardWidth,
      height: dims.height,
      section: sec,
      theme,
      role: "column-b",
    });
  });

  let maxY = startY + Math.max(groupA.length, groupB.length) * rowHeight + 20;

  connectors.push(createDividerPath(dividerX, 90, maxY));

  const compareLabels = content.compareGroupLabels || {
    A: "Group A",
    B: "Group B",
  };

  const takeawayPadding = hasTakeaways ? 90 : 0;
  maxY += takeawayPadding;

  const padding = 45;
  const boundX = Math.round(colAX - padding);
  const boundY = 40;
  const boundWidth = Math.round(colBX + cardWidth + padding * 2 - boundX);
  const boundHeight = Math.round(maxY + padding);

  return {
    structureType: "comparison",
    canvasWidth: boundWidth,
    canvasHeight: boundHeight,
    viewBox: `${boundX} ${boundY} ${boundWidth} ${boundHeight}`,
    nodes,
    connectors,
    takeaways: content.takeaways,
    formulas: content.formulas,
    compareLabels,
  };
};

// ==========================================
// 5. TIMELINE LAYOUT PLANNER
// ==========================================
export const planTimelineLayout = (content: ExtractedContent): PlannedLayout => {
  const sections = content.sections || [];
  const count = sections.length;
  const hasTakeaways = Boolean(content.takeaways && content.takeaways.length > 0);

  const axisY = 440;
  const nodes: PlannedNode[] = [];
  const connectors: PlannedConnector[] = [];
  const spacing = 310;
  const startX = 70;

  sections.forEach((sec, idx) => {
    const dims = calculateCardDimensions(sec, 2);
    const theme = getSectionTheme(sec.kind, idx);
    const posX = startX + idx * spacing;
    const isAbove = idx % 2 === 0;
    const posY = isAbove ? axisY - dims.height - 60 : axisY + 60;

    const node: PlannedNode = {
      id: sec.id,
      x: posX,
      y: posY,
      width: dims.width,
      height: dims.height,
      section: sec,
      theme,
      role: isAbove ? "timeline-top" : "timeline-bottom",
      timeMarker: sec.timeMarker || `Phase ${idx + 1}`,
      stepNumber: idx + 1,
    };
    nodes.push(node);

    const cardEdgeY = isAbove ? posY + dims.height : posY;
    const centerX = posX + dims.width / 2;

    connectors.push({
      id: `timeline-pin-${sec.id}`,
      fromX: centerX,
      fromY: axisY,
      toX: centerX,
      toY: cardEdgeY,
      pathData: createTimelinePinPath(axisY, centerX, cardEdgeY),
      style: "axis",
      color: theme.accent,
      strokeWidth: 2.2,
    });
  });

  let minX = 10000;
  let maxX = -10000;
  let minY = 10000;
  let maxY = -10000;

  nodes.forEach((n) => {
    if (n.x < minX) minX = n.x;
    if (n.x + n.width > maxX) maxX = n.x + n.width;
    if (n.y < minY) minY = n.y;
    if (n.y + n.height > maxY) maxY = n.y + n.height;
  });

  const takeawayPadding = hasTakeaways ? 90 : 0;
  maxY += takeawayPadding;

  const padding = 45;
  const boundX = Math.round(minX - padding);
  const boundY = Math.round(minY - padding);
  const boundWidth = Math.round(maxX - minX + padding * 2);
  const boundHeight = Math.round(maxY - minY + padding * 2);

  return {
    structureType: "timeline",
    canvasWidth: boundWidth,
    canvasHeight: boundHeight,
    viewBox: `${boundX} ${boundY} ${boundWidth} ${boundHeight}`,
    nodes,
    connectors,
    takeaways: content.takeaways,
    formulas: content.formulas,
    timelineAxis: {
      y: axisY,
      startX: boundX + 30,
      endX: boundX + boundWidth - 30,
    },
  };
};

// ==========================================
// UNIFIED LAYOUT DISPATCHER
// ==========================================
export const planLayout = (content: ExtractedContent): PlannedLayout => {
  const structureType = validateStructureType(content);

  switch (structureType) {
    case "sequence":
      return planSequenceLayout(content);
    case "hierarchy":
      return planHierarchyLayout(content);
    case "comparison":
      return planComparisonLayout(content);
    case "timeline":
      return planTimelineLayout(content);
    case "hub":
    default:
      return planHubLayout(content);
  }
};
