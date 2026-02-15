-- ============================================
-- 飲み会幹事アプリ D1 スキーマ
-- ============================================

-- 幹事テーブル（Googleアカウント認証）
CREATE TABLE IF NOT EXISTS organizers (
  id TEXT PRIMARY KEY,
  google_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  paypay_link TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- イベントテーブル
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  organizer_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date TEXT NOT NULL,
  venue_name TEXT,
  venue_address TEXT,
  venue_url TEXT,
  budget_per_person INTEGER,
  total_amount INTEGER,
  status TEXT NOT NULL DEFAULT 'draft',
  paypay_link TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (organizer_id) REFERENCES organizers(id) ON DELETE CASCADE
);

-- 参加者テーブル
-- role: boss(上司) / senior(先輩) / member(一般) / junior(後輩) / student(学生) / free(無料招待)
CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  name TEXT NOT NULL,
  attendance TEXT NOT NULL DEFAULT 'pending',
  role TEXT NOT NULL DEFAULT 'member',
  gender TEXT,
  assigned_amount INTEGER,
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- 割り勘ルールテーブル
CREATE TABLE IF NOT EXISTS split_rules (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  rounding TEXT NOT NULL DEFAULT 'ceil_100',
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- 傾斜配分比率テーブル
CREATE TABLE IF NOT EXISTS split_ratios (
  id TEXT PRIMARY KEY,
  split_rule_id TEXT NOT NULL,
  role TEXT NOT NULL,
  gender TEXT,
  ratio REAL NOT NULL DEFAULT 1.0,
  FOREIGN KEY (split_rule_id) REFERENCES split_rules(id) ON DELETE CASCADE
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_participants_event ON participants(event_id);
CREATE INDEX IF NOT EXISTS idx_participants_attendance ON participants(event_id, attendance);
CREATE INDEX IF NOT EXISTS idx_split_ratios_rule ON split_ratios(split_rule_id);
