# Section 12: Build & Deployment

## Overview

Prepare production-ready build with optimizations, Progressive Web App (PWA) support, offline functionality, deployment automation, analytics, and error tracking. Ensure application is fast, reliable, and observable in production.

**Complexity**: Low (configuration and tooling)
**Dependencies**: All previous sections (deploys complete application)
**Estimated Scope**: Production build, PWA setup, offline support, deployment scripts, analytics, error tracking, CI/CD

## Objectives

- Create optimized production build (code splitting, minification, compression)
- Configure Progressive Web App (PWA) with service worker and manifest
- Implement offline functionality (cached assets, offline-first strategy)
- Set up deployment scripts for various platforms (Netlify, Vercel, GitHub Pages)
- Integrate privacy-respecting analytics (Plausible, Fathom, or Umami)
- Add error tracking and monitoring (Sentry or similar)
- Enhance CI/CD pipeline for automated deployment
- Optionally containerize with Docker

## Current State

**Already Implemented**:
- Vite build configuration
- GitHub Actions for tests (Section 11)
- Basic production build (`npm run build`)

**Missing**:
- Build optimizations
- PWA configuration
- Offline support
- Deployment automation
- Analytics
- Error tracking
- Docker setup

## Tasks and Subtasks

### Task 1: Optimized Production Build

**Objective**: Create fast, small, cacheable production bundles.

#### Subtasks

- [ ] **1.1**: Configure code splitting
  - Modify `vite.config.ts`
  - Split by route/mode (from Section 09)
  - Split vendor code (React, Three.js, etc.)
  - Set `manualChunks` for optimal splits

- [ ] **1.2**: Enable minification and compression
  - Terser for JavaScript minification (enabled by default)
  - CSS minification
  - HTML minification
  - Gzip and Brotli compression

- [ ] **1.3**: Optimize assets
  - Compress images (icons, logos)
  - Generate multiple sizes for responsive images
  - Use WebP where supported (with fallback)
  - Optimize SVGs (remove metadata)

- [ ] **1.4**: Configure cache busting
  - Content hash in filenames (`[name].[contenthash].js`)
  - Set cache headers (long-term cache for hashed files)

- [ ] **1.5**: Generate source maps
  - Enable for production (but don't upload to CDN)
  - Upload to error tracking service (Sentry)
  - Helps debugging production errors

- [ ] **1.6**: Analyze bundle size
  - Use `vite-plugin-visualizer` or `rollup-plugin-visualizer`
  - Generate bundle size report
  - Identify large dependencies
  - Set budget: Total bundle < 1MB (excluding PAK files)

**File References**:
- Modify: `vite.config.ts`
- Install: `vite-plugin-visualizer`, `vite-plugin-compression`

**Test Requirements**:
- Build succeeds without errors
- Bundle size within budget
- All assets load correctly

---

### Task 2: Progressive Web App (PWA) Setup

**Objective**: Make application installable and work offline.

#### Subtasks

- [ ] **2.1**: Create web app manifest
  - Create `public/manifest.json`:
    ```json
    {
      "name": "Quake2TS Explorer",
      "short_name": "Q2Explorer",
      "description": "Web-based Quake II PAK browser and game client",
      "start_url": "/",
      "display": "standalone",
      "background_color": "#1a1a2e",
      "theme_color": "#e94560",
      "icons": [
        {
          "src": "/icons/icon-192.png",
          "sizes": "192x192",
          "type": "image/png"
        },
        {
          "src": "/icons/icon-512.png",
          "sizes": "512x512",
          "type": "image/png"
        },
        {
          "src": "/icons/icon-maskable-512.png",
          "sizes": "512x512",
          "type": "image/png",
          "purpose": "maskable"
        }
      ]
    }
    ```

- [ ] **2.2**: Create app icons
  - Generate icons at multiple sizes (192x192, 512x512)
  - Create maskable icon (safe area for Android)
  - Use favicon generator tool

- [ ] **2.3**: Add manifest to HTML
  - Update `index.html`:
    ```html
    <link rel="manifest" href="/manifest.json">
    <meta name="theme-color" content="#e94560">
    ```

- [ ] **2.4**: Implement service worker
  - Use Vite PWA plugin: `vite-plugin-pwa`
  - Configure caching strategies:
    - Cache-first for app shell (HTML, CSS, JS)
    - Network-first for API calls
    - Cache-then-network for assets

- [ ] **2.5**: Add install prompt
  - Detect if app installable
  - Show custom install button (browser's default is often hidden)
  - Handle `beforeinstallprompt` event

- [ ] **2.6**: Test PWA compliance
  - Use Lighthouse PWA audit
  - All checks should pass
  - Test installation on Android and iOS

**File References**:
- Create: `public/manifest.json`
- Create: `public/icons/*.png`
- Install: `vite-plugin-pwa`
- Modify: `vite.config.ts` (PWA plugin config)
- Modify: `index.html` (manifest link)

**Test Requirements**:
- Lighthouse PWA score 100
- App installable on mobile
- Icons display correctly

---

### Task 3: Offline Functionality

**Objective**: Application works without internet connection.

#### Subtasks

- [ ] **3.1**: Define offline strategy
  - App shell cached (always available)
  - User's PAK files cached (if loaded before)
  - User preferences cached (localStorage)
  - Network features disabled (multiplayer, server browser)

- [ ] **3.2**: Configure service worker caching
  - Pre-cache app shell on install
  - Cache PAK files on first load (using IndexedDB, from Section 09)
  - Cache asset metadata
  - Set cache expiration policies

- [ ] **3.3**: Implement offline indicator
  - Detect online/offline status (`navigator.onLine`)
  - Show banner: "You are offline. Some features unavailable."
  - Disable network-dependent features (gray out multiplayer button)

- [ ] **3.4**: Handle offline gracefully
  - Queue actions that require network (send when online)
  - Show helpful errors ("This feature requires internet")
  - Allow viewing previously loaded PAKs offline

- [ ] **3.5**: Add offline page
  - Custom offline page if network request fails
  - Show cached content and offline features
  - Retry button

- [ ] **3.6**: Test offline mode
  - Load app, go offline, verify still works
  - Load PAK online, go offline, verify PAK still accessible
  - Try network feature offline, verify helpful error

**File References**:
- Modify: `vite.config.ts` (service worker config)
- Create: `src/components/OfflineBanner.tsx`
- Create: `public/offline.html`

**Test Requirements**:
- App loads offline
- Previously loaded PAKs accessible offline
- Network features disabled gracefully

---

### Task 4: Deployment Scripts and Configuration

**Objective**: Automate deployment to various platforms.

#### Subtasks

- [ ] **4.1**: Create deployment script
  - Create `scripts/deploy.sh`
  - Build production bundle
  - Run tests
  - Deploy to platform
  - Post-deployment verification

- [ ] **4.2**: Configure Netlify deployment
  - Create `netlify.toml`:
    ```toml
    [build]
      command = "npm run build"
      publish = "dist"

    [[redirects]]
      from = "/*"
      to = "/index.html"
      status = 200

    [[headers]]
      for = "/*.js"
      [headers.values]
        Cache-Control = "public, max-age=31536000, immutable"
    ```
  - Set up environment variables
  - Configure build hooks

- [ ] **4.3**: Configure Vercel deployment
  - Create `vercel.json`:
    ```json
    {
      "buildCommand": "npm run build",
      "outputDirectory": "dist",
      "routes": [
        { "handle": "filesystem" },
        { "src": "/(.*)", "dest": "/index.html" }
      ]
    }
    ```

- [ ] **4.4**: Configure GitHub Pages deployment
  - Create `.github/workflows/deploy-gh-pages.yml`
  - Build on push to main
  - Deploy to gh-pages branch
  - Configure custom domain (if applicable)

- [ ] **4.5**: Configure custom CDN deployment
  - Script to upload to AWS S3 + CloudFront
  - Set cache headers
  - Invalidate CloudFront cache on deploy

- [ ] **4.6**: Add deploy preview for PRs
  - Netlify/Vercel deploy previews (automatic)
  - Or custom preview environment
  - Comment on PR with preview link

**File References**:
- Create: `netlify.toml`
- Create: `vercel.json`
- Create: `.github/workflows/deploy-gh-pages.yml`
- Create: `scripts/deploy.sh`

**Test Requirements**:
- Manual deployment succeeds
- Automatic deployment on push works
- Deploy previews work for PRs

---

### Task 5: Analytics Integration

**Objective**: Track usage without compromising user privacy.

#### Subtasks

- [ ] **5.1**: Choose privacy-respecting analytics
  - Options:
    - Plausible Analytics (no cookies, GDPR compliant)
    - Fathom Analytics (similar to Plausible)
    - Umami (self-hosted, open source)
  - Avoid Google Analytics (privacy concerns)

- [ ] **5.2**: Set up analytics account
  - Create account (or self-host Umami)
  - Get tracking script/snippet
  - Configure goals/events

- [ ] **5.3**: Integrate analytics
  - Add script to `index.html` or via React
  - Track page views (SPA routing)
  - Track custom events:
    - PAK loaded
    - Map played
    - Multiplayer connected
    - Mod activated
    - Error occurred

- [ ] **5.4**: Add privacy policy
  - Create `docs/privacy.md`
  - Explain data collection (minimal, anonymous)
  - Explain cookies (none or minimal)
  - Explain third-party services
  - Link from app footer

- [ ] **5.5**: Add opt-out mechanism
  - Settings toggle: "Send usage analytics"
  - Respect Do Not Track header
  - Disable analytics if user opts out

- [ ] **5.6**: Monitor analytics dashboard
  - Track user engagement
  - Identify popular features
  - Find drop-off points
  - Inform future development

**File References**:
- Modify: `index.html` or `src/main.tsx` (analytics script)
- Create: `src/services/analyticsService.ts`
- Create: `docs/privacy.md`
- Modify: `src/components/SettingsPanel.tsx` (analytics toggle)

**Test Requirements**:
- Events tracked correctly
- Opt-out works
- Privacy policy accurate

---

### Task 6: Error Tracking and Monitoring

**Objective**: Catch and diagnose production errors.

#### Subtasks

- [ ] **6.1**: Set up error tracking service
  - Choose: Sentry (recommended), Rollbar, or Bugsnag
  - Create account
  - Create project

- [ ] **6.2**: Install Sentry SDK
  - Install `@sentry/react` and `@sentry/vite-plugin`
  - Initialize in `src/main.tsx`:
    ```typescript
    import * as Sentry from '@sentry/react'

    Sentry.init({
      dsn: 'YOUR_SENTRY_DSN',
      environment: import.meta.env.MODE,
      integrations: [
        new Sentry.BrowserTracing(),
        new Sentry.Replay()
      ],
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0
    })
    ```

- [ ] **6.3**: Configure source map upload
  - Use Sentry Vite plugin to upload source maps
  - Helps debugging minified errors
  - Keep source maps private (don't serve to users)

- [ ] **6.4**: Add error boundaries
  - Wrap app in `<Sentry.ErrorBoundary>`
  - Fallback UI when error occurs
  - Log error to Sentry
  - Allow user to reload or report

- [ ] **6.5**: Add custom error context
  - Attach user context (anonymized ID, not PII)
  - Attach app state (loaded PAKs, current mode, settings)
  - Tag errors by feature (gameplay, multiplayer, editor)

- [ ] **6.6**: Set up alerts
  - Email/Slack notification on new errors
  - Alert on error spike (e.g., >10 errors/min)
  - Create issues in GitHub from Sentry

**File References**:
- Install: `@sentry/react`, `@sentry/vite-plugin`
- Modify: `src/main.tsx` (Sentry init)
- Modify: `vite.config.ts` (source map upload)
- Modify: `src/App.tsx` (error boundary)

**Test Requirements**:
- Test error reporting (trigger error, verify in Sentry)
- Verify source maps work (stack traces show original code)
- Test error boundary fallback UI

---

### Task 7: CI/CD Pipeline Enhancements

**Objective**: Automate build, test, and deploy workflow.

#### Subtasks

- [ ] **7.1**: Create unified CI/CD workflow
  - `.github/workflows/ci.yml`
  - On push/PR:
    1. Install dependencies
    2. Lint code
    3. Run unit tests
    4. Run integration tests
    5. Run E2E tests (if PR, not push)
    6. Build production bundle
    7. Deploy (if main branch)

- [ ] **7.2**: Add environment-specific builds
  - Development (source maps, verbose logging)
  - Staging (production-like, but test APIs)
  - Production (optimized, error tracking)

- [ ] **7.3**: Add automated release
  - Use `release-please` or `semantic-release`
  - Automatically create releases from commits
  - Generate changelog
  - Tag releases
  - Publish to npm (if library component)

- [ ] **7.4**: Add deploy gate
  - Require manual approval for production deploy
  - Or auto-deploy on tag (e.g., v1.0.0)
  - Run smoke tests post-deploy

- [ ] **7.5**: Add rollback mechanism
  - Keep previous version deployed
  - Script to revert to previous version
  - Or use platform's rollback (Netlify, Vercel)

**File References**:
- Modify: `.github/workflows/ci.yml`
- Create: `.github/workflows/release.yml`
- Configure: Release automation tool

**Test Requirements**:
- CI runs on all PRs
- Deployment succeeds automatically
- Rollback script works

---

### Task 8: Docker Containerization (Optional)

**Objective**: Package application in Docker container for consistent deployment.

#### Subtasks

- [ ] **8.1**: Create Dockerfile
  - Multi-stage build:
    1. Build stage (Node.js, npm, build)
    2. Serve stage (nginx, serve static files)
  - Example:
    ```dockerfile
    FROM node:20 AS builder
    WORKDIR /app
    COPY package*.json ./
    RUN npm ci
    COPY . .
    RUN npm run build

    FROM nginx:alpine
    COPY --from=builder /app/dist /usr/share/nginx/html
    COPY nginx.conf /etc/nginx/nginx.conf
    EXPOSE 80
    CMD ["nginx", "-g", "daemon off;"]
    ```

- [ ] **8.2**: Create nginx configuration
  - Serve static files
  - SPA routing (fallback to index.html)
  - Gzip compression
  - Cache headers

- [ ] **8.3**: Create docker-compose.yml
  - For local development
  - Include app service
  - Optional: Include mock API service

- [ ] **8.4**: Build and test Docker image
  - Build: `docker build -t quake2ts-explorer .`
  - Run: `docker run -p 8080:80 quake2ts-explorer`
  - Test in browser

- [ ] **8.5**: Publish to container registry
  - GitHub Container Registry (ghcr.io)
  - Docker Hub
  - AWS ECR
  - Automate with GitHub Actions

- [ ] **8.6**: Add Docker deployment instructions
  - Update README with Docker usage
  - Document environment variables
  - Provide docker-compose examples

**File References**:
- Create: `Dockerfile`
- Create: `nginx.conf`
- Create: `docker-compose.yml`
- Create: `.dockerignore`

**Test Requirements**:
- Docker build succeeds
- Container runs and serves app
- App works inside container

---

## Acceptance Criteria

Section 12 is complete when:

- ✅ Production build is optimized (bundle < 1MB, code split, minified)
- ✅ PWA configured with manifest, icons, and service worker
- ✅ Application works offline (app shell and cached PAKs)
- ✅ Deployment automated to at least one platform (Netlify/Vercel/GitHub Pages)
- ✅ Analytics integrated and respecting user privacy
- ✅ Error tracking configured (Sentry or similar)
- ✅ CI/CD pipeline builds, tests, and deploys automatically
- ✅ Docker containerization complete (optional)
- ✅ Lighthouse scores: Performance 90+, PWA 100, Accessibility 100
- ✅ Application live and accessible to users

## Library Dependencies

**Required from quake2ts**:
- None (deployment is application-specific)

**Enhancements Needed**:
- None

## Notes

- Deployment is final step - application must be complete and tested
- PWA makes application feel native (installable, offline)
- Privacy-respecting analytics better than no analytics
- Error tracking essential for production quality
- CI/CD saves time and prevents human error
- Docker optional but useful for reproducible deployments
- Lighthouse audits enforce quality standards
- Optimize for Core Web Vitals (LCP, FID, CLS)
- Monitor production metrics (uptime, errors, performance)
- Plan for scaling if application becomes popular
