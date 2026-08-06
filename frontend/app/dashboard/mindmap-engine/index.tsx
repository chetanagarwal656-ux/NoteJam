import React from "react";
import { RawMindmapData } from "./types";
import { extractContent } from "./ContentExtractor";
import { processInformationArchitecture } from "./InformationArchitect";
import { planLayout } from "./LayoutPlanner";
import { SketchRenderer } from "./SketchRenderer";

export * from "./types";
export * from "./ContentExtractor";
export * from "./InformationArchitect";
export * from "./BoxSizer";
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
  // 1. Content Extraction
  const extracted = extractContent(mindmap || {});

  // 2. Information Architecture & Box Sizing
  const architectSections = processInformationArchitecture(extracted.sections);

  // 3. 2D Layout Planning & Rotation Transforms
  const cards = planLayout(architectSections);

  // 4. Vector Sketch Rendering
  return (
    <SketchRenderer
      svgRef={svgRef}
      title={extracted.title}
      centralConcept={extracted.centralConcept}
      centralList={extracted.centralList}
      cards={cards}
      isExpanded={isExpanded}
    />
  );
};
