// Site settings you can edit without touching the rest of the code.
export const CONFIG = {
  siteName: "TX Nonprofits",
  // Public address of the site. Used for canonical links and badge embed code.
  siteUrl: "https://txnonprofits.com/",
  // Name of the verification program shown on Star badges.
  programName: "TXVerified",

  // Where "Claim your profile" applications are sent. Use either:
  //  - a form-backend URL that accepts JSON POSTs (e.g. https://formspree.io/f/xxxxxxx), or
  //  - an email address (applications open in the applicant's email app).
  // If both are empty, the claim form explains that applications are not open yet.
  claimEndpoint: "",
  contactEmail: "",

  // Stripe Payment Links (or any checkout URL) for the paid membership plans.
  // Leave empty to collect payment details after approval instead.
  paymentLinks: {
    plus: "",
    premier: "",
  },

  // Annual prices in USD. Organizations under smallOrgRevenue get smallOrgDiscount off.
  prices: { community: 0, plus: 149, premier: 399 },
  smallOrgRevenue: 250000,
  smallOrgDiscount: 0.5,

  // Data plans for funders, researchers and donors (shown as "Coming soon" until launched).
  // Monthly price when billed annually, and the higher month-to-month price.
  funderPlans: {
    pro: { annualMonthly: 49, monthly: 59 },
    compliance: { annualMonthly: 99, monthly: 119 },
  },
  funderPlansLive: false,
  nonprofitDataDiscount: 0.25, // discount on data plans for Texas nonprofits with a claimed profile
};
