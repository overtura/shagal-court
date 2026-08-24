const CASES_PER_DAY = 500;

export const SERVER_LIMITS = {
  requestBytes: 8_192,
  casesPerHour: 5,
  votesPerHour: 60,
  reportsPerHour: 10,
  casesPerDay: CASES_PER_DAY,
  votesPerDay: 10_000,
  reportsPerDay: 2_000,
  cleanupBatchSize: CASES_PER_DAY * 2,
  maximumCaseTtlDays: 90,
} as const;
