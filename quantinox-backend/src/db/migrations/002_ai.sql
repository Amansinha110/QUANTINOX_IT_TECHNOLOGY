-- Questions visitors ask Quanta AI (contact details removed before saving), for the AI insights page.
-- matched = how many website passages answered it (0 = a content gap). Kept 180 days.
CREATE TABLE assistant_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL,
  page TEXT,
  lang TEXT NOT NULL DEFAULT 'en',
  mode TEXT NOT NULL DEFAULT 'guide' CHECK (mode IN ('guide', 'ai')),
  intent TEXT,
  matched INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_assistant_questions_created ON assistant_questions (created_at);

-- Saved AI insight reports (themes, content gaps, FAQ ideas)
CREATE TABLE ai_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  body TEXT NOT NULL,
  admin_id INTEGER,
  created_at TEXT NOT NULL
);
