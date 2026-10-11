// utils/reportFormat.js
// Small formatting helpers shared by the report tabs.

export function formatPeso(amount) {
  return `₱${Number(amount ?? 0).toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;
}

export function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// Deterministic avatar colors (literal classes so Tailwind keeps them).
export const AVATAR_COLORS = [
  "bg-blue-600",
  "bg-green-600",
  "bg-purple-600",
  "bg-orange-600",
  "bg-pink-600",
  "bg-teal-600",
];