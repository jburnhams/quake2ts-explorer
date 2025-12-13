# Section 08: Advanced UI/UX

## Overview

Polish the user experience with professional-grade interface design, accessibility features, and comprehensive settings. This section ties together all previous sections with cohesive, intuitive UI and ensures the application is usable by all audiences.

**Complexity**: Medium
**Dependencies**: All previous sections (finalizes UX for all features)
**Estimated Scope**: Settings panel, keybinding editor, themes, responsive design, accessibility, i18n framework, onboarding

## Objectives

- Build comprehensive settings panel (graphics, audio, controls, accessibility)
- Implement keybinding editor with conflict detection
- Support theme customization (dark, light, custom themes)
- Create responsive layouts for mobile and tablet
- Add touch controls for mobile devices
- Enhance keyboard navigation and screen reader support
- Prepare localization framework (internationalization)
- Design welcome tour and onboarding experience
- Add context menus and tooltips throughout

## Current State

**Already Implemented**:
- Dark theme in `src/App.css`
- Resizable panels in `src/components/ResizablePanel.tsx`
- Some ARIA attributes for accessibility
- Keyboard navigation in file tree

**Missing**:
- Settings panel
- Keybinding customization
- Theme switcher
- Mobile responsiveness
- Touch controls
- Comprehensive accessibility
- Onboarding flow

## Tasks and Subtasks

### Task 1: Settings Panel

**Objective**: Centralized settings interface for all configuration options.

#### Subtasks

- [ ] **1.1**: Create `src/components/SettingsPanel.tsx`
  - Modal overlay (ESC to close)
  - Tabbed interface:
    - General
    - Graphics
    - Audio
    - Controls
    - Accessibility
    - Advanced
  - "Save" and "Reset to Defaults" buttons at bottom

- [ ] **1.2**: Implement General settings tab
  - Language selection (for future i18n)
  - Default mode on startup (browser / last used)
  - Auto-load default PAK (pak.pak)
  - Default file tree sort (name / type / size)
  - Confirm before close (if unsaved changes)

- [ ] **1.3**: Implement Graphics settings tab
  - Render quality preset (Low / Medium / High / Ultra)
  - Field of view slider (60-120 degrees)
  - VSync toggle
  - Anti-aliasing (None / FXAA / MSAA if supported)
  - Texture filtering (Nearest / Bilinear / Trilinear)
  - Anisotropic filtering (1x / 2x / 4x / 8x / 16x)
  - Resolution scale (50% - 200%)
  - Frame rate limit (30 / 60 / 120 / Unlimited)

- [ ] **1.4**: Implement Audio settings tab
  - Master volume slider
  - Sound effects volume
  - Music volume
  - Voice volume (if applicable)
  - Audio output device selector (if WebAudio supports)
  - 3D audio spatialization toggle
  - Audio quality (sample rate)

- [ ] **1.5**: Implement Controls settings tab
  - Mouse sensitivity slider (X and Y separately)
  - Invert mouse Y toggle
  - Keyboard layout selector (QWERTY / AZERTY / QWERTZ)
  - Gamepad support toggle
  - "Configure Keybindings" button (opens Task 2 editor)

- [ ] **1.6**: Implement Accessibility settings tab
  - High contrast mode
  - Large font size
  - Color blind mode (Deuteranopia, Protanopia, Tritanopia)
  - Reduce motion (disable animations)
  - Screen reader compatibility toggle
  - Subtitles/captions toggle (for future video content)
  - Keyboard-only mode (no mouse required)

- [ ] **1.7**: Implement Advanced settings tab
  - Developer mode (shows debug features from Section 04)
  - Verbose logging
  - Experimental features toggle
  - Cache size limits
  - Reset all data (clear localStorage/IndexedDB)

- [ ] **1.8**: Persist settings
  - Save to localStorage as JSON
  - Load on application start
  - Apply settings to respective systems (renderer, audio, input)

**File References**:
- Create: `src/components/SettingsPanel.tsx`
- Create: `src/components/SettingsPanel.css`
- Create: `src/components/settings/*.tsx` (one component per tab)
- Create: `src/services/settingsService.ts`
- Modify: All feature services to read settings

**Test Requirements**:
- Unit: `tests/unit/SettingsPanel.test.tsx`
  - Render each tab
  - Test input interactions
  - Test save/reset functionality
- Unit: `tests/unit/settingsService.test.ts`
  - Test persistence
  - Test default values
- Integration: `tests/integration/settings.integration.test.tsx`
  - Change setting, verify application behavior updates

---

### Task 2: Keybinding Editor

**Objective**: Allow users to customize all keyboard shortcuts with conflict detection.

