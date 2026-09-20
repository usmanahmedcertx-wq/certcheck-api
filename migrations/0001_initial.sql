-- CertCheck: audits, their requirements, and the organisations that own them.
CREATE TABLE org (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE audit (
  id     INTEGER PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES org(id),
  title  TEXT NOT NULL
);

CREATE TABLE requirement (
  id       INTEGER PRIMARY KEY,
  audit_id INTEGER NOT NULL REFERENCES audit(id),
  clause   TEXT NOT NULL,
  text     TEXT NOT NULL,
  status   TEXT NOT NULL DEFAULT 'unknown',
  note     TEXT
);

CREATE INDEX idx_requirement_audit ON requirement(audit_id);

-- Feature flags. Act 5 fills this in; it exists from the start so that no
-- migration is needed halfway through the course.
CREATE TABLE flag (
  key        TEXT PRIMARY KEY,
  enabled    INTEGER NOT NULL DEFAULT 0,
  org_ids    TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
