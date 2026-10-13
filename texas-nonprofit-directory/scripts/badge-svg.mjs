// Renders the embeddable Transparency Star badge as a standalone SVG.
// Fonts are system fonts because an SVG loaded through <img> can't fetch web fonts.

const LEVELS = {
  verified: { label: "Verified", line: "Verified profile", color: "#2f6fb5", tint: "#e8f0fa" },
  bronze: { label: "Bronze", line: "Bronze Star", color: "#a5652f", tint: "#f8ece2" },
  silver: { label: "Silver", line: "Silver Star", color: "#76829a", tint: "#eef0f4" },
  gold: { label: "Gold", line: "Gold Star", color: "#b4870f", tint: "#fbf3da" },
  platinum: { label: "Platinum", line: "Platinum Star", color: "#4b5a7a", tint: "#e9ecf3" },
};

const STAR = "M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z";
const CHECK = "M12 2a10 10 0 100 20 10 10 0 000-20zm-1.4 14.2l-4-4 1.4-1.4 2.6 2.6 5.6-5.6 1.4 1.4-7 7z";

export const BADGE_LEVELS = Object.keys(LEVELS);

export function badgeSVG(level, year) {
  const l = LEVELS[level];
  if (!l) throw new Error(`Unknown badge level: ${level}`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="104" viewBox="0 0 200 104" role="img" aria-label="${l.line} — Transparency ${year} — Texas Nonprofit Directory">
  <rect x="1" y="1" width="198" height="102" rx="10" fill="#ffffff" stroke="${l.color}" stroke-width="2"/>
  <rect x="7" y="7" width="186" height="90" rx="6" fill="${l.tint}"/>
  <g transform="translate(16 16) scale(1.5)"><path d="${level === "verified" ? CHECK : STAR}" fill="${l.color}"/></g>
  <text x="58" y="34" font-family="Helvetica, Arial, sans-serif" font-size="17" font-weight="700" fill="#17202f">${l.label}</text>
  <text x="58" y="53" font-family="Helvetica, Arial, sans-serif" font-size="12.5" fill="#3c4658">Transparency ${year}</text>
  <line x1="16" y1="68" x2="184" y2="68" stroke="${l.color}" stroke-opacity=".35"/>
  <text x="16" y="86" font-family="Helvetica, Arial, sans-serif" font-size="11" font-weight="700" fill="#17202f">Texas<tspan fill="#c2532f">Nonprofit</tspan>Directory</text>
</svg>
`;
}