#### Subtasks

- [ ] **2.1**: Create `src/components/KeybindingEditor.tsx`
  - Table view with columns:
    - Action (e.g., "Move Forward")
    - Primary Key (e.g., "W")
    - Secondary Key (optional alternative)
    - Conflict indicator (if duplicate)
  - Grouped by category (Movement, Combat, Interface, Camera)

- [ ] **2.2**: Implement keybinding capture
  - Click key cell to enter "capture mode"
  - Shows "Press any key..." message
  - Captures next key press
  - ESC cancels capture
  - Supports modifiers (Ctrl, Shift, Alt)

- [ ] **2.3**: Implement conflict detection
  - Scan all bindings for duplicates
  - Highlight conflicts in red
  - Show warning: "W is already bound to Move Forward"
  - Offer to swap bindings or clear conflicting binding

- [ ] **2.4**: Add preset layouts
  - Default (WASD + standard)
  - Classic (Arrow keys + Ctrl/Alt)
  - Left-handed
  - Custom (user-defined)
  - Quick-switch between presets

- [ ] **2.5**: Implement search and filter
  - Search by action name
  - Filter by category
  - Filter by unbound actions

- [ ] **2.6**: Add "Reset to Defaults" per category
  - Reset all bindings in category
  - Reset individual action
  - Reset entire keybinding config

**File References**:
- Create: `src/components/KeybindingEditor.tsx`
- Create: `src/components/KeybindingEditor.css`
- Create: `src/services/keybindingService.ts`
- Modify: `src/services/inputService.ts` (use custom bindings)
- Modify: `src/config/defaultBindings.ts` (extend with all actions)

**Test Requirements**:
- Unit: `tests/unit/KeybindingEditor.test.tsx`
  - Render binding table
  - Test key capture
  - Test conflict detection
- Unit: `tests/unit/keybindingService.test.ts`
  - Test binding storage
  - Test conflict resolution
- Integration: `tests/integration/keybinding.integration.test.tsx`
  - Rebind key, verify input works

---

### Task 3: Theme Customization

**Objective**: Support multiple themes and custom color schemes.

#### Subtasks

- [ ] **3.1**: Create theme system
  - Define theme structure in `src/types/theme.ts`:
    ```typescript
    interface Theme {
      id: string
      name: string
      colors: {
        primary: string
        secondary: string
        accent: string
        background: string
        surface: string
        text: string
        textSecondary: string
        border: string
        success: string
        warning: string
        error: string
      }
      isDark: boolean
    }
    ```

- [ ] **3.2**: Implement built-in themes
  - Create `src/themes/`:
    - `darkTheme.ts` (current theme)
    - `lightTheme.ts` (light variant)
    - `highContrastTheme.ts` (accessibility)
    - `dracula.ts`, `nord.ts`, etc. (popular themes)

- [ ] **3.3**: Create theme service
  - `src/services/themeService.ts`
  - `loadTheme(themeId: string): void`
  - Apply CSS custom properties:
    ```css
    :root {
      --color-primary: #1a1a2e;
      --color-accent: #e94560;
      /* ... */
    }
    ```
  - Update all components to use CSS variables

- [ ] **3.4**: Add theme selector UI
  - Dropdown in settings
  - Live preview (changes apply immediately)
  - Thumbnail preview for each theme

- [ ] **3.5**: Implement custom theme editor
  - Color picker for each theme color
  - Real-time preview
  - Save custom themes to localStorage
  - Export/import themes as JSON

- [ ] **3.6**: Add dark/light mode toggle
  - Quick-access button in toolbar
  - Keyboard shortcut (Ctrl+Shift+D)
  - Respects system preference (prefers-color-scheme)

**File References**:
- Create: `src/services/themeService.ts`
- Create: `src/themes/*.ts`
- Create: `src/types/theme.ts`
- Create: `src/components/ThemeSelector.tsx`
- Create: `src/components/CustomThemeEditor.tsx`
- Modify: `src/App.css` (use CSS variables)

**Test Requirements**:
- Unit: `tests/unit/themeService.test.ts`
  - Test theme loading
  - Test CSS variable application
- Unit: `tests/unit/ThemeSelector.test.tsx`
  - Render theme list
  - Test selection
- Integration: `tests/integration/theming.integration.test.tsx`
  - Switch theme, verify colors change

---

### Task 4: Responsive Design for Mobile/Tablet

**Objective**: Ensure application works on various screen sizes and devices.

#### Subtasks

- [ ] **4.1**: Implement responsive breakpoints
  - Mobile: < 768px
  - Tablet: 768px - 1024px
  - Desktop: > 1024px
  - Use CSS media queries

- [ ] **4.2**: Adapt layout for mobile
  - Single-panel view (no side panels visible by default)
  - Bottom drawer for file tree (swipe up to open)
  - Full-screen 3D viewer
  - Collapsible toolbar (hamburger menu)

- [ ] **4.3**: Adapt layout for tablet
  - Two-panel view (file tree + viewer, no metadata panel by default)
  - Bottom sheet for metadata
  - Landscape vs portrait handling

- [ ] **4.4**: Implement responsive components
  - Modify `ResizablePanel` to collapse on mobile
  - Adjust font sizes based on screen width
  - Responsive button sizes (larger touch targets on mobile)
  - Responsive table/lists (stack columns on mobile)

- [ ] **4.5**: Test on real devices
  - iOS (iPhone, iPad)
  - Android (phone, tablet)
  - Landscape and portrait orientations

**File References**:
- Modify: `src/App.css` (responsive breakpoints)
- Modify: `src/components/*.css` (responsive styles)
- Create: `src/hooks/useMediaQuery.ts` (responsive hook)

**Test Requirements**:
- Unit: `tests/unit/useMediaQuery.test.ts`
  - Mock window.matchMedia
  - Test breakpoint detection
- Integration: `tests/integration/responsive.integration.test.tsx`
  - Render at different viewport sizes
  - Verify layout adapts

---

### Task 5: Touch Controls for Mobile

**Objective**: Add touch-friendly controls for 3D navigation and gameplay.

#### Subtasks

- [ ] **5.1**: Implement touch camera controls
  - Single-finger drag: Rotate camera (look around)
  - Two-finger pinch: Zoom in/out
  - Two-finger drag: Pan camera (translate)

- [ ] **5.2**: Create virtual gamepad
  - Create `src/components/VirtualGamepad.tsx`
  - Left joystick: Movement (WASD equivalent)
  - Right joystick: Look (mouse equivalent)
  - Action buttons: Jump, Crouch, Attack, Use
  - Semi-transparent overlay
  - Configurable position and size

- [ ] **5.3**: Implement gesture controls
  - Double-tap: Jump
  - Swipe down: Crouch
  - Swipe up: Weapon switch menu (radial)
  - Long-press: Use item

- [ ] **5.4**: Add haptic feedback
  - Vibrate on button press (if supported)
  - Vibrate on damage, weapon fire
  - Use Vibration API

- [ ] **5.5**: Optimize touch performance
  - Reduce input latency
  - Use `touch-action: none` to prevent scroll
  - Throttle touch events

**File References**:
- Create: `src/components/VirtualGamepad.tsx`
- Create: `src/components/VirtualGamepad.css`
- Create: `src/services/touchInputService.ts`
- Modify: `src/services/inputService.ts` (integrate touch)

**Test Requirements**:
- Unit: `tests/unit/VirtualGamepad.test.tsx`
  - Render gamepad
  - Test touch event handling
- Unit: `tests/unit/touchInputService.test.ts`
  - Test gesture detection
  - Mock touch events

---

### Task 6: Enhanced Accessibility

**Objective**: Make application usable for users with disabilities.

#### Subtasks

- [ ] **6.1**: Implement full keyboard navigation
  - Tab through all interactive elements
  - Focus indicators visible
  - Skip to content link
  - Shortcuts for all major functions
  - Escape key closes modals/dialogs

- [ ] **6.2**: Add comprehensive ARIA attributes
  - `aria-label` for icon buttons
  - `aria-describedby` for tooltips
  - `aria-live` for status messages
  - `role` attributes for custom components
  - `aria-expanded` for collapsible elements

- [ ] **6.3**: Implement screen reader support
  - Announce route changes
  - Announce file selection
  - Announce errors and success messages
  - Describe 3D scene (text alternative)
  - Skip render-only content

- [ ] **6.4**: Ensure color contrast compliance
  - WCAG 2.1 AA minimum (4.5:1 for normal text)
  - AAA preferred (7:1)
  - Test with contrast checker
  - Avoid color-only information (use icons + color)

- [ ] **6.5**: Support browser zoom
  - Test at 200% zoom
  - Ensure layout doesn't break
  - Text remains readable
  - No horizontal scroll

- [ ] **6.6**: Add focus trap in modals
  - Focus stays within modal when open
  - Tab cycles through modal elements
  - Shift+Tab goes backward
  - Restore focus on modal close

**File References**:
- Modify: All component files (add ARIA)
- Create: `src/utils/accessibility.ts` (helper functions)
- Create: `src/components/SkipToContent.tsx`
- Modify: `src/App.css` (focus indicators, contrast)

**Test Requirements**:
- Unit: `tests/unit/accessibility.test.tsx`
  - Test keyboard navigation
  - Test ARIA attributes
