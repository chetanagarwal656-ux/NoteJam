import React from "react";
import { RawMindmapData } from "./types";
import { extractContent } from "./ContentExtractor";
import { planLayout } from "./LayoutPlanner";
import { SketchRenderer } from "./SketchRenderer";

export * from "./types";
export * from "./ContentExtractor";
export * from "./InformationArchitect";
export * from "./BoxSizer";
export * from "./IconSelector";
export * from "./ArrowRouter";
export * from "./LayoutPlanner";
export * from "./SketchRenderer";

interface MindmapEngineViewProps {
  mindmap: RawMindmapData | null;
  svgRef: React.RefObject<SVGSVGElement | null>;
  isExpanded?: boolean;
}

export const MindmapEngineView: React.FC<MindmapEngineViewProps> = ({
  mindmap,
  svgRef,
  isExpanded = false,
}) => {
  // 1. Extract & Normalize Content (supports v2 & legacy formats)
  const extracted = extractContent(mindmap || {});

  // 2. Dispatch to content-adaptive 2D vector layout planner
  const plannedLayout = planLayout(extracted);

  // 3. Render vector visualization
  return (
    <SketchRenderer
      svgRef={svgRef}
      layout={plannedLayout}
      title={extracted.title}
      isExpanded={isExpanded}
    />
  );
};
