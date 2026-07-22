# Keryva — From Scripture to Service

AI-assisted Bible reading, sermon preparation, study guides, prayer journal, Sunday planning, and church content — built as an installable PWA (works on desktop and mobile, works offline for cached content).

## What you need before you start

- Node.js 18+ and npm installed on your machine
- A GitHub account (to host the repo Vercel deploys from)
- A Vercel account (free tier is enough)
- At least one AI provider API key — you don't need all four, but you need at least one for generation features to work:
  - `GEMINI_API_KEY` — https://aistudio.google.com/app/apikey (used as primary for sermons, study guides, Sunday Packs, devotionals — free tier available)
  - `GROQ_API_KEY` — https://console.groq.com/keys (used as primary for quick verse explanations, translations, the Ministry Assistant's intent routing — free tier available)
  - `ANTHROPIC_API_KEY` — https://console.anthropic.com (optional fallback)
  - `OPENROUTER_API_KEY` — https://openrouter.ai/keys (optional fallback)

No Bible API key is needed — scripture text and verification use the free public bible-api.com endpoint.

## 1. Run it locally first (recommended before deploying)

```bash
npm install
npm run dev
```

Opens at `http://localhost:3000`. AI features won't work locally unless you also create a `.env.local` file in the project root:

```
GEMINI_API_KEY=your_actual_key_here
GROQ_API_KEY=your_actual_key_here
```

(Only needed for local testing — in production these live in Vercel's environment variables, not in a file, so `.env.local` should never be committed. It's already covered by `.gitignore`.)

## 2. Push to GitHub

From inside the project folder:

```bash
git init
git add .
git commit -m "Initial commit — Keryva v1.1.0"
```

Then create a new empty repository on GitHub (github.com/new — do **not** initialize it with a README, .gitignore, or license, since this project already has its own), then:

```bash
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
git branch -M main
git push -u origin main
```

## 3. Deploy to Vercel

Easiest path — through the Vercel dashboard:

1. Go to https://vercel.com/new
2. Import the GitHub repository you just pushed
3. Vercel will auto-detect this as a Vite project (framework preset: Vite, build command: `npm run build`, output directory: `dist` — already pinned explicitly in `vercel.json` too, so auto-detection isn't load-bearing)
4. **Before clicking Deploy**, add your environment variables — in the Vercel project setup screen, or afterward under **Settings → Environment Variables**:
   - `GEMINI_API_KEY`
   - `GROQ_API_KEY`
   - `ANTHROPIC_API_KEY` (optional)
   - `OPENROUTER_API_KEY` (optional)

   Add each for all three environments (Production, Preview, Development) unless you specifically want different keys per environment.
5. Click **Deploy**.

Or, via the Vercel CLI instead of the dashboard:

```bash
npm install -g vercel
vercel login
vercel
```

Follow the prompts (link to a new project, accept the detected settings). Then add your keys:

```bash
vercel env add GEMINI_API_KEY production
vercel env add GROQ_API_KEY production
```

(Repeat for `preview` and `development` if you want them there too, and for the two optional keys if you're using them.) Then deploy for real:

```bash
vercel --prod
```

## 4. After deploying

- Open the live URL Vercel gives you, on your phone and on a desktop Chrome/Edge browser
- Go to **Settings → Install App** — this now includes a live diagnostics panel that checks every real installability requirement and tells you exactly what's failing if the install prompt doesn't appear, instead of guessing
- Go to **Settings → About** to confirm the version number matches what you expect (`v1.1.0` as shipped) — bump `src/lib/version.js` on every future change so this stays meaningful

## Project structure, briefly

- `src/pages/` — every screen (Home, Bible Reader, Sermon Studio, Ministry Assistant, etc.)
- `src/lib/AppContext.jsx` — all shared app state (user, saved content, theme, usage limits, confirmation dialogs)
- `src/lib/translations.js` — all 6 supported languages (English, French, Spanish, Yoruba, Igbo, Nigerian Pidgin)
- `api/ai.js` — serverless function that holds your AI provider keys server-side and routes requests (fast tasks → Groq first, long-form → Gemini first)
- `api/mcp.js` — a separate, stateless MCP server exposing a narrow set of ministry tools to MCP-compatible AI clients (Claude, etc.) — deliberately excludes prayer data and has no save/delete capability yet
- `public/manifest.json` + `public/icons/` — PWA install configuration

## Known limitations, stated plainly

- The MCP server (`/api/mcp`) has been verified by code review for protocol correctness, not against a live MCP client — flag it if something doesn't handshake correctly
- No user accounts yet — everything is stored in the browser (localStorage/IndexedDB). Use Settings → Privacy → Download my data periodically as backup
- Non-English Bible verse *text* still comes from the selected translation (KJV/ASV/WEB) regardless of UI language — only AI-generated commentary/sermons/prayers switch language, since no free API offers real Yoruba/Igbo/Pidgin scripture text