- Automated: Use `jest-axe` for accessibility testing
- Manual: Test with screen reader (NVDA, JAWS, VoiceOver)

---

### Task 7: Onboarding and Help

**Objective**: Guide new users through application features.

#### Subtasks

- [ ] **7.1**: Create welcome modal
  - Shows on first launch
  - Brief introduction
  - "Load PAK files to begin" prompt
  - "Don't show again" checkbox

- [ ] **7.2**: Implement guided tour
  - Create `src/components/GuidedTour.tsx`
  - Step-by-step walkthrough:
    1. Load PAK files
    2. Browse file tree
    3. Preview assets
    4. Play map (if single-player mode available)
  - Highlight UI elements
  - "Next" / "Skip Tour" buttons

- [ ] **7.3**: Add contextual help tooltips
  - Hover over UI elements for explanations
  - Use `title` attribute or custom tooltip component
  - Keyboard shortcut hint badges (e.g., "ESC")

- [ ] **7.4**: Create help panel
  - "Help" button in toolbar
  - Shows keyboard shortcuts reference
  - Links to documentation
  - FAQ section

- [ ] **7.5**: Add in-app notifications
  - Toast messages for success/error/info
  - Non-intrusive (bottom-right corner)
  - Auto-dismiss after timeout
  - Action buttons (e.g., "Undo", "View Details")

**File References**:
- Create: `src/components/WelcomeModal.tsx`
- Create: `src/components/GuidedTour.tsx`
- Create: `src/components/HelpPanel.tsx`
- Create: `src/components/Toast.tsx`
- Create: `src/services/notificationService.ts`

**Test Requirements**:
- Unit: `tests/unit/GuidedTour.test.tsx`
  - Render tour steps
  - Test navigation
- Unit: `tests/unit/Toast.test.tsx`
  - Render notification
  - Test auto-dismiss

---

### Task 8: Internationalization (i18n) Framework

**Objective**: Prepare application for multi-language support.

#### Subtasks

- [ ] **8.1**: Set up i18n library
  - Install `react-i18next` or similar
  - Configure language detection
  - Set default language (English)

- [ ] **8.2**: Extract all UI strings
  - Replace hardcoded strings with translation keys
  - Example: `"Load PAK"` → `t('toolbar.loadPak')`
  - Create English translation file:
    - `src/locales/en/common.json`
    - `src/locales/en/settings.json`
    - etc.

- [ ] **8.3**: Implement language switcher
  - Dropdown in settings
  - Persist language choice
  - Apply immediately on change

- [ ] **8.4**: Support pluralization and formatting
  - Handle plural forms (e.g., "1 file" vs "2 files")
  - Date/time formatting
  - Number formatting

- [ ] **8.5**: Create translation contribution guide
  - Document translation process
  - Provide template files
  - Explain context for translators

- [ ] **8.6**: (Optional) Add initial translations
  - Spanish, French, German, Japanese, Chinese
  - Community contributions for others

**File References**:
- Install: `react-i18next`
- Create: `src/i18n/config.ts`
- Create: `src/locales/en/*.json`
- Modify: All components (use translation function)

**Test Requirements**:
- Unit: `tests/unit/i18n.test.ts`
  - Test translation loading
  - Test language switching
- Integration: `tests/integration/i18n.integration.test.tsx`
  - Switch language, verify UI updates

---

## Acceptance Criteria

Section 08 is complete when:

- ✅ Settings panel provides comprehensive configuration for all features
- ✅ Keybinding editor allows custom keyboard shortcuts with conflict detection
- ✅ User can switch themes (dark, light, high contrast) and create custom themes
- ✅ Application is fully responsive on mobile, tablet, and desktop
- ✅ Virtual gamepad enables gameplay on touch devices
- ✅ Keyboard navigation works throughout application
- ✅ WCAG 2.1 AA accessibility compliance achieved
- ✅ Guided tour helps new users get started
- ✅ i18n framework is in place for future translations
- ✅ All code has 90%+ unit test coverage
- ✅ Accessibility tested with screen readers and automated tools

## Library Dependencies

**Required from quake2ts**:
- None (UI/UX layer is application-specific)

**Enhancements Needed**:
- None (this section is independent of library)

## Notes

- Section 08 depends on all previous sections (provides UI for all features)
- Must implement last or iteratively as features are added
- Accessibility is non-negotiable (legal compliance, inclusive design)
- Mobile support expands audience significantly
- i18n framework prepares for future growth (community translations)
- Settings persistence ensures user preferences carry across sessions
- Theming allows users to personalize experience
- Onboarding reduces friction for new users
