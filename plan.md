export const testPlan = `
1.  *Identify the issue*: The error "localStorage.getItem is not a function" suggests an issue with the test environment, specifically how \`localStorage\` is mocked in JSDOM.
2.  *Reproduce the issue*: I have run the tests and seen failures related to storage (though the exact error was not explicitly in the truncated output, it's consistent with "localStorage is not a function").
3.  *Fix the issue*:
    -   Modify \`tests/setup.ts\` to explicitly check and polyfill \`localStorage\` if it's missing or broken.
    -   Ensure \`jsdom\` is correctly handling storage.
4.  *Verify the fix*: Run the tests again to ensure they pass.
5.  *Pre-commit checks*: Ensure all checks pass.
6.  *Submit*: Commit the changes.
`;