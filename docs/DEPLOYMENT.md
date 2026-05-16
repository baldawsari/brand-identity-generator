# Deployment Guide — Brand Identity Generator

This guide helps you deploy the Brand Identity Generator to production.

## Current Status (April 2026)

The application has been significantly hardened for production use:

- ✅ Security: Bring-Your-Own-Key (BYOK) model + no API keys in production bundles
- ✅ Reliability: Typed errors + smart retry + Error Boundary
- ✅ Code Quality: Strict TypeScript + ESLint + Prettier + Vitest tests
- ✅ Features: SVG export + Full Brand Kit ZIP download
- ✅ Performance: Code splitting for heavy components
- ✅ Styling: Tailwind CSS v4 properly integrated via Vite plugin

---

## 1. Prerequisites

- Node.js 20+
- A Gemini API key (optional — users can provide their own via the UI)

## 2. Local Production Build Test

```bash
npm install --legacy-peer-deps
npm run build
npm run preview
```

The build should succeed and the UI should look correct.

## 3. Recommended Deployment: Vercel (Easiest & Best)

> **Note:** This project already includes helpful deployment configuration files:
> - `vercel.json` — Optimized for Vercel
> - `netlify.toml` — For Netlify
> - `wrangler.toml` — For Cloudflare Pages + Wrangler

Vercel is strongly recommended because:

Vercel is strongly recommended because:
- Excellent support for Vite
- Easy environment variables
- Free tier is generous
- Easy to add a secure Gemini proxy later using Edge Functions

### Quick Deploy Steps

1. Push your code to GitHub.
2. Go to [Vercel](https://vercel.com) → **Add New Project**.
3. Import your repository.
4. Vercel should auto-detect Vite. If it asks for a build command, use:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. (Optional) Add `GEMINI_API_KEY` as an Environment Variable if you want a default key for all users.
6. Deploy.

We have included a `vercel.json` in the project root with sensible defaults (including legacy peer deps install command).

### Environment Variables

| Name                | Required? | Description |
|---------------------|-----------|-----------|
| `GEMINI_API_KEY`    | No        | Default key (users can still use their own) |

## 4. Other Platforms

### Netlify

Netlify has excellent Vite support.

**Quick steps:**
1. Connect your GitHub repo on Netlify.
2. Use these build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
3. (Recommended) Add a `netlify.toml` file (already included in this project) for SPA fallback and better caching.

We’ve included a `netlify.toml` in the root with sensible defaults.

### Cloudflare Pages

Cloudflare offers great performance and generous free tier.

**Recommended approach:**
- Use **Cloudflare Pages** for the frontend.
- The included `wrangler.toml` helps with local development and advanced configuration.

**Quick steps:**
1. Connect your repository in the Cloudflare dashboard.
2. Set the build command to `npm run build`.
3. Set the output directory to `dist`.
4. For a future secure proxy, you can easily add **Pages Functions** or a separate Worker.

A `wrangler.toml` is included in the project for convenience.

## 5. Security Best Practices

- **Never** commit a real Gemini API key to Git.
- The app is designed around **Bring Your Own Key (BYOK)**. This is the safest default.
- If you want to offer the tool without users needing an API key, implement a lightweight proxy (see the internal production plan for Phase 1b).

## 6. Attribution (Recommended)

A footer with basic attribution is already included in the app:

> Brand identities are generated using **Gemini** by Google. Results may vary. Always review AI-generated assets before use.

This is good practice for Gemini-powered tools.

## 7. Going Further (Real Hosted Product)

To turn this into a fully hosted product where users don't need their own Gemini key:

1. Create a small Edge Function / Serverless Function that holds your API key.
2. Proxy all `geminiService` calls through it.
3. Add rate limiting, abuse protection, and usage tracking.

This is the natural next step after the current architecture.

---

**Need help?** Refer to the main project files or the internal production plan for more context.
