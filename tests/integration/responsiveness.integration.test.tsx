import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { render } from '@testing-library/react';
import * as fs from 'fs';
import * as path from 'path';
import App from '@/src/App';

describe('App Responsiveness Integration Tests', () => {
  let indexCss: string;
  let appCss: string;

  beforeAll(() => {
    // Read the CSS files directly from the source
    indexCss = fs.readFileSync(path.resolve(__dirname, '../../src/index.css'), 'utf8');
    appCss = fs.readFileSync(path.resolve(__dirname, '../../src/App.css'), 'utf8');
  });

  afterAll(() => {
    // Clean up the head
    document.head.innerHTML = '';
  });

  it('application container should not be constrained by fixed max-width', () => {
    // Inject CSS into the document to simulate actual rendering
    // We inject App.css first, then index.css, mimicking the cascade in the real app
    // where index.css (imported in main.tsx) often overrides App.css (imported in App.tsx)
    // depending on import order. In main.tsx: import App; import './index.css';
    // The App component import triggers App.css import. Then index.css is imported.
    // So index.css styles come last in the head and override.

    const styleApp = document.createElement('style');
    styleApp.id = 'app-css';
    styleApp.textContent = appCss;
    document.head.appendChild(styleApp);

    const styleIndex = document.createElement('style');
    styleIndex.id = 'index-css';
    styleIndex.textContent = indexCss;
    document.head.appendChild(styleIndex);

    const { container } = render(<App />);
    const appElement = container.querySelector('.app');
    expect(appElement).toBeInTheDocument();

    const computedStyle = window.getComputedStyle(appElement!);

    // Verify that max-width is NOT set to a constrained value like 800px.
    // By default it should be 'none' or empty string in some environments.
    // If the bug is present, it will be '800px'.
    const maxWidth = computedStyle.maxWidth;
    expect(maxWidth === 'none' || maxWidth === '').toBe(true);

    // Also verify margins are not set to auto (which centers it) if we want full width
    // Though margins are less critical if width is 100%, but typically full width apps have 0 margin.
    // computedStyle.margin might return empty string or resolved values '0px'.
    // If 'margin: 0 auto' is set, computed values depend on window size.
  });

  it('main content should be flexible to fill available space', () => {
    // Ensure App.css styles are applied correctly for the flex layout
    const styleApp = document.createElement('style');
    styleApp.textContent = appCss;
    document.head.appendChild(styleApp);

    const { container } = render(<App />);
    const mainContent = container.querySelector('.main-content');
    expect(mainContent).toBeInTheDocument();

    const computedStyle = window.getComputedStyle(mainContent!);
    // flex: 1 expands the element
    // In computed styles, 'flex' shorthand might be split into flex-grow, flex-shrink, flex-basis
    // 'flex: 1' usually means '1 1 0%'
    expect(computedStyle.flexGrow).toBe('1');
  });
});
