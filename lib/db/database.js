const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      telegram_id TEXT UNIQUE,
      username TEXT,
      is_authorized INTEGER DEFAULT 0,
      role TEXT DEFAULT 'user'
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_telegram_id TEXT,
      phone_number TEXT,
      scheduled_time TEXT,
      status TEXT,
      error TEXT,
      recording_url TEXT
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS states (
      user_telegram_id TEXT PRIMARY KEY,
      state TEXT,
      data TEXT
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS survey_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      call_id INTEGER,
      step INTEGER,
      key TEXT,
      answer TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS user_languages (
      telegram_id TEXT PRIMARY KEY,
      lang TEXT
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS surveys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      lang TEXT,
      questions TEXT -- JSON array
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS rate_limits (
      telegram_id TEXT PRIMARY KEY,
      last_call INTEGER
    )
  `);
});

module.exports = {
  addUser: (telegram_id, username, is_authorized = 0) => {
    db.run(
      `INSERT OR IGNORE INTO users (telegram_id, username, is_authorized) VALUES (?, ?, ?)`,
      [telegram_id, username, is_authorized]
    );
  },
  authorizeUser: (telegram_id) => {
    db.run(`UPDATE users SET is_authorized=1 WHERE telegram_id=?`, [telegram_id]);
  },
  isUserAuthorized: (telegram_id) =>
    new Promise((resolve) => {
      db.get(`SELECT is_authorized FROM users WHERE telegram_id=?`, [telegram_id], (err, row) => {
        resolve(row && row.is_authorized === 1);
      });
    }),
  getUserRole: (telegram_id) =>
    new Promise((resolve) => {
      db.get(`SELECT role FROM users WHERE telegram_id=?`, [telegram_id], (err, row) => {
        resolve(row ? row.role : 'user');
      });
    }),
  setUserRole: (telegram_id, role) =>
    db.run(`UPDATE users SET role=? WHERE telegram_id=?`, [role, telegram_id]),
  getAllUsers: (cb) => {
    db.all(`SELECT * FROM users`, [], (err, rows) => cb(rows || []));
  },
  setState: (telegram_id, state, data = {}) =>
    db.run(
      `INSERT INTO states (user_telegram_id, state, data) VALUES (?, ?, ?)
       ON CONFLICT(user_telegram_id) DO UPDATE SET state=excluded.state, data=excluded.data`,
      [telegram_id, state, JSON.stringify(data)]
    ),
  getState: (telegram_id) =>
    new Promise((resolve) => {
      db.get(`SELECT state, data FROM states WHERE user_telegram_id=?`, [telegram_id], (err, row) => {
        resolve(row ? { state: row.state, data: JSON.parse(row.data || '{}') } : { state: null, data: {} });
      });
    }),
  clearState: (telegram_id) =>
    db.run(`DELETE FROM states WHERE user_telegram_id=?`, [telegram_id]),
  logCall: (user_telegram_id, phone_number, scheduled_time, status, error) =>
    new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO calls (user_telegram_id, phone_number, scheduled_time, status, error) VALUES (?, ?, ?, ?, ?)`,
        [user_telegram_id, phone_number, scheduled_time, status, error],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    }),
  updateCallStatus: (callId, status, error = null, recording_url = null) =>
    new Promise((resolve, reject) => {
      db.run(
        `UPDATE calls SET status=?, error=?, recording_url=? WHERE id=?`,
        [status, error, recording_url, callId],
        function (err) {
          if (err) reject(err);
          else resolve();
        }
      );
    }),
  getUserCallHistory: (user_telegram_id, limit = 20) =>
    new Promise((resolve) => {
      db.all(
        `SELECT * FROM calls WHERE user_telegram_id=? ORDER BY id DESC LIMIT ?`,
        [user_telegram_id, limit],
        (err, rows) => resolve(rows || [])
      );
    }),
  getScheduledCalls: () =>
    new Promise((resolve) => {
      db.all(
        `SELECT * FROM calls WHERE status='scheduled' AND scheduled_time <= datetime('now')`,
        [],
        (err, rows) => resolve(rows || [])
      );
    }),
  markCallCompleted: (callId) =>
    db.run(`UPDATE calls SET status='completed' WHERE id=?`, [callId]),
  storeSurveyAnswer: (callId, step, key, answer) =>
    new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO survey_answers (call_id, step, key, answer) VALUES (?, ?, ?, ?)`,
        [callId, step, key, answer],
        function (err) {
          if (err) reject(err);
          else resolve();
        }
      );
    }),
  storeSurveyAnswers: (telegram_id, surveyId, answers) =>
    new Promise((resolve, reject) => {
      // Store all answers for a survey (for text-based surveys)
      // You can expand this as needed
      resolve();
    }),
  finalizeSurvey: (callId, surveyQuestions) =>
    new Promise((resolve, reject) => {
      resolve();
    }),
  getSurveySummary: (callId) =>
    new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM survey_answers WHERE call_id=? ORDER BY step ASC`,
        [callId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    }),
  getAllSurveyResults: () =>
    new Promise((resolve) => {
      db.all(`SELECT * FROM survey_answers`, [], (err, rows) => resolve(rows || []));
    }),
  getSurveyStats: (key, cb) => {
    db.all(
      `SELECT answer, COUNT(*) as count FROM survey_answers WHERE key=? GROUP BY answer`,
      [key],
      (err, rows) => cb(rows || [])
    );
  },
  getUserLanguage: (telegram_id) =>
    new Promise((resolve) => {
      db.get(`SELECT lang FROM user_languages WHERE telegram_id=?`, [telegram_id], (err, row) => {
        resolve(row ? row.lang : null);
      });
    }),
  setUserLanguage: (telegram_id, lang) =>
    db.run(
      `INSERT INTO user_languages (telegram_id, lang) VALUES (?, ?)
       ON CONFLICT(telegram_id) DO UPDATE SET lang=excluded.lang`,
      [telegram_id, lang]
    ),
  createSurvey: (name, lang, questions) =>
    new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO surveys (name, lang, questions) VALUES (?, ?, ?)`,
        [name, lang, JSON.stringify(questions)],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    }),
  getSurveys: (lang) =>
    new Promise((resolve) => {
      db.all(
        `SELECT * FROM surveys WHERE lang=? OR lang='en'`,
        [lang],
        (err, rows) => resolve(rows || [])
      );
    }),
  getSurveyById: (id) =>
    new Promise((resolve) => {
      db.get(
        `SELECT * FROM surveys WHERE id=?`,
        [id],
        (err, row) => resolve(row ? { ...row, questions: JSON.parse(row.questions) } : null)
      );
    }),
  // Rate limiting
  getLastCallTime: (telegram_id) =>
    new Promise((resolve) => {
      db.get(`SELECT last_call FROM rate_limits WHERE telegram_id=?`, [telegram_id], (err, row) => {
        resolve(row ? row.last_call : 0);
      });
    }),
  setLastCallTime: (telegram_id, timestamp) =>
    db.run(
      `INSERT INTO rate_limits (telegram_id, last_call) VALUES (?, ?)
       ON CONFLICT(telegram_id) DO UPDATE SET last_call=excluded.last_call`,
      [telegram_id, timestamp]
    ),
};