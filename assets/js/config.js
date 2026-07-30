/*
 * Levo — site configuration
 * -----------------------------------------------------------
 * Everything a non-developer might want to tweak lives here.
 * Edit the values below and re-deploy. No build step required.
 *
 * NOTE ON KEYS: The Supabase URL + publishable key are meant to be
 * public. They only allow INSERTING a signup/application (Row Level
 * Security blocks reading, updating and deleting), so it is safe to
 * ship them in this static file.
 */
window.LEVO_CONFIG = {
  // --- Brand -------------------------------------------------
  brand: "levo",

  // --- Platform social links (leave "" to hide) -------------
  social: {
    tiktok: "https://www.tiktok.com/@levo",
    instagram: "https://www.instagram.com/levo",
    email: "hello@levo.fit",
  },

  // --- Creators ---------------------------------------------
  creators: {
    victor: {
      name: "Vice Wave",
      firstName: "Victor",
      handle: "@vicewave",
      niche: "Hypertrophy · No-BS training",
      social: {
        tiktok: "https://www.tiktok.com/@vicewave",
        instagram: "https://www.instagram.com/vicewave",
        email: "victor@levo.fit",
      },
    },
  },

  // --- Supabase backend -------------------------------------
  supabase: {
    url: "https://xloognwmenzhgokiykrw.supabase.co",
    // Publishable (public) key — safe to expose. Insert-only via RLS.
    key: "sb_publishable_H5H7mv9aKjUUc_O0WI5Eog_h4lgvuPa",
    tables: {
      waitlist: "waitlist",
      coachApplications: "coach_applications",
    },
  },
};
