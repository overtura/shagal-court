export const SERVER_LIMITS = {
  requestBytes: 8_192,
  casesPerHour: 5,
  votesPerHour: 60,
  reportsPerHour: 10,
  casesPerDay: 500,
  votesPerDay: 10_000,
  reportsPerDay: 2_000,
  reportHideThreshold: 3,
  cleanupBatchSize: 100,
  maximumCaseTtlDays: 90,
} as const;
