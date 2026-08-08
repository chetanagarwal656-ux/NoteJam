import {
  RawMindmapData,
  RawMindmapSection,
  ExtractedContent,
  ExtractedSection,
  ExtractedFormula,
  ExtractedExample,
  SectionKind,
  IconType,
  ImportanceTier,
  StructureType,
} from "./types";

const VALID_KINDS: SectionKind[] = [
  "definition",
  "formula",
  "process",
  "example",
  "application",
  "warning",
  "result",
];

const VALID_ICONS: IconType[] = [
  "bulb",
  "gear",
  "box",
  "target",
  "chart",
  "formula",
  "book",
  "atom",
  "code",
  "warning",
  "check",
  "dice",
  "speech",
];

const normalizeKind = (kindStr?: string): SectionKind => {
  const k = (kindStr || "").toLowerCase().trim();
  if (VALID_KINDS.includes(k as SectionKind)) {
    return k as SectionKind;
  }
  if (/formula|math|equation|rule|calc/.test(k)) return "formula";
  if (/process|step|method|flow|alg/.test(k)) return "process";
  if (/example|case|sample|demo/.test(k)) return "example";
  if (/apply|use|app|practice/.test(k)) return "application";
  if (/warn|caution|pitfall|mistake|risk/.test(k)) return "warning";
  if (/result|takeaway|summary|outcome|stat/.test(k)) return "result";
  return "definition";
};

const normalizeIcon = (iconStr?: string, kind?: SectionKind): IconType => {
  const i = (iconStr || "").toLowerCase().trim();
  if (VALID_ICONS.includes(i as IconType)) {
    return i as IconType;
  }
  if (kind === "formula") return "target";
  if (kind === "process") return "gear";
  if (kind === "example") return "box";
  if (kind === "warning") return "warning";
  if (kind === "result") return "chart";
  if (kind === "application") return "bulb";
  return "book";
};

const normalizeImportance = (imp?: number, idx = 0): ImportanceTier => {
  if (imp === 1 || imp === 2 || imp === 3) return imp;
  if (idx < 2) return 1;
  if (idx < 5) return 2;
  return 3;
};

