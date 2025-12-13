# Section 11: Testing & Quality Assurance

## Overview

Achieve comprehensive test coverage across all features with unit tests, integration tests, end-to-end tests, performance benchmarks, and cross-browser compatibility testing. Ensure application quality, reliability, and maintainability.

**Complexity**: High (comprehensive testing for all features)
**Dependencies**: All previous sections (tests everything)
**Estimated Scope**: Unit tests (90%+ coverage), integration tests, E2E tests, visual regression, accessibility testing, performance benchmarks

## Objectives

- Achieve 90%+ unit test coverage for all new code
- Write integration tests for all Common Integration Patterns
- Implement end-to-end tests for critical user journeys
- Create performance benchmarks (load time, FPS, memory)
- Test cross-browser compatibility (Chrome, Firefox, Safari, Edge)
- Test on mobile browsers (iOS Safari, Chrome Android)
- Implement automated visual regression tests
- Run accessibility automated testing (WCAG 2.1 AA compliance)
- Set up continuous testing in CI/CD pipeline

## Current State

**Already Implemented**:
- Unit test infrastructure (Jest + React Testing Library)
- 35+ unit tests for existing components
- 5+ integration tests
- Test utilities in `tests/utils/`
- GitHub Actions workflow for tests

**Missing**:
- Tests for all new features (Sections 01-09)
- End-to-end tests
- Visual regression tests
- Performance benchmarks
- Cross-browser testing
- Mobile testing
- Accessibility testing

## Tasks and Subtasks

### Task 1: Comprehensive Unit Test Coverage

**Objective**: Achieve 90%+ unit test coverage for all application code.

#### Subtasks

- [ ] **1.1**: Audit current coverage
  - Run `npm run test:coverage`
  - Identify uncovered files and functions
  - Create coverage report (HTML and lcov)

- [ ] **1.2**: Write missing unit tests for services
  - All services from Sections 01-09:
    - `gameService.ts`
    - `networkService.ts`
    - `predictionService.ts`
    - `demoRecorder.ts`
    - `modDetectionService.ts`
    - `entityEditorService.ts`
    - `settingsService.ts`
    - `cacheService.ts`
    - `performanceMonitorService.ts`
  - Mock all external dependencies (library, localStorage, IndexedDB, WebSocket)
  - Test all public methods
  - Test error handling

- [ ] **1.3**: Write missing unit tests for components
  - All new components from Sections 01-09:
    - `GameHUD.tsx`
    - `ServerBrowser.tsx`
    - `DemoTimeline.tsx`
    - `PerformanceStats.tsx`
    - `TextureAtlas.tsx`
    - `EntityPropertyEditor.tsx`
    - `ModBrowser.tsx`
    - `SettingsPanel.tsx`
    - `VirtualGamepad.tsx`
  - Test rendering with various props
  - Test user interactions (click, input, drag)
  - Test conditional rendering
  - Test accessibility (ARIA attributes)

- [ ] **1.4**: Write missing unit tests for utilities
  - `cameraUtils.ts`, `transformUtils.ts`, etc.
  - Test mathematical functions with edge cases
  - Test parsing functions
  - Test formatters and validators

- [ ] **1.5**: Write missing unit tests for hooks
  - `useGameState.ts`, `useMediaQuery.ts`, etc.
  - Use `@testing-library/react-hooks`
  - Test state updates
  - Test side effects

- [ ] **1.6**: Configure coverage thresholds
  - Update `jest.config.js`:
    ```javascript
    coverageThreshold: {
      global: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90
      }
    }
    ```
  - Fail CI if coverage drops below threshold

**File References**:
- Create: `tests/unit/**/*.test.ts(x)` for all uncovered files
- Modify: `jest.config.js` (coverage thresholds)

**Test Requirements**:
- All services: 90%+ coverage
- All components: 90%+ coverage
- All utilities: 95%+ coverage
- All hooks: 90%+ coverage

---

### Task 2: Integration Tests for Common Integration Patterns

**Objective**: Verify all 5 Common Integration Patterns work end-to-end.

#### Subtasks

- [ ] **2.1**: Write integration test for Pattern 1 (PAK Browser)
  - Load real PAK file (pak.pak)
  - Verify file tree populated
  - Verify file count matches PAK directory
  - Verify metadata displayed correctly
  - Test file selection and preview

