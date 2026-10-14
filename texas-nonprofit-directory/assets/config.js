// Site settings you can edit without touching the rest of the code.
export const CONFIG = {
  siteName: "TX Nonprofits",
  // Public address of the site. Used for canonical links and badge embed code.
  siteUrl: "https://txnonprofit.com/",
  // Name of the verification program shown on Star badges.
  programName: "TXVerified",

  // Supabase project that stores member accounts, saved lists and claim requests.
  // The key is Supabase's public "anon" key: it is meant to be in the browser, and
  // row-level security in the database decides what each visitor can read or change.
  supabaseUrl: "https://opxihiumxpmvvvtlhlpd.supabase.co",
  supabaseKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9weGloaXVteHBtdnZ2dGxobHBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwMDc2OTksImV4cCI6MjEwNzU4MzY5OX0.7Ze3lCDQhOfvxAjhlln1HuhSBaHkFxwiPw6SAeKUDKA",

  // Address for data-plan and enterprise inquiries (leave empty to hide the email links).
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
