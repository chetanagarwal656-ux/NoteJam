/**
 * MathSanitizer.ts
 * Converts LaTeX expressions and raw math notation into crisp, publication-grade Unicode
 * specifically for SVG text rendering (where KaTeX DOM elements cannot be rendered).
 */

const GREEK_MAP: Record<string, string> = {
  alpha: "α",
  beta: "β",
  gamma: "γ",
  Gamma: "Γ",
  delta: "δ",
  Delta: "Δ",
  epsilon: "ε",
  varepsilon: "ε",
  zeta: "ζ",
  eta: "η",
  theta: "θ",
  Theta: "Θ",
  iota: "ι",
  kappa: "κ",
  lambda: "λ",
  Lambda: "Λ",
  mu: "μ",
  nu: "ν",
  xi: "ξ",
  pi: "π",
  Pi: "Π",
  rho: "ρ",
  sigma: "σ",
  Sigma: "Σ",
  tau: "τ",
  upsilon: "υ",
  phi: "φ",
  Phi: "Φ",
  chi: "χ",
  psi: "ψ",
  Psi: "Ψ",
  omega: "ω",
  Omega: "Ω",
};

const SYMBOL_MAP: Record<string, string> = {
  sum: "∑",
  prod: "∏",
  int: "∫",
  iint: "∬",
  oint: "∮",
  partial: "∂",
  nabla: "∇",
  infty: "∞",
  pm: "±",
  mp: "∓",
  times: "×",
  cdot: "·",
  div: "÷",
  le: "≤",
  leq: "≤",
  ge: "≥",
  geq: "≥",
  ne: "≠",
  neq: "≠",
  approx: "≈",
  equiv: "≡",
  sim: "~",
  propto: "∝",
  in: "∈",
  notin: "∉",
  subset: "⊂",
  subseteq: "⊆",
  cap: "∩",
  cup: "∪",
  forall: "∀",
  exists: "∃",
  to: "→",
  rightarrow: "→",
  leftarrow: "←",
  leftrightarrow: "↔",
  Rightarrow: "⇒",
  Leftarrow: "⇐",
  Leftrightarrow: "⇔",
  land: "∧",
  lor: "∨",
  neg: "¬",
  circ: "∘",
  bullet: "•",
};

const SUPERSCRIPTS: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "+": "⁺",
  "-": "⁻",
  "=": "⁼",
  "(": "⁽",
  ")": "⁾",
  n: "ⁿ",
  i: "ⁱ",
  T: "ᵀ",
  k: "ᵏ",
};

const SUBSCRIPTS: Record<string, string> = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",
  "+": "₊",
  "-": "₋",
  "=": "₌",
  "(": "₍",
  ")": "₎",
  a: "ₐ",
  e: "ₑ",
  h: "ₕ",
  i: "ᵢ",
  j: "ⱼ",
  k: "ₖ",
  l: "ₗ",
  m: "ₘ",
  n: "ₙ",
  o: "ₒ",
  p: "ₚ",
  r: "ᵣ",
  s: "ₛ",
  t: "ₜ",
  u: "ᵤ",
  v: "ᵥ",
  x: "ₓ",
};

export const sanitizeMathForSvg = (rawText: string): string => {
  if (!rawText) return "";

  let text = String(rawText);

  // 1. Convert \frac{num}{den} -> (num)/(den) or num/den
  text = text.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1)/($2)");

  // 2. Convert \sqrt{x} -> √(x)
  text = text.replace(/\\sqrt\{([^{}]+)\}/g, "√($1)");

  // 3. Remove wrapper commands like \text{...}, \mathrm{...}, \mathbf{...}, \operatorname{...}
  text = text.replace(/\\(?:text|mathrm|mathbf|mathit|mathsf|operatorname)\{([^{}]+)\}/g, "$1");

  // 4. Replace Greek letters (\alpha, \beta, etc.)
  text = text.replace(/\\([a-zA-Z]+)/g, (match, name) => {
    if (GREEK_MAP[name]) return GREEK_MAP[name];
    if (SYMBOL_MAP[name]) return SYMBOL_MAP[name];
    return match;
  });

  // 5. Handle simple superscripts like ^2, ^{2}, ^n, ^{k}
  text = text.replace(/\^\{([0-9+\-nNikT]+)\}/g, (_, inner) => {
    return inner.split("").map((c: string) => SUPERSCRIPTS[c] || c).join("");
  });
  text = text.replace(/\^([0-9+\-nNikT])/g, (_, char) => {
    return SUPERSCRIPTS[char] || `^${char}`;
  });

  // 6. Handle subscripts like _{i}, _i, _{X|A}
  // If all characters have Unicode subscript equivalents:
  text = text.replace(/_\{([0-9+\-aehijklmnoprstuvx]+)\}/g, (_, inner) => {
    return inner.split("").map((c: string) => SUBSCRIPTS[c] || c).join("");
  });
  text = text.replace(/_([0-9aehijklmnoprstuvx])\b/g, (_, char) => {
    return SUBSCRIPTS[char] || `_${char}`;
  });

  // For complex subscripts like _{X|A} or _{X,Y}, strip curly braces cleanly
  text = text.replace(/_\{([^{}]+)\}/g, "_($1)");

  // 7. Strip stray backslashes for unmapped commands
  text = text.replace(/\\([a-zA-Z]+)/g, "$1");

  // 8. Clean up LaTeX dollar sign delimiters: $p(x)$ -> p(x), $$...$$ -> ...
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, "$1");
  text = text.replace(/\$([^$]+)\$/g, "$1");

  // 9. Clean up any lingering double spaces or trailing punctuation artifacts
  text = text.replace(/\s+/g, " ").trim();

  return text;
};