- [ ] **2.2**: Write integration test for Pattern 2 (Map Viewer)
  - Load PAK with map (e.g., base1.bsp)
  - Verify map renders
  - Verify camera controls work
  - Verify entity picking works
  - Verify metadata correct

- [ ] **2.3**: Write integration test for Pattern 3 (Demo Playback)
  - Load demo file
  - Verify playback starts
  - Verify frame count correct
  - Verify seek works
  - Verify pause/resume works

- [ ] **2.4**: Write integration test for Pattern 4 (Single Player)
  - Load map
  - Start game mode
  - Verify game simulation runs
  - Verify player spawns
  - Verify input generates movement
  - Verify HUD updates

- [ ] **2.5**: Write integration test for Pattern 5 (Multiplayer)
  - Mock WebSocket server
  - Connect client
  - Verify handshake
  - Send snapshots, verify rendering
  - Send commands, verify sent to server
  - Disconnect, verify cleanup

- [ ] **2.6**: Write integration test for full workflow
  - Load PAK → Browse → Select map → Play → Save → Load
  - Verifies end-to-end user journey

**File References**:
- Create: `tests/integration/pattern01-pakBrowser.integration.test.tsx`
- Create: `tests/integration/pattern02-mapViewer.integration.test.tsx`
- Create: `tests/integration/pattern03-demoPlayback.integration.test.tsx`
- Create: `tests/integration/pattern04-singlePlayer.integration.test.tsx`
- Create: `tests/integration/pattern05-multiplayer.integration.test.tsx`
- Create: `tests/integration/fullWorkflow.integration.test.tsx`

**Test Requirements**:
- All 5 patterns have passing integration tests
- Tests use real PAK/demo files (test fixtures)
- Tests cover happy path and common errors

---

### Task 3: End-to-End Tests for Critical User Journeys

**Objective**: Test complete user flows in real browser environment.

#### Subtasks

- [ ] **3.1**: Set up E2E testing framework
  - Choose: Playwright or Cypress
  - Configure for project
  - Add to CI/CD pipeline

- [ ] **3.2**: Write E2E test: First-time user journey
  - Open application
  - See welcome modal
  - Click to dismiss
  - Open file picker
  - Load PAK file
  - See file tree populate
  - Click file
  - See preview

- [ ] **3.3**: Write E2E test: Play single-player map
  - Load PAK
  - Select BSP file
  - Click "Play Map"
  - Enter game mode
  - Verify player spawns
  - Press WASD, verify movement
  - Press ESC, open menu
  - Return to browser

- [ ] **3.4**: Write E2E test: Join multiplayer server
  - Open multiplayer
  - Browse servers
  - Select server
  - Connect
  - Join lobby
  - Select team
  - Mark ready
  - Enter game

- [ ] **3.5**: Write E2E test: Edit map entities
  - Load map
  - Enter edit mode
  - Select entity
  - Move entity with gizmo
  - Edit properties
  - Save changes
  - Export ENT file

- [ ] **3.6**: Write E2E test: Install and activate mod
  - Load mod PAK
  - Open mod browser
  - Select mod
  - Click activate
  - Verify mod loaded
  - Play map with mod
  - Verify custom content

**File References**:
- Install: Playwright or Cypress
- Create: `tests/e2e/*.spec.ts`
- Configure: `playwright.config.ts` or `cypress.config.ts`

**Test Requirements**:
- All critical paths have E2E tests
- Tests run in CI on each commit
- Tests pass in headless mode

---

### Task 4: Performance Benchmarks

**Objective**: Measure and track performance metrics over time.

#### Subtasks

- [ ] **4.1**: Define benchmark suite
  - Load time (initial page load)
  - PAK parsing time (1MB, 10MB, 100MB PAKs)
  - Map load time (small, medium, large maps)
  - Render performance (FPS in game mode)
  - Memory usage (peak and average)
  - Search/filter performance (file tree with 10,000 items)

- [ ] **4.2**: Implement benchmark tests
  - Create `tests/benchmarks/loadTime.bench.ts`
  - Create `tests/benchmarks/pakParsing.bench.ts`
  - Create `tests/benchmarks/mapLoading.bench.ts`
  - Create `tests/benchmarks/rendering.bench.ts`
  - Use `benchmark.js` or similar library

