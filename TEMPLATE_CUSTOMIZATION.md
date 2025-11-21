# Template Customization Guide

This guide helps you customize this template for your new project.

## Quick Start Checklist

When creating a new project from this template, follow these steps:

### 1. Update Project Information

- [ ] Update `package.json`:
  ```json
  {
    "name": "your-project-name",
    "version": "0.1.0",
    "description": "Your project description",
    "author": "Your Name",
    "repository": {
      "type": "git",
      "url": "https://github.com/yourusername/your-project"
    }
  }
  ```

- [ ] Update `index.html`:
  ```html
  <title>Your Project Name</title>
  ```

- [ ] Update `LICENSE` with your name/organization and year

### 2. Set Up Environment Variables

- [ ] Copy `.env.example` to `.env.local`
- [ ] Add your environment-specific variables
- [ ] Update `.env.example` with any new variables your project needs

### 3. Remove/Update Example Code

The template includes example components to demonstrate the testing setup. Once you understand the patterns, remove them:

```bash
# Remove example components
rm src/components/Button.tsx
rm src/services/calculator.ts
rm src/hooks/useCounter.ts

# Remove example tests
rm tests/Button.test.tsx
rm tests/calculator.test.ts
rm tests/useCounter.test.ts

# Keep the integration test and update it for your app
```

Then update `src/App.tsx` with your own component.

### 4. Customize Styling

- [ ] Update `src/index.css` with your design system
- [ ] Consider adding a CSS framework (Tailwind, styled-components, etc.)
- [ ] Add your brand colors, fonts, and spacing

### 5. Configure CI/CD

- [ ] Review `.github/workflows/node.js.yml`
- [ ] Update branch names if not using `main`
- [ ] Add deployment steps if needed
- [ ] Configure secrets in GitHub repository settings

### 6. Update Documentation

- [ ] Update `README.md` with your project details
- [ ] Remove template-specific sections
- [ ] Add your project's specific setup instructions
- [ ] Document any additional dependencies or scripts

### 7. Add Your Features

Now you're ready to build! The template provides:

- ✅ React 19 + TypeScript
- ✅ Vite for fast development
- ✅ Jest + React Testing Library
- ✅ Integration tests for browser environment
- ✅ CI/CD with GitHub Actions
- ✅ Path aliases (`@/`)
- ✅ Coverage reporting

## Common Customizations

### Adding ESLint and Prettier

```bash
npm install --save-dev eslint prettier eslint-config-prettier @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

Create `.eslintrc.json` and `.prettierrc` configuration files.

### Adding React Router

```bash
npm install react-router-dom
npm install --save-dev @types/react-router-dom
```

### Adding State Management

```bash
# Redux Toolkit
npm install @reduxjs/toolkit react-redux

# Or Zustand (lighter alternative)
npm install zustand

# Or Jotai (atom-based)
npm install jotai
```

### Adding UI Component Library

```bash
# Material-UI
npm install @mui/material @emotion/react @emotion/styled

# Or Chakra UI
npm install @chakra-ui/react @emotion/react @emotion/styled framer-motion

# Or Radix UI (headless)
npm install @radix-ui/react-*
```

### Adding API Client

```bash
# Axios
npm install axios

# Or React Query (recommended)
npm install @tanstack/react-query
```

### Adding CSS Framework

```bash
# Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Adding Form Handling

```bash
# React Hook Form
npm install react-hook-form

# With validation
npm install zod @hookform/resolvers
```

## Testing Configuration

### Adjusting Coverage Thresholds

Edit `jest.config.js`:

```javascript
coverageThreshold: {
  global: {
    lines: 75,      // Adjust as needed
    functions: 80,
    branches: 65,
    statements: 75,
  },
},
```

### Adding E2E Tests

The template uses jsdom for integration tests. For full E2E testing:

```bash
# Playwright (recommended)
npm install --save-dev @playwright/test
npx playwright install

# Or Cypress
npm install --save-dev cypress
npx cypress open
```

## Build Configuration

### Environment-Specific Builds

Create multiple env files:
- `.env.development` - Development variables
- `.env.production` - Production variables
- `.env.local` - Local overrides (gitignored)

### Optimizing Bundle Size

1. Use dynamic imports for code splitting:
```typescript
const Component = lazy(() => import('./Component'));
```

2. Analyze bundle with:
```bash
npm install --save-dev rollup-plugin-visualizer
```

Add to `vite.config.ts`:
```typescript
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [react(), visualizer()],
});
```

## Deployment

### Vercel

```bash
npm install -g vercel
vercel
```

### Netlify

```bash
npm install -g netlify-cli
netlify deploy
```

### GitHub Pages

Update `vite.config.ts`:
```typescript
export default defineConfig({
  base: '/your-repo-name/',
  // ... rest of config
});
```

Add to `package.json`:
```json
{
  "scripts": {
    "deploy": "npm run build && gh-pages -d dist"
  }
}
```

### Docker

Create `Dockerfile`:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

## Maintenance

### Keeping Dependencies Updated

```bash
# Check for updates
npm outdated

# Update dependencies
npm update

# Or use npm-check-updates
npx npm-check-updates -u
npm install
```

### Regular Tasks

- [ ] Update Node.js version in `.node-version` and CI
- [ ] Review and update dependencies quarterly
- [ ] Keep coverage thresholds realistic
- [ ] Update documentation as project evolves

## Getting Help

- **Template Issues**: Check the template repository
- **Vite**: https://vitejs.dev/
- **React**: https://react.dev/
- **Jest**: https://jestjs.io/
- **Testing Library**: https://testing-library.com/

## Best Practices

1. **Keep the Template Clean**: Don't add project-specific code to the template
2. **Test Before Removing**: Make sure you understand the example tests before removing them
3. **Maintain Test Coverage**: Keep the coverage thresholds as you build
4. **Document Changes**: Update README as you customize
5. **Use Git**: Commit early and often as you customize

## Example Projects

Here are examples of projects built from this template:
- (Add your examples here)

---

Happy building! 🚀
