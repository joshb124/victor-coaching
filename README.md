# Repwave — creator coaching marketplace (pre-launch site)

Static two-page marketing site for **Repwave**, a marketplace where TikTok
fitness influencers become gym coaches for their followers ("OnlyFans for gym
coaching"). Nothing is functional yet except signup capture:

- **`/` (index.html)** — the Repwave platform page. Influencers apply to become
  founding coaches (**real** signups → Supabase `coach_applications`); fans can
  browse the roster, which currently has one live coach.
- **`/victor` (victor.html)** — creator profile page for **Vice Wave** (Victor,
  @vicewave), the first coach. Fans join his waitlist (**real** signups →
  Supabase `waitlist`).

No build step: plain HTML + CSS + vanilla JS. Deployed on Vercel
(`vercel.json` provides clean URLs + security headers). Dark & premium theme —
near-black with a single volt (#ccff00) accent.

## Project structure

```
index.html                  # Repwave platform landing
victor.html                 # Vice Wave creator page (served at /victor)
favicon.svg
robots.txt
vercel.json                 # cleanUrls + security headers
assets/
  css/styles.css            # shared theme, both pages
  js/config.js              # ← brand, socials, creator data, Supabase keys
  js/main.js                # shared: config injection + form submission
  img/og-image.svg          # index social-share image
  img/og-image-victor.svg   # victor page social-share image
```

## Editing content

Most tweakables live in **`assets/js/config.js`** (`window.RW_CONFIG`):

- Platform `brand` + `tagline` (rename "Repwave" here — pages use `data-brand`)
- Platform `social` links; leave `""` to hide
- `creators.victor` — his display name, handle, niche, socials and stat row
- `supabase` connection + table names

Copy, headlines, feature cards and FAQ are plain text in the two HTML files.

## How signups work

Both forms insert straight into Supabase from the browser (PostgREST).

- **Project:** `vicewave-coaching` (`xloognwmenzhgokiykrw`)
- **Tables:**
  - `public.waitlist` — fan waitlist (id, name, email, goal, source,
    user_agent, created_at)
  - `public.coach_applications` — influencer applications (id, name, email,
    tiktok_handle, instagram_handle, follower_bracket, niche, pitch, source,
    user_agent, created_at)
- **Security:** Row Level Security on both tables; the public key can only
  **INSERT** — it cannot read, update or delete. Unique index on
  `lower(email)` per table → duplicate signups return 409, which the client
  treats as "you're already in."
- The publishable key in `config.js` is designed to be public and safe to
  commit. The secret service key is never used in the browser and is not in
  this repo.
- Both forms have a honeypot field (`company`) to silently drop bots.

### Viewing signups

Supabase dashboard → **Table editor**, or SQL editor:

```sql
-- Fan waitlist
select name, email, goal, source, created_at
from waitlist order by created_at desc;

-- Coach applications
select name, email, tiktok_handle, follower_bracket, niche, pitch, created_at
from coach_applications order by created_at desc;
```

## Running locally

Serve over HTTP (fetch won't run from `file://`):

```bash
python3 -m http.server 8080
# http://localhost:8080  and  http://localhost:8080/victor.html
```

(Locally the clean URL `/victor` won't resolve — that's Vercel's `cleanUrls`;
use `/victor.html`.)

## Deploying

Vercel project `vicewave-coaching` — deploy the repo root; no build command.

## Roadmap (marketed on-site, not built)

- Fans: creator-built plans, calorie/macro tracking, meal plans, progress
  tracking, coach DMs, weekly video check-ins, exclusive content feed,
  community & challenges, wearable sync, live group workouts
- Coaches: dashboard, pricing control, template/AI-assisted programming at
  scale, analytics & earnings, content monetization, instant payouts,
  audience-import funnels, verified badge
- Platform: payments/subscriptions (Stripe), coach vetting, mobile apps,
  ratings & reviews
