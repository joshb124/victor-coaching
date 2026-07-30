/*
 * Repwave — site configuration
 * -----------------------------------------------------------
 * Everything a non-developer might want to tweak lives here.
 * Edit the values below and re-deploy. No build step required.
 *
 * NOTE ON KEYS: The Supabase URL + publishable key are meant to be
 * public. They only allow INSERTING a signup/application (Row Level
 * Security blocks reading, updating and deleting), so it is safe to
 * ship them in this static file.
 */
window.RW_CONFIG = {
  // --- Platform brand ---------------------------------------
  brand: "Repwave",
  tagline: "The creator coaching platform.",

  // --- Platform social links (leave "" to hide) -------------
  social: {
    tiktok: "https://www.tiktok.com/@repwave",
    instagram: "https://www.instagram.com/repwave",
    youtube: "",
    email: "hello@repwave.com",
  },

  // --- Creators on the roster -------------------------------
  creators: {
    victor: {
      name: "Vice Wave",       // public handle-brand
      firstName: "Victor",     // real first name, used in bio copy
      handle: "@vicewave",
      niche: "Hypertrophy · No-BS training",
      social: {
        tiktok: "https://www.tiktok.com/@vicewave",
        instagram: "https://www.instagram.com/vicewave",
        youtube: "",
        email: "victor@repwave.com",
      },
      // Shown in the profile stat row — update as they grow.
      stats: [
        { value: "TikTok", label: "Where you know him from" },
        { value: "1:1", label: "Coaching, personalized" },
        { value: "Limited", label: "Founding-fan spots" },
      ],
    },
  },

  // --- Supabase backend -------------------------------------
  supabase: {
    url: "https://xloognwmenzhgokiykrw.supabase.co",
    // Publishable (public) key — safe to expose. Insert-only via RLS.
    key: "sb_publishable_H5H7mv9aKjUUc_O0WI5Eog_h4lgvuPa",
    tables: {
      waitlist: "waitlist",                 // fan waitlist (victor page)
      coachApplications: "coach_applications", // influencer applications (index)
    },
  },
};
