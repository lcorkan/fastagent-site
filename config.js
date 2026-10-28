// ─────────────────────────────────────────────────────────────
//  PASTE YOUR LINKS HERE. This is the only file you need to edit.
//  The waitlist form, the deposit buttons and the contact link use these.
// ─────────────────────────────────────────────────────────────
window.FASTAGENT_CONFIG = {
  // 1. Free waitlist: emails go straight into your Supabase table "waitlist".
  //    The publishable key is safe to show: it can only add an email, never read the list.
  SUPABASE_URL: "https://bsmfhywwvlseqecsljub.supabase.co",
  SUPABASE_KEY: "sb_publishable_DuMEjM4saE3Xzuct23z3Jw_-mCHTpOV",

  // 2. Founding-member $29 refundable deposit (your Stripe Payment Link)
  STRIPE_DEPOSIT_URL: "https://buy.stripe.com/dRm7sL3R4anJ6vt0j293y01",

  // Contact email shown in the footer (just the address, no "mailto:")
  CONTACT_EMAIL: "CONTACT_EMAIL",
};
