CREATE TABLE IF NOT EXISTS teachers (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  grade TEXT,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS student_classes (
  student_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  PRIMARY KEY (student_id, class_id)
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  filename TEXT,
  raw_text TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS knowledge_points (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  title TEXT NOT NULL,
  level TEXT NOT NULL,
  est_minutes INTEGER DEFAULT 30,
  order_index INTEGER DEFAULT 0,
  subject TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  date TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  knowledge_point_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  source TEXT NOT NULL DEFAULT 'manual',
  minutes INTEGER DEFAULT 30,
  subject TEXT DEFAULT '',
  time TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  knowledge_point_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  options TEXT,
  answer TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  task_id TEXT,
  student_answer TEXT,
  is_correct INTEGER,
  feedback TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS stress_logs (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  date TEXT NOT NULL,
  level TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL
);
