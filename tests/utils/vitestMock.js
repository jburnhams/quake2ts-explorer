// Mock for vitest to allow quake2ts/test-utils to be used in Jest
module.exports = {
  vi: {
    fn: (impl) => jest.fn(impl),
    spyOn: (obj, prop) => jest.spyOn(obj, prop),
    mocked: (item) => item,
    // Add other vitest methods as needed by test-utils
  },
  // If test-utils uses other vitest exports directly
  expect: global.expect,
  describe: global.describe,
  it: global.it,
  test: global.test,
  beforeEach: global.beforeEach,
  afterEach: global.afterEach,
  beforeAll: global.beforeAll,
  afterAll: global.afterAll,
};
