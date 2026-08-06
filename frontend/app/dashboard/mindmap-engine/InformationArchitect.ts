import { MindmapSectionInput, ArchitectSection, StickyColorTheme } from "./types";
import { resolveSectionIcon } from "./IconSelector";
import { calculateCardDimensions } from "./BoxSizer";

export const STICKY_PALETTE: StickyColorTheme[] = [
  { bg: "#fff1f2", border: "#f472b6", tape: "rgba(244, 114, 182, 0.55)" }, // Pink
  { bg: "#eff6ff", border: "#60a5fa", tape: "rgba(96, 165, 250, 0.55)" },  // Blue
  { bg: "#fefce8", border: "#facc15", tape: "rgba(245, 158, 11, 0.55)" },  // Yellow
  { bg: "#f0fdf4", border: "#4ade80", tape: "rgba(52, 211, 153, 0.55)" },  // Mint
  { bg: "#fff7ed", border: "#fb923c", tape: "rgba(251, 146, 60, 0.55)" },  // Peach
  { bg: "#faf5ff", border: "#c084fc", tape: "rgba(168, 85, 247, 0.55)" },  // Purple
];

export const processInformationArchitecture = (sections: MindmapSectionInput[]): ArchitectSection[] => {
  return sections.slice(0, 8).map((sec, index) => {
    const id = `sticky-${index}-${sec.title || "topic"}`;
    const resolvedType = "post_it";
    const resolvedIcon = resolveSectionIcon(sec, index);
    const importanceScore = sec.importance || (10 - index);
    const theme = STICKY_PALETTE[index % STICKY_PALETTE.length];

    const { cardWidth, cardHeight, titleLines, bulletLinesList } = calculateCardDimensions(sec);

    return {
      ...sec,
      id,
      importanceScore,
      resolvedType,
      resolvedIcon,
      titleLines,
      bulletLinesList,
      cardWidth,
      cardHeight,
      theme,
    };
  });
};
