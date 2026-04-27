import 'reflect-metadata';

// TEST-07 — clear mock call history between tests so accidental
// cross-`it()` pollution is impossible. `clearAllMocks()` resets `.mock.calls`
// and `.mock.results` but leaves `mockResolvedValue` / `mockImplementation`
// configurations in place — so suite-level setup that runs in `beforeAll`
// remains valid across all `it()` blocks. The stricter `resetAllMocks()`
// would wipe those configurations and force every spec to re-stub in
// `beforeEach`, which would break a number of current specs that set up
// behavior once at the suite level.
afterEach(() => {
  jest.clearAllMocks();
});
