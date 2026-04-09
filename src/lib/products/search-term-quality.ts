export const NOVA_SEARCH_TERM_MIN_ALPHANUMERIC_CHARS = 3;

export const NOVA_SEARCH_TERM_QUALITY_RULE_EN =
  "search term must include at least 3 alphanumeric characters and at least 1 letter for NOVA discovery.";

export const NOVA_SEARCH_TERM_QUALITY_RULE_ES =
  "Cada search term activo para NOVA debe incluir al menos 3 caracteres alfanumericos y al menos 1 letra.";

type SearchTermQualityResult = {
  normalized: string;
  alphanumericChars: number;
  hasLetter: boolean;
  isUsefulForNova: boolean;
};

export function evaluateSearchTermQuality(term: string): SearchTermQualityResult {
  const normalized = term.trim();
  const alphanumericChars = (normalized.match(/[a-z0-9]/gi) ?? []).length;
  const hasLetter = /[a-z]/i.test(normalized);
  const isUsefulForNova =
    alphanumericChars >= NOVA_SEARCH_TERM_MIN_ALPHANUMERIC_CHARS && hasLetter;

  return {
    normalized,
    alphanumericChars,
    hasLetter,
    isUsefulForNova,
  };
}

export function isSearchTermUsefulForNova(term: string): boolean {
  return evaluateSearchTermQuality(term).isUsefulForNova;
}
