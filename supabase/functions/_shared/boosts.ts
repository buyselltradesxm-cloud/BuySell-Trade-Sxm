// Website (Stripe) boost prices, in US cents, keyed by duration in days.
// create-checkout charges these; stripe-webhook refuses a paid session whose
// amount does not match. Keep in step with boostPlan() in the app.
export const BOOST_PRICE_CENTS: Record<string, number> = { "3": 600, "7": 1100, "14": 2000 };
export const BOOST_CURRENCY = "usd";