- [ ] **4.3**: Set up performance baseline
  - Run benchmarks on clean main branch
  - Record baseline metrics
  - Store in repository (perf-baseline.json)

- [ ] **4.4**: Add performance regression detection
  - Run benchmarks in CI
  - Compare to baseline
  - Fail if regression > 10% slower
  - Post results as PR comment

- [ ] **4.5**: Create performance dashboard
  - Track metrics over time
  - Visualize trends (line graphs)
  - Identify performance improvements/regressions
  - Use GitHub Actions artifacts or external service

**File References**:
- Create: `tests/benchmarks/*.bench.ts`
- Create: `.github/workflows/performance.yml`
- Create: `perf-baseline.json`

**Test Requirements**:
- Benchmarks run successfully
- Baseline established
- Regression detection catches slowdowns

---

### Task 5: Cross-Browser Compatibility Testing

**Objective**: Ensure application works on all major browsers.

#### Subtasks

- [ ] **5.1**: Define target browsers
  - Chrome (latest 2 versions)
  - Firefox (latest 2 versions)
  - Safari (latest 2 versions)
  - Edge (latest 2 versions)
  - iOS Safari (latest 2 versions)
  - Chrome Android (latest version)

- [ ] **5.2**: Set up cross-browser testing
  - Use BrowserStack or local VMs
  - Configure Playwright for multi-browser testing

- [ ] **5.3**: Run E2E tests on all browsers
  - Execute full E2E suite on each browser
  - Identify browser-specific issues
  - Fix compatibility issues

- [ ] **5.4**: Test WebGL compatibility
  - Verify WebGL2 support detection
  - Test fallback for unsupported browsers
  - Test across different GPUs

- [ ] **5.5**: Test Web Audio compatibility
  - Verify audio playback on all browsers
  - Test spatial audio (3D positioning)

- [ ] **5.6**: Document browser support
  - Update README with browser requirements
  - List known issues per browser
  - Provide workarounds if available

**File References**:
- Modify: `playwright.config.ts` (multi-browser)
- Create: `docs/browser-support.md`

**Test Requirements**:
- E2E tests pass on all target browsers
- Critical features work on all browsers
- Fallbacks in place for unsupported features

---

### Task 6: Mobile Browser Testing

**Objective**: Verify application works on mobile devices.

#### Subtasks

- [ ] **6.1**: Test on iOS Safari
  - iPhone (latest 2 models)
  - iPad
  - Test touch controls
  - Test virtual gamepad
  - Test responsive layout

- [ ] **6.2**: Test on Chrome Android
  - Test on multiple Android versions (11+)
  - Test touch controls
  - Test performance

- [ ] **6.3**: Identify mobile-specific issues
  - Touch event handling
  - Viewport meta tags
  - Performance on low-end devices
  - Memory constraints

- [ ] **6.4**: Fix mobile issues
  - Optimize touch responsiveness
  - Reduce memory usage
  - Improve loading times

- [ ] **6.5**: Add mobile-specific E2E tests
  - Test virtual gamepad
  - Test gesture controls
  - Test responsive breakpoints

**File References**:
- Modify: `tests/e2e/*.spec.ts` (mobile viewport)
- Create: `tests/e2e/mobile.spec.ts`

**Test Requirements**:
- Application loads on mobile
- Touch controls work
- Performance acceptable (30+ FPS)

---

### Task 7: Visual Regression Testing

**Objective**: Detect unintended visual changes.

#### Subtasks

- [ ] **7.1**: Set up visual testing framework
  - Use Percy, Chromatic, or BackstopJS
  - Integrate with CI/CD

- [ ] **7.2**: Create baseline screenshots
  - Screenshot all major UI states:
    - Empty state (no PAK loaded)
    - File browser with PAK loaded
    - Asset preview (image, model, map)
    - Game mode
    - Settings panel
    - Mod browser
  - Store in repository or service

- [ ] **7.3**: Add visual regression tests to CI
  - Run on each PR
  - Compare to baseline
  - Flag visual changes for review
  - Require approval if changes detected

- [ ] **7.4**: Handle intentional visual changes
  - Update baseline when design changes
  - Document reason for visual change
  - Require explicit approval

**File References**:
- Install: Percy, Chromatic, or BackstopJS
- Configure: `.percy.yml`, `chromatic.config.js`, or `backstop.json`
- Create: `tests/visual/*.spec.ts`

