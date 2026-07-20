# Browser Automation Fixes - TODO

## Fix 1: API Key Parsing (`src/config/keys.ts`)
- [x] Filter out empty/whitespace-only keys from `getKeys()`
- [x] Ensure `hasAnyKey` logic works correctly (empty keys no longer pass through)

## Fix 2: API Manager (`src/lib/api-manager.ts`) 
- [x] Fix Mistral API model ID (remove `mistral/` prefix for direct API)
- [x] Fix Mistral fallback model mapping (keep `mistral/` for OpenRouter only)
- [x] Improve logging (provider, model, status, errors)
- [x] Improve fallback handling with clear logging

## Fix 3: Render Deployment (`render.yaml`)
- [x] Fix Playwright browser installation configuration
- [x] Ensure browsers install during build on Render (added `npx playwright install chromium` to buildCommand)
- [x] Changed `PLAYWRIGHT_BROWSERS_PATH` from `0` to `/opt/render/project/.playwright`
- [x] Added `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=0` to ensure download

## Fix 4: Package.json (`package.json`)
- [x] Fixed `postinstall` script to install Playwright on Render AND local (not on Vercel)
- [x] Uses conditional check: installs on RENDER env or non-VERCEL env

## Verification
- [x] All code changes verified for correctness
- [x] No UI/route/database/auth changes made (constraints respected)
- [x] Backend-only fixes applied as specified

✅ **All fixes implemented. Ready for deployment.**
