# History, Family, and Me — Website

Landing page for **History, Family, and Me** — *"Courage, Strength, and Resilience from those who came before!"*

A fast, lightweight static site (plain HTML/CSS/JS — no build step, no dependencies).

## Project structure

```
history-family-and-me/
├── index.html      # Home page content and structure
├── styles.css      # Home page styling (heritage-inspired palette)
├── script.js       # Mobile nav, scroll reveal, footer year
├── lesson.html     # Lesson 1 dashboard (interactive kids' lesson)
├── lesson.css      # Lesson page styling (playful, kid-friendly)
├── lesson.js       # Lesson interactivity (progress, quiz, tree, confetti)
├── assets/         # Images / logo / downloadable packet (add here)
└── README.md
```

### The interactive lesson (`lesson.html`)

Linked from the "Lesson 1" banner in the home page's Resources section. It's a
self-contained, kid-and-family-friendly lesson dashboard featuring:

- **Progress tracking** with a star-points system (saved in the browser via
  `localStorage`, so progress persists between visits).
- **Read-aloud narration** of the story (uses the browser's built-in speech).
- **Build-your-own family tree** — type in names and watch the tree fill in.
- **A quiz** with instant, encouraging feedback and bonus stars.
- **A printable "Family Mission"** interview worksheet (the Print button prints
  just the worksheet).
- **A reward badge** with a confetti celebration when all activities are done.

To add more lessons, copy `lesson.html` as a starting point.

## View it locally

Just open `index.html` in a browser — that's it. For a proper local server
(recommended, so relative links behave like production):

```bash
# Python 3
python -m http.server 8000
# then open http://localhost:8000
```

## Content sections

1. **Hero** — business name, tagline, and intro paragraph from the poster.
2. **Featured Quote** — Elder Mark A. Bragg quote + context.
3. **The Power of Ancestral Connections** — the three research-backed benefits.
4. **Inspiring Words** — Dr. Marshall Duke research quote.
5. **Lessons & Resources** — placeholder for the lesson packet (see below).
6. **Start Your Journey** — closing call to action.

## To do when the lesson packet arrives

- Drop the packet PDF into `assets/` (e.g. `assets/lesson-packet.pdf`).
- In `index.html`, find the `is-coming` resource card and update the link:
  ```html
  <a class="link-arrow" href="assets/lesson-packet.pdf" download>Download the packet &rarr;</a>
  ```
  and remove the `Coming Soon` tag / `is-coming` class.

## Email list & admin portal

Backed by a real database — a Node/Express API on **Railway** with a **Postgres**
database. All signups are stored centrally, so the list is complete no matter
where or when people join.

- **Public signup:** the "Join Our Email List" section near the bottom of the
  home page posts to the API's `/api/subscribe` endpoint.
- **Admin portal:** `admin.html` (e.g. `https://<site>/admin.html`). The passcode
  you enter is the API's `ADMIN_TOKEN`. It shows the live subscriber list with
  stats, add/import/export CSV, copy-all-emails, and an "Email everyone" button
  that opens a pre-addressed BCC draft.
- **API code:** lives in `api/` (`server.js`, `package.json`) and is deployed to
  Railway. Endpoints:
  - `POST /api/subscribe` — public signup (validated, rate-limited, dedup).
  - `GET /api/subscribers` — admin only (Bearer `ADMIN_TOKEN`).
  - `POST /api/subscribers` — admin add.
  - `DELETE /api/subscribers/:email` — admin remove.
- **Config (Railway service variables):**
  - `DATABASE_URL` — Postgres connection (set automatically to the internal DB).
  - `ADMIN_TOKEN` — the admin portal passcode.
  - `ALLOWED_ORIGINS` — comma-separated site origins allowed to call the API.
- **API base URL** is set at the top of `script.js` and `admin.js`
  (`HFM_API`). Update it there if the Railway domain ever changes.
- **Redeploying the API:** from the `api/` folder, `railway up --service api`
  (with a Railway project token in `RAILWAY_TOKEN`).

## Customization quick reference

- **Colors & fonts:** edit the CSS variables at the top of `styles.css` (`:root`).
- **Photos:** heritage images live in `assets/` (`hero-heritage.jpg`,
  `generations.jpg`, `album.jpg`, plus `anna-family.jpg` for the My Story
  section). Swap any file (keep the same name) to change the visual — no code
  edits needed.
- **Contact info:** the footer of `index.html` holds the `mailto:` email
  (`historyfamilyandme@outlook.com`) and the `tel:` phone number
  (`(480) 283-4261`).
- **Logo:** a custom "tree of life" emblem lives at `assets/logo.svg` (used in the
  header, footer, and as the browser favicon). It's a scalable vector, so it stays
  crisp at any size — edit the colors there or swap the file to rebrand.

## Deploying

Any static host works. Easiest free options:

- **Netlify** or **Vercel** — drag-and-drop the folder, or connect a git repo.
- **Cloudflare Pages** or **GitHub Pages** — connect a repo and point at the root.

Then connect the `historyfamilyandme.com` domain in the host's dashboard.
