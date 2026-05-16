# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Brand Identity Generator is an AI-powered web app that creates complete brand identities using Google's Gemini and Imagen APIs. Users input a company mission and optionally provide existing assets, and the app generates logos, color palettes, typography recommendations, and exportable brand documents.

## Development Commands

```bash
npm install        # Install dependencies
npm run dev        # Start dev server on port 3000
npm run build      # Production build to dist/
npm run preview    # Preview production build
```

## Environment Setup

**Security Model (Production-Ready)**

The app follows a "Bring Your Own Key" (BYOK) + safe dev fallback model:

- **Production builds**: No API key is ever baked into the client bundle (Vite `define` only injects keys in `development` mode).
- Users provide their Gemini key via the in-app "Set API Key" button (stored only in memory).
- **Local development**: You may place `GEMINI_API_KEY` in `.env` (or `.env.local`). It will be available only during `npm run dev`.
- Copy `.env.example` to `.env` and add your key for local work.

A runtime security guard + console warnings prevent accidental key leakage in production bundles.

For hosted/SaaS deployments with a shared key, implement a lightweight serverless proxy (Phase 1b of the production plan).

## Architecture

### Entry Point Flow
- `index.html` → `index.tsx` → `App.tsx` (wrapped in `LanguageProvider`)

### Core Services
**`services/geminiService.ts`** - All AI interactions:
- `generateBrandIdentity()` - Creates full brand from mission (Persona 1: Complete Beginner)
- `buildIdentityFromLogo()` - Builds identity from existing logo (Persona 2: Semi-Prepared)
- `generateMarketingAssets()` - Creates business cards, letterheads, social posts (Persona 3: Prepared Professional)
- `rebrandLogoAndBuildIdentity()` - Modernizes existing logo (Persona 4: Rebrander)
- `translateBrandIdentity()` - Bilingual translation with optional font adaptation
- `generatePrimaryLogo()` / `regenerateLogoAndConcepts()` - Logo image generation via Imagen
- `initializeChat()` - Chat session for assistant

Uses `withRetry()` wrapper for transient API error handling with exponential backoff.

### State Management
**`LanguageContext.tsx`** - React Context for i18n:
- Manages `lang` ('en' | 'ar'), sets document direction (RTL/LTR)
- Dynamically loads Google Fonts (Tajawal for Arabic, Inter for English)
- `t()` function with interpolation support

**`i18n.ts`** - Translation strings for English and Arabic

### Type Definitions (`types.ts`)
- `BrandIdentity` - Core brand data (companyName, logo, colorPalette, fontPairings, logoConcepts)
- `BrandAssets` - Generated marketing materials (business card, letterhead, social post URLs)
- `ChatMessage` / `ChatSession` - Chatbot types

### Components
- **`BrandBible.tsx`** - Main results display with logo, colors, typography, concepts
- **`DocumentTemplates.tsx`** - DOCX/PPTX generation and preview using `docx`, `pptxgenjs`, `jszip`
- **`ChatBot.tsx`** - AI assistant sidebar
- **`BrandAssets.tsx`** - Marketing asset display
- **`icons.tsx`** - SVG icon components

### AI Models Used
- `gemini-2.5-flash` - Text generation (brand identity, translations, asset prompts)
- `gemini-3-pro-image-preview` - Image generation (logos, marketing materials)

### Key Patterns
- Structured output via JSON schema (`brandIdentitySchema`) for reliable parsing
- Base64 image handling for logo uploads and generated images
- RTL support throughout UI and exported documents
