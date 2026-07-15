PRAGMA foreign_keys = ON;

CREATE TABLE cases (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  public_statement TEXT NOT NULL CHECK (length(public_statement) BETWEEN 1 AND 180),
  category TEXT NOT NULL,
  analysis_json TEXT NOT NULL,
  verdict_code TEXT NOT NULL,
  verdict_score INTEGER NOT NULL CHECK (verdict_score BETWEEN 0 AND 100),
  verdict_json TEXT NOT NULL,
  engine_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden')),
  guilty_votes INTEGER NOT NULL DEFAULT 0 CHECK (guilty_votes >= 0),
  not_guilty_votes INTEGER NOT NULL DEFAULT 0 CHECK (not_guilty_votes >= 0),
  report_count INTEGER NOT NULL DEFAULT 0 CHECK (report_count >= 0),
  creator_hash TEXT NOT NULL,
  idempotency_hash TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE votes (
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  voter_hash TEXT NOT NULL,
  choice TEXT NOT NULL CHECK (choice IN ('guilty', 'not-guilty')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (case_id, voter_hash)
);

CREATE TABLE reports (
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  reporter_hash TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('personal-info', 'threat', 'hate', 'spam', 'other')),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (case_id, reporter_hash)
);

CREATE TABLE rate_limits (
  rate_key TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1 CHECK (count >= 0),
  window_start INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE daily_usage (
  usage_day TEXT PRIMARY KEY,
  cases_created INTEGER NOT NULL DEFAULT 0 CHECK (cases_created >= 0),
  votes_cast INTEGER NOT NULL DEFAULT 0 CHECK (votes_cast >= 0),
  reports_created INTEGER NOT NULL DEFAULT 0 CHECK (reports_created >= 0)
);

CREATE INDEX idx_cases_public_lookup ON cases(slug, status, expires_at);
CREATE INDEX idx_cases_cleanup ON cases(expires_at, id);
CREATE INDEX idx_cases_created ON cases(created_at DESC);
CREATE INDEX idx_votes_case ON votes(case_id);
CREATE INDEX idx_reports_case ON reports(case_id);
CREATE INDEX idx_rate_limits_cleanup ON rate_limits(expires_at);
