import { MindmapSectionInput, IconType } from "./types";

export const resolveSectionIcon = (section: MindmapSectionInput, index: number): IconType => {
  if (section.icon && ["bulb", "gear", "target", "dice", "book", "code", "chart", "speech", "atom"].includes(section.icon)) {
    return section.icon as IconType;
  }

  const text = `${section.title || ""} ${section.cue || ""} ${section.kind || ""} ${(section.bullets || []).join(" ")}`.toLowerCase();

  if (/probability|dice|random|sample|coin|experiment|case/.test(text)) return "dice";
  if (/formula|math|equation|rule|axiom|theorem|law/.test(text)) return "target";
  if (/process|step|method|algorithm|gear|system|setup/.test(text)) return "gear";
  if (/code|computer|program|data|logic|digital/.test(text)) return "code";
  if (/chart|finance|result|graph|rate|distribution/.test(text)) return "chart";
  if (/book|definition|concept|study|note|lecture/.test(text)) return "book";
  if (/atom|physics|science|chemistry|biology|nature/.test(text)) return "atom";
  if (/speech|question|scenario|what|why|how/.test(text)) return "speech";

  const defaults: IconType[] = ["bulb", "book", "gear", "target", "dice", "chart"];
  return defaults[index % defaults.length];
};
