// Decoding tables for IRS EO BMF fields.
// Reference: IRS "Exempt Organizations Business Master File Extract" documentation.

export const NTEE_MAJOR = {
  A: "Arts, Culture & Humanities",
  B: "Education",
  C: "Environment",
  D: "Animal-Related",
  E: "Health Care",
  F: "Mental Health & Crisis Intervention",
  G: "Diseases, Disorders & Medical Disciplines",
  H: "Medical Research",
  I: "Crime & Legal-Related",
  J: "Employment",
  K: "Food, Agriculture & Nutrition",
  L: "Housing & Shelter",
  M: "Public Safety, Disaster Preparedness & Relief",
  N: "Recreation & Sports",
  O: "Youth Development",
  P: "Human Services",
  Q: "International, Foreign Affairs & National Security",
  R: "Civil Rights, Social Action & Advocacy",
  S: "Community Improvement & Capacity Building",
  T: "Philanthropy, Voluntarism & Grantmaking Foundations",
  U: "Science & Technology",
  V: "Social Science",
  W: "Public & Societal Benefit",
  X: "Religion-Related",
  Y: "Mutual & Membership Benefit",
  Z: "Unknown",
};

export const SUBSECTION = {
  "01": "501(c)(1) Corporation organized under Act of Congress",
  "02": "501(c)(2) Title-holding corporation",
  "03": "501(c)(3) Charitable, religious, educational or scientific organization",
  "04": "501(c)(4) Social welfare organization",
  "05": "501(c)(5) Labor, agricultural or horticultural organization",
  "06": "501(c)(6) Business league, chamber of commerce, trade board",
  "07": "501(c)(7) Social and recreational club",
  "08": "501(c)(8) Fraternal beneficiary society",
  "09": "501(c)(9) Voluntary employees' beneficiary association",
  "10": "501(c)(10) Domestic fraternal society",
  "11": "501(c)(11) Teachers' retirement fund",
  "12": "501(c)(12) Benevolent life insurance, mutual utility, etc.",
  "13": "501(c)(13) Cemetery company",
  "14": "501(c)(14) State-chartered credit union",
  "15": "501(c)(15) Mutual insurance company",
  "16": "501(c)(16) Crop financing corporation",
  "17": "501(c)(17) Supplemental unemployment benefit trust",
  "19": "501(c)(19) Veterans' organization",
  "21": "501(c)(21) Black lung trust",
  "23": "501(c)(23) Veterans' association founded before 1880",
  "25": "501(c)(25) Title-holding corporation for multiple parents",
  "26": "501(c)(26) State-sponsored high-risk health coverage",
  "27": "501(c)(27) State-sponsored workers' compensation reinsurance",
  "29": "501(c)(29) Qualified nonprofit health insurance issuer",
  "40": "501(d) Religious and apostolic association",
  "50": "501(e) Cooperative hospital service organization",
  "60": "501(f) Cooperative service organization of operating educational organizations",
  "70": "501(k) Child care organization",
  "71": "501(n) Charitable risk pool",
  "81": "529 Qualified state tuition program",
  "82": "527 Political organization",
  "92": "4947(a)(1) Nonexempt charitable trust",
};

export const SUBSECTION_SHORT = (code) => {
  const label = SUBSECTION[code];
  return label ? label.split(" ")[0] : `Code ${code}`;
};

export const FOUNDATION = {
  "00": "All organizations except 501(c)(3)",
  "02": "Private operating foundation exempt from paying excise taxes on investment income",
  "03": "Private operating foundation (other)",
  "04": "Private non-operating foundation",
  "09": "Suspense",
  "10": "Church",
  "11": "School",
  "12": "Hospital or medical research organization",
  "13": "Organization operated for the benefit of a college or university owned or operated by a governmental unit",
  "14": "Governmental unit",
  "15": "Publicly supported organization (170(b)(1)(A)(vi))",
  "16": "Organization that normally receives more than one-third of its support from contributions, fees and gross receipts (509(a)(2))",
  "17": "Organization operated for the benefit of a 509(a)(1) or (2) organization (509(a)(3))",
  "18": "Organization organized and operated to test for public safety",
  "21": "509(a)(3) Type I supporting organization",
  "22": "509(a)(3) Type II supporting organization",
  "23": "509(a)(3) Type III functionally integrated supporting organization",
  "24": "509(a)(3) Type III non-functionally integrated supporting organization",
};

export const DEDUCTIBILITY = {
  "1": "Contributions are deductible",
  "2": "Contributions are not deductible",
  "4": "Contributions are deductible by treaty (foreign organizations)",
};

export const ORGANIZATION = {
  "1": "Corporation",
  "2": "Trust",
  "3": "Co-operative",
  "4": "Partnership",
  "5": "Association",
};

export const AFFILIATION = {
  "1": "Central — not a group return",
  "2": "Intermediate — not a group return",
  "3": "Independent organization",
  "6": "Central — group return parent",
  "7": "Intermediate — part of a group return",
  "8": "Central — group return, not exempt itself",
  "9": "Subordinate in a group return",
};

export const STATUS = {
  "01": "Unconditional exemption",
  "02": "Conditional exemption",
  "12": "Trust described in 4947(a)(2)",
  "25": "Organization terminating its private foundation status",
};

export const FILING_REQ = {
  "01": "Form 990 (all other) or 990-EZ return",
  "02": "Form 990 — not required to file (income less than $25,000)",
  "03": "Form 990 — group return",
  "04": "Form 990 — required to file Form 990-BL, Black Lung Trusts",
  "06": "Form 990 — not required to file (church)",
  "07": "Form 990 — government 501(c)(1)",
  "13": "Form 990 — not required to file (religious organization)",
  "14": "Form 990 — not required to file (instrumentalities of states or political subdivisions)",
  "00": "Not required to file (all other)",
};

export const AMOUNT_CODE = {
  "0": "$0",
  "1": "$1 to $9,999",
  "2": "$10,000 to $24,999",
  "3": "$25,000 to $99,999",
  "4": "$100,000 to $499,999",
  "5": "$500,000 to $999,999",
  "6": "$1,000,000 to $4,999,999",
  "7": "$5,000,000 to $9,999,999",
  "8": "$10,000,000 to $49,999,999",
  "9": "$50,000,000 or more",
};

export const nteeLabel = (code) => {
  if (!code) return "Not classified";
  return NTEE_MAJOR[code[0]] ?? "Not classified";
};

export const formatEIN = (ein) => `${ein.slice(0, 2)}-${ein.slice(2)}`;

export const money = (n) =>
  n ? n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }) : "—";

export const compactMoney = (n) =>
  n ? "$" + Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n) : "—";

export const escapeHTML = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
