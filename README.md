# Vice Wave Coaching — waitlist site

A fast, static landing page for **Vice Wave**, a fitness creator launching 1:1
coaching. Right now the only functional piece is a **waitlist** that captures
signups into Supabase. Framed as a coaching marketplace featuring one coach
(Vice Wave) today, with room for more coaches later.

- **No build step.** Plain HTML + CSS + vanilla JS. Open `index.html` and it works.
- **Deploy anywhere.** Netlify, Vercel, Cloudflare Pages, GitHub Pages — any static host.
- **Playful, vibrant, responsive, accessible** (keyboard nav, reduced-motion support, semantic HTML).

## Project structure

```
index.html              # the whole page
favicon.svg
robots.txt
netlify.toml            # optional: static deploy + security headers
assets/
  css/styles.css
  js/config.js          # ← edit brand, social links, Supabase keys here
  js/main.js            # form handling + config wiring
  img/og-image.svg      # social-share preview image
```

## Editing content

Most of what you'll want to change lives in **`assets/js/config.js`**:

- `brand` and `tagline`
- `social` links (TikTok, Instagram, YouTube, contact email) — leave any as `""` to hide it
- `supabase` connection (already configured)

Copy, headings, FAQ, and the coach bio are plain text in `index.html`. Look for
the `<!-- EDIT: ... -->` comment next to the coach bio to swap in Vice Wave's
real story and credentials.

## How the waitlist works

Signups are inserted straight into a Supabase table from the browser.

- **Project:** `vicewave-coaching`
- **Table:** `public.waitlist` — columns: `id`, `name`, `email`, `goal`,
  `source`, `user_agent`, `created_at`
- **Security:** Row Level Security is **on**. The public (`anon`) key can only
  **INSERT** — it cannot read, update, or delete rows. A unique index on the
  email means duplicate signups are handled gracefully (treated as "already on
  the list") instead of creating duplicates.
- The publishable key in `config.js` is designed to be public; it's safe to
  commit. The **secret** service key is never used in the browser and is not in
  this repo.

### Viewing signups

Open the Supabase dashboard → **Table editor → `waitlist`**, or **SQL editor**:

```sql
select name, email, goal, source, created_at
from waitlist
order by created_at desc;
```

To export, use the Table editor's CSV export.

## Running locally

Because the page uses `fetch`, open it through a tiny web server (not `file://`):

```bash
# Python 3
python3 -m http.server 8080
# then visit http://localhost:8080
```

## Deploying

**Netlify (drag & drop):** drop this folder onto <https://app.netlify.com/drop>.

**Any git-based host:** point it at this repo; publish directory is the repo
root (`.`). No build command needed.

## Roadmap ideas (not built yet)

- Real coach onboarding + profiles for additional marketplace coaches
- Payments / subscriptions (e.g. Stripe)
- Member dashboard, plan delivery, and check-ins
- Automated welcome email on signup (e.g. Supabase Edge Function + Resend)