**Test Requirements**:
- Baseline screenshots captured
- Visual regression tests run in CI
- False positives minimized (stable screenshots)

---

### Task 8: Accessibility Testing

**Objective**: Ensure WCAG 2.1 AA compliance.

#### Subtasks

- [ ] **8.1**: Set up automated accessibility testing
  - Use `jest-axe` for unit tests
  - Use `@axe-core/playwright` for E2E tests
  - Run on all components and pages

- [ ] **8.2**: Add axe checks to unit tests
  - Test all components for accessibility violations
  - Example:
    ```typescript
    const { container } = render(<Component />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
    ```

- [ ] **8.3**: Add axe checks to E2E tests
  - Test all pages in E2E flows
  - Fail tests if violations detected

- [ ] **8.4**: Manual accessibility testing
  - Test keyboard navigation (Tab, Enter, Escape)
  - Test screen reader (NVDA, JAWS, VoiceOver)
  - Test color contrast (use tool like Contrast Checker)
  - Test with screen zoom (200%)

- [ ] **8.5**: Fix accessibility issues
  - Add missing ARIA labels
  - Fix focus order
  - Improve color contrast
  - Add skip links

- [ ] **8.6**: Document accessibility features
  - Create `docs/accessibility.md`
  - List supported features
  - Known limitations
  - How to report issues

**File References**:
- Install: `jest-axe`, `@axe-core/playwright`
- Modify: All component tests (add axe checks)
- Create: `docs/accessibility.md`

**Test Requirements**:
- All components pass axe checks
- Manual testing with screen reader successful
- WCAG 2.1 AA compliance achieved

---

### Task 9: Continuous Testing in CI/CD

**Objective**: Automate all testing in continuous integration.

#### Subtasks

- [ ] **9.1**: Configure GitHub Actions workflows
  - `.github/workflows/test.yml` - Unit and integration tests
  - `.github/workflows/e2e.yml` - E2E tests
  - `.github/workflows/performance.yml` - Benchmarks
  - `.github/workflows/accessibility.yml` - Accessibility checks

- [ ] **9.2**: Set up test matrix
  - Run on multiple Node versions (18, 20, 22)
  - Run on multiple OSes (Ubuntu, Windows, macOS)
  - Run on multiple browsers (Chrome, Firefox, Safari)

- [ ] **9.3**: Add test caching
  - Cache node_modules
  - Cache test build artifacts
  - Speed up CI runs

- [ ] **9.4**: Add test reporting
  - Generate test reports (JUnit XML)
  - Upload coverage to Codecov or Coveralls
  - Post results as PR comments

- [ ] **9.5**: Require tests to pass
  - Set branch protection rules
  - Require all tests pass before merge
  - Require coverage threshold met

**File References**:
- Create: `.github/workflows/*.yml`
- Modify: GitHub repository settings (branch protection)

**Test Requirements**:
- All tests run automatically on PR
- Results visible in PR checks
- Cannot merge if tests fail

---

## Acceptance Criteria

Section 11 is complete when:

- ✅ 90%+ unit test coverage achieved across all code
- ✅ Integration tests verify all 5 Common Integration Patterns
- ✅ E2E tests cover all critical user journeys
- ✅ Performance benchmarks established and tracked
- ✅ Application tested on Chrome, Firefox, Safari, Edge (desktop and mobile)
- ✅ Visual regression tests catch unintended UI changes
- ✅ Accessibility tests confirm WCAG 2.1 AA compliance
- ✅ All tests run automatically in CI/CD pipeline
- ✅ Test failures block merging

## Library Dependencies

**Required from quake2ts**:
- None (testing is application-layer)

**Enhancements Needed**:
- None (but library should also have comprehensive tests)

## Notes

- Testing is not optional - it's a quality gate
- Write tests as you implement features (test-driven development)
- 90% coverage is minimum - strive for higher
- Integration tests catch integration bugs that unit tests miss
- E2E tests catch real user issues
- Performance benchmarks prevent regressions
- Cross-browser testing is essential (browsers have quirks)
- Accessibility testing is legal requirement in many jurisdictions
- Visual regression tests catch CSS bugs
- Automated testing in CI prevents bad merges
- Good test suite gives confidence to refactor and improve
