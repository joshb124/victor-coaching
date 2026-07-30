/*
 * Vice Wave Coaching — site configuration
 * -----------------------------------------------------------
 * Everything a non-developer might want to tweak lives here.
 * Edit the values below and re-deploy. No build step required.
 *
 * NOTE ON KEYS: The Supabase URL + publishable key are meant to be
 * public. They only allow INSERTING a waitlist signup (Row Level
 * Security blocks reading, updating and deleting), so it is safe to
 * ship them in this static file.
 */
window.VW_CONFIG = {
  // --- Brand -------------------------------------------------
  brand: "Vice Wave",
  tagline: "Coaching that actually sticks.",

  // --- Social links (leave "" to hide a link) ---------------
  social: {
    tiktok: "https://www.tiktok.com/@vicewave",
    instagram: "https://www.instagram.com/vicewave",
    youtube: "",
    email: "coach@vicewave.com",
  },

  // --- Supabase waitlist backend ----------------------------
  supabase: {
    url: "https://xloognwmenzhgokiykrw.supabase.co",
    // Publishable (public) key — safe to expose. Insert-only via RLS.
    key: "sb_publishable_H5H7mv9aKjUUc_O0WI5Eog_h4lgvuPa",
    table: "waitlist",
  },
};
