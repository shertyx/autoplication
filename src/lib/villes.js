// Extract 5-digit postal codes from the stored ville string.
// Handles both "Paris - 75001" (new format) and raw "75001" (legacy).
function extractPostalCodes(villeStr) {
  if (!villeStr?.trim()) return [];
  return villeStr.split(",")
    .map((s) => s.trim().match(/\d{5}/)?.[0])
    .filter(Boolean);
}

// Extract unique France Travail department codes from the stored ville string.
// Special cases: Corsica (20xxx → 2A/2B), DOM-TOM (97x → 3 digits).
export function getDeptsFromPostalCodes(villeStr) {
  const codes = extractPostalCodes(villeStr);
  const depts = [...new Set(codes.map((pc) => {
    if (pc.startsWith("971") || pc.startsWith("972") || pc.startsWith("973") ||
        pc.startsWith("974") || pc.startsWith("976")) return pc.slice(0, 3);
    if (pc >= "20000" && pc <= "20190") return "2A";
    if (pc >= "20200" && pc <= "20999") return "2B";
    return pc.slice(0, 2);
  }))];
  return depts;
}

// Returns the location string for JSearch / Google Jobs queries.
export function getLocationLabel(villeStr) {
  if (!villeStr?.trim()) return "France";
  // Use city names if available (e.g. "Paris - 75001" → "Paris"), else raw codes
  const labels = villeStr.split(",")
    .map((s) => s.trim().split(" - ")[0].trim())
    .filter(Boolean);
  return labels.slice(0, 2).join(", ") + ", France";
}