export const extractContent = (raw: RawMindmapData): ExtractedContent => {
  const m = raw || {};
  const title = (m.title || m.centralConcept || m.coreConcept || "Revision Map").trim();
  const centralConcept = (m.centralConcept || m.coreConcept || m.title || "Core Concept").trim();
  const thesis = (m.thesis || (m.takeaways && m.takeaways[0]) || "").trim();

  let rawSections: RawMindmapSection[] = Array.isArray(m.sections) ? m.sections : [];

  // Legacy fallback: stickyNotes
  if (rawSections.length === 0 && Array.isArray(m.stickyNotes) && m.stickyNotes.length > 0) {
    rawSections = m.stickyNotes.map((note, idx) => ({
      title: note.title || `Topic ${idx + 1}`,
      cue: ["KEY CONCEPT", "APPLICATION", "HOW IT WORKS", "ANALYSIS"][idx % 4],
      bullets: String(note.body || "")
        .split(/(?<=[.!?])\s+/)
        .filter(Boolean)
        .slice(0, 3),
      kind: note.kind || "definition",
      importance: idx < 2 ? 1 : 2,
    }));
  }

  // Legacy fallback: branches
  if (rawSections.length === 0 && Array.isArray(m.branches) && m.branches.length > 0) {
    rawSections = m.branches.map((branch, idx) => ({
      title: branch.title || `Topic ${idx + 1}`,
      cue: ["CORE IDEA", "PRACTICAL USE", "KEY RULE"][idx % 3],
      bullets: branch.items || [],
      importance: idx < 2 ? 1 : 2,
    }));
  }

  // Legacy fallback: nodes
  if (rawSections.length === 0 && Array.isArray(m.nodes) && m.nodes.length > 0) {
    rawSections = m.nodes.map((node, idx) => ({
      title: node.label || `Topic ${idx + 1}`,
      cue: ["DEFINITION", "KEY POINT", "EXAMPLE"][idx % 3],
      bullets: node.text ? [node.text] : [],
      importance: idx < 2 ? 1 : 2,
    }));
  }

  const sections: ExtractedSection[] = rawSections
    .filter((s) => s && (s.title || (s.bullets && s.bullets.length > 0)))
    .map((s, idx) => {
      const secTitle = (s.title || `Concept ${idx + 1}`).trim();
      const kind = normalizeKind(s.kind);
      const icon = normalizeIcon(s.icon, kind);
      const importance = normalizeImportance(s.importance, idx);
      const defaultCue = kind.toUpperCase();

      const rawBullets = Array.isArray(s.bullets) ? s.bullets : [];
      const bullets = rawBullets
        .map((b) => (typeof b === "string" ? b.trim() : String(b)))
        .filter(Boolean);

      let compareGroup: "A" | "B" | null = null;
      if (s.compareGroup === "A" || s.compareGroup === "a") compareGroup = "A";
      else if (s.compareGroup === "B" || s.compareGroup === "b") compareGroup = "B";

      return {
        id: `sec-${idx}-${secTitle.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`,
        title: secTitle,
        cue: (s.cue || defaultCue).trim(),
        kind,
        importance,
        icon,
        bullets,
        parentTitle: s.parentTitle ? String(s.parentTitle).trim() : null,
        compareGroup,
        timeMarker: s.timeMarker ? String(s.timeMarker).trim() : null,
      };
    });

  // Extract Formulas
  const formulas: ExtractedFormula[] = [];
  if (Array.isArray(m.formulas)) {
    m.formulas.forEach((f) => {
      if (f && typeof f === "object" && f.label) {
        formulas.push({
          label: String(f.label).trim(),
          detail: String(f.detail || "").trim(),
          relatedSection: f.relatedSection ? String(f.relatedSection).trim() : undefined,
        });
      } else if (typeof f === "string") {
        formulas.push({
          label: "Formula",
          detail: f.trim(),
        });
      }
    });
  }

  // Extract Examples
  const examples: ExtractedExample[] = [];
  if (Array.isArray(m.examples)) {
    m.examples.forEach((e) => {
      if (e && typeof e === "object" && e.label) {
        examples.push({
          label: String(e.label).trim(),
          detail: String(e.detail || "").trim(),
          relatedSection: e.relatedSection ? String(e.relatedSection).trim() : undefined,
        });
      } else if (typeof e === "string") {
        examples.push({
          label: "Example",
          detail: e.trim(),
        });
      }
    });
  }

  // Extract Takeaways
  const takeaways: string[] = Array.isArray(m.takeaways)
    ? m.takeaways.map((t) => String(t).trim()).filter(Boolean)
    : [];

  // Extract Flow
  const flow: string[] = Array.isArray(m.flow)
    ? m.flow.map((fl) => String(fl).trim()).filter(Boolean)
    : [];

  // Structure Type hint
  const rawStructure = (m.structureType || "").toLowerCase().trim();
  let structureType: StructureType = "hub";
  if (
    rawStructure === "sequence" ||
    rawStructure === "hierarchy" ||
    rawStructure === "comparison" ||
    rawStructure === "timeline" ||
    rawStructure === "hub"
  ) {
    structureType = rawStructure as StructureType;
  }

  let compareGroupLabels: { A: string; B: string } | undefined;
  if (m.compareGroupLabels && typeof m.compareGroupLabels === "object") {
    compareGroupLabels = {
      A: String(m.compareGroupLabels.A || "Entity A").trim(),
      B: String(m.compareGroupLabels.B || "Entity B").trim(),
    };
  }

  return {
    version: (m.version || "revision-sheet-v2").trim(),
    title,
    centralConcept,
    thesis,
    structureType,
    sections,
    flow,
    formulas,
    examples,
    takeaways,
    compareGroupLabels,
  };
};
