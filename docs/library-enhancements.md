# Library Enhancements & Fixes

## Bug Reports

### Missing Dependency in `@quake2ts/client`
- **Issue**: The `@quake2ts/client` package imports from `@quake2ts/cgame` in its ESM distribution (`dist/esm/index.js`), but `@quake2ts/cgame` is not present in the installed `node_modules` structure, causing runtime and test failures when importing `@quake2ts/client`.
- **Location**: `node_modules/@quake2ts/client/dist/esm/index.js`
- **Error**: `Error: Cannot find package '@quake2ts/cgame' imported from ...`
- **Recommendation**: Ensure `@quake2ts/cgame` is listed as a regular `dependency` (not dev) in `@quake2ts/client`'s `package.json`, or ensure it is published and installed correctly.

## Feature Requests
(None at this time)
