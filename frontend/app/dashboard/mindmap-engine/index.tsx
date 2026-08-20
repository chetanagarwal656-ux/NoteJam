import React from "react";
import { RawMindmapData } from "./types";
import { extractContent } from "./ContentExtractor";
import { planInfographicLayout } from "./InfographicPlanner";
import { InfographicRenderer } from "./InfographicRenderer";

export * from "./types";
export * from "./ContentExtractor";
export * from "./InformationArchitect";
export * from "./BoxSizer";
export * from "./IconSelector";
export * from "./ArrowRouter";
export * from "./InfographicPlanner";
export * from "./InfographicRenderer";

interface MindmapEngineViewProps {
  mindmap: RawMindmapData | null;
  svgRef: React.RefObject<SVGSVGElement | null>;
  isExpanded?: boolean;
}

export const MindmapEngineView: React.FC<MindmapEngineViewProps> = ({
  mindmap,
  svgRef,
}) => {
  // 1. Extract & Normalize Content (supports v2 & legacy formats)
  const extracted = extractContent(mindmap || {});

  // 2. Render clean Infographic Flow layout
  const infographicLayout = planInfographicLayout(extracted);
  return (
    <InfographicRenderer
      svgRef={svgRef}
      layout={infographicLayout}
      title={extracted.title}
    />
  );
};
