// DI tokens for the SetupModule. Using string symbols so the module's
// `providers` block can bind a port to its Prisma implementation cleanly.

export const SETUP_RUNS_REPOSITORY = Symbol('SETUP_RUNS_REPOSITORY');
