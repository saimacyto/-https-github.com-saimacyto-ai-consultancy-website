// Two separate ladders, modeled on how Candid keeps trust independent of money:
//  - Transparency Stars are EARNED by sharing information. They are free and are the only
//    tier that affects search ranking.
//  - Membership plans are PAID and add tools and visibility features. They never change
//    an organization's Star or its place in search results.

import { CONFIG } from "./config.js";

export const STARS = {
  verified: {
    rank: 1, label: "Verified", color: "#2f6fb5",
    summary: "Ownership and EIN confirmed",
    requires: ["Claim the profile with an email at your organization's domain", "Confirm your EIN and authorized contact", "Add your mission, website and contact details"],
  },
  bronze: {
    rank: 2, label: "Bronze Star", color: "#b0703a",
    summary: "Who you are and what you do",
    requires: ["Everything in Verified", "Executive director and board chair", "Service area and programs, each with a short description"],
  },
  silver: {
    rank: 3, label: "Silver Star", color: "#8c97a8",
    summary: "How you are funded",
    requires: ["Everything in Bronze", "Current-year operating budget", "Revenue sources by percentage", "Board member list and a link to your latest Form 990 or audit"],
  },
  gold: {
    rank: 4, label: "Gold Star", color: "#c99a1d",
    summary: "Where you are headed",
    requires: ["Everything in Silver", "Goals for the next 1–3 years", "Strategies and the capabilities you use to reach them"],
  },
  platinum: {
    rank: 5, label: "Platinum Star", color: "#5b6b8c",
    summary: "What you achieve",
    requires: ["Everything in Gold", "At least three outcome metrics", "Yearly results for each metric, updated annually"],
  },
};

export const STAR_ORDER = ["verified", "bronze", "silver", "gold", "platinum"];

export const PLANS = {
  community: {
    label: "Community",
    tagline: "Everything you need to be found and trusted.",
    features: ["Claim and edit your profile", "Earn Transparency Stars", "Mission, programs, leadership and results", "Embeddable Star badge for your website"],
  },
  plus: {
    label: "Plus",
    tagline: "Turn profile visitors into donors and volunteers.",
    features: ["Everything in Community", "Donate and volunteer buttons", "Photo gallery and video", "Events and job postings", "Monthly profile-view analytics", "Priority review in 5 business days"],
  },
  premier: {
    label: "Premier",
    tagline: "For organizations ready to grow their funding.",
    features: ["Everything in Plus", "Texas grant opportunity alerts matched to your cause", "Quarterly AI & tech workshops for nonprofit teams", "“Spotlight” rotation on cause and city pages (labeled Sponsored)", "Annual verification certificate", "Dedicated support contact"],
  },
};

export const priceFor = (plan, revenue = Infinity) => {
  const base = CONFIG.prices[plan] ?? 0;
  return revenue < CONFIG.smallOrgRevenue ? Math.round(base * (1 - CONFIG.smallOrgDiscount)) : base;
};

const STAR_PATH = "M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z";
const CHECK_PATH = "M12 2a10 10 0 100 20 10 10 0 000-20zm-1.4 14.2l-4-4 1.4-1.4 2.6 2.6 5.6-5.6 1.4 1.4-7 7z";

export function starIcon(level, size = 18) {
  const s = STARS[level];
  if (!s) return "";
  const path = level === "verified" ? CHECK_PATH : STAR_PATH;
  return `<svg class="star-icon" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="${path}" fill="${s.color}"/></svg>`;
}

export function starBadge(level, { compact = false } = {}) {
  const s = STARS[level];
  if (!s) return "";
  return `<span class="star-badge star-${level}" title="${s.label}: ${s.summary}">${starIcon(level, compact ? 14 : 16)}${compact ? "" : s.label}</span>`;
}

let verifiedPromise;
// data/verified.json holds approved profiles keyed by EIN (see README for the schema).
export function loadVerified() {
  verifiedPromise ??= fetch("data/verified.json")
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}));
  return verifiedPromise;
}
