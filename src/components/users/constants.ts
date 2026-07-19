/** Shared clearance labels, badge styles, and name-initials utility for Users-related components. */

export const CLEARANCE_LABELS: Record<number, string> = {
  1: "Công khai",
  2: "Nội bộ",
  3: "Hạn chế",
  4: "Mật",
  5: "Tuyệt mật",
};

export const CLEARANCE_CLASS: Record<number, string> = {
  1: "bg-sensitivity_level-public/15 text-sensitivity_level-public border border-sensitivity_level-public/40",
  2: "bg-sensitivity_level-internal/15 text-sensitivity_level-internal border border-sensitivity_level-internal/40",
  3: "bg-sensitivity_level-confidential/15 text-sensitivity_level-confidential border border-sensitivity_level-confidential/40",
  4: "bg-sensitivity_level-restricted/15 text-sensitivity_level-restricted border border-sensitivity_level-restricted/40",
  5: "bg-sensitivity_level-top_secret/15 text-sensitivity_level-top_secret border border-sensitivity_level-top_secret/40",
};

// Generate up-to-2-char uppercase initials from a display name.
export const initials = (n: string) =>
  n
    .split(" ")
    .map((x) => x[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
