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
      is_authorized INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_telegram_id TEXT,
      phone_number TEXT,
      scheduled_time DATETIME,
      status TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      error TEXT
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
    CREATE TABLE IF NOT EXISTS survey_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      call_id INTEGER,
      step INTEGER,
      key TEXT,
      answer TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS survey_final (
      call_id INTEGER PRIMARY KEY,
      user_telegram_id TEXT,
      summary TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

module.exports = {
  // --- User management ---
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
      db.get(
        `SELECT is_authorized FROM users WHERE telegram_id=?`,
        [telegram_id],
        (err, row) => {
          if (err || !row) return resolve(false);
          resolve(row.is_authorized === 1);
        }
      );
    }),
  getAllUsers: (cb) => {
    db.all(`SELECT * FROM users`, [], (err, rows) => {
      cb(rows || []);
    });
  },
  // --- State management ---
  setState: (telegram_id, state, data = {}) =>
    db.run(
      `INSERT INTO states (user_telegram_id, state, data) VALUES (?, ?, ?)
       ON CONFLICT(user_telegram_id) DO UPDATE SET state=excluded.state, data=excluded.data`,
      [telegram_id, state, JSON.stringify(data)]
    ),
  getState: (telegram_id) =>
    new Promise((resolve) => {
      db.get(
        `SELECT state, data FROM states WHERE user_telegram_id=?`,
        [telegram_id],
        (err, row) => {
          if (err || !row) return resolve({ state: null, data: {} });
          let data = {};
          try { data = JSON.parse(row.data); } catch {}
          resolve({ state: row.state, data });
        }
      );
    }),
  clearState: (telegram_id) =>
    db.run(`DELETE FROM states WHERE user_telegram_id=?`, [telegram_id]),
  // --- Call management ---
  logCall: (user_telegram_id, phone_number, scheduled_time, status, error) =>
    new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO calls (user_telegram_id, phone_number, scheduled_time, status, error) VALUES (?, ?, ?, ?, ?)`,
        [user_telegram_id, phone_number, scheduled_time, status, error],
        function (err) {
          if (err) return reject(err);
          resolve(this.lastID);
        }
      );
    }),
  updateCallStatus: (callId, status, error = null) =>
    db.run(
      `UPDATE calls SET status=?, error=? WHERE id=?`,
      [status, error, callId]
    ),
  getUserCallHistory: (user_telegram_id, limit = 20) =>
    new Promise((resolve) => {
      db.all(
        `SELECT * FROM calls WHERE user_telegram_id=? ORDER BY created_at DESC LIMIT ?`,
        [user_telegram_id, limit],
        (err, rows) => {
          if (err) return resolve([]);
          resolve(rows);
        }
      );
    }),
  getScheduledCalls: () =>
    new Promise((resolve) => {
      db.all(
        `SELECT * FROM calls WHERE status='scheduled' AND scheduled_time <= datetime('now')`,
        [],
        (err, rows) => {
          if (err) return resolve([]);
          resolve(rows);
        }
      );
    }),
  markCallCompleted: (callId) =>
    db.run(`UPDATE calls SET status='completed' WHERE id=?`, [callId]),
  // --- Survey results ---
  storeSurveyAnswer: (callId, step, key, answer) =>
    new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO survey_results (call_id, step, key, answer) VALUES (?, ?, ?, ?)`,
        [callId, step, key, answer],
        function (err) {
          if (err) return reject(err);
          resolve(this.lastID);
        }
      );
    }),
  finalizeSurvey: (callId, surveyQuestions) =>
    new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM survey_results WHERE call_id=? ORDER BY step`,
        [callId],
        (err, rows) => {
          if (err) return reject(err);
          // Map keys to answers
          const answers = {};
          rows.forEach(r => answers[r.key] = r.answer || 'No answer');
          const summary = surveyQuestions.map(q =>
            `${q.text}\nAnswer: ${answers[q.key] || 'No answer'}`
          ).join('\n\n');
          db.get(
            `SELECT user_telegram_id FROM calls WHERE id=?`,
            [callId],
            (err, call) => {
              if (!call) return resolve();
              db.run(
                `INSERT OR REPLACE INTO survey_final (call_id, user_telegram_id, summary) VALUES (?, ?, ?)`,
                [callId, call.user_telegram_id, summary],
                err => err ? reject(err) : resolve()
              );
            }
          );
        }
      );
    }),
  getSurveySummary: (callId) =>
    new Promise((resolve, reject) => {
      db.get(
        `SELECT summary, user_telegram_id FROM survey_final WHERE call_id=?`,
        [callId],
        (err, row) => {
          if (err || !row) return resolve({ summary: "", user_telegram_id: "" });
          resolve(row);
        }
      );
    }),
  getAllSurveyResults: () => new Promise((resolve) => {
    db.all(`SELECT * FROM survey_results`, [], (err, rows) => {
      resolve(rows || []);
    });
  }),
  getSurveyStats: (key, cb) => {
    db.all(
      `SELECT answer, COUNT(*) as count FROM survey_results WHERE key=? GROUP BY answer ORDER BY answer`,
      [key],
      (err, rows) => cb(rows || [])
    );
  }
};