CREATE TABLE comment (
  id             INTEGER PRIMARY KEY,
  requirement_id INTEGER NOT NULL REFERENCES requirement(id),
  body           TEXT NOT NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_comment_requirement ON comment(requirement_id);
