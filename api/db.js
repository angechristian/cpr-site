const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = process.env.DB_PATH || (process.env.VERCEL ? path.join('/tmp', 'cpr-site.db') : path.join(__dirname, '..', 'data.db'));

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Failed to connect to SQLite:', err.message);
  }
});

const defaultMeetings = [
  {
    day: 'Mercredi',
    time: '21h00',
    location: 'en ligne',
    title: 'Kumpenda jirani yako bila kujali tofauti',
    verse: 'Luc 10:30–37',
    leader: 'Sœur Marie',
    moderator: 'Jean'
  },
  {
    day: 'Dimanche',
    time: '21h30',
    location: 'en ligne',
    title: 'Soyons donc patients',
    verse: 'Jacques 5:7–8',
    leader: 'Pasteur Emmanuel',
    moderator: 'Aline'
  }
];

const defaultSocials = [
  { platform: 'facebook', label: 'Facebook', url: 'https://www.facebook.com/votre-page-cpr', icon: 'f' },
  { platform: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/votre-compte-cpr/', icon: '◎' },
  { platform: 'tiktok', label: 'TikTok', url: 'https://www.tiktok.com/@votre-compte-cpr', icon: '♪' },
  { platform: 'x', label: 'X', url: 'https://x.com/votre-compte-cpr', icon: 'X' }
];

const ready = new Promise((resolve, reject) => {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS meetings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        day TEXT NOT NULL,
        time TEXT NOT NULL,
        location TEXT NOT NULL,
        title TEXT NOT NULL,
        verse TEXT,
        leader TEXT,
        moderator TEXT
      )
    `, (createErr) => {
      if (createErr) return reject(createErr);

      db.get('SELECT COUNT(*) AS count FROM meetings', (countErr, row) => {
        if (countErr) return reject(countErr);

        if (Number(row.count) === 0) {
          const stmt = db.prepare(
            'INSERT INTO meetings (day, time, location, title, verse, leader, moderator) VALUES (?, ?, ?, ?, ?, ?, ?)'
          );

          defaultMeetings.forEach((meeting) => {
            stmt.run(
              meeting.day,
              meeting.time,
              meeting.location,
              meeting.title,
              meeting.verse,
              meeting.leader,
              meeting.moderator
            );
          });

          stmt.finalize((finalizeErr) => {
            if (finalizeErr) return reject(finalizeErr);
            continueSocials();
          });
          return;
        }

        continueSocials();
      });
    });

    function continueSocials() {
      db.run(`
        CREATE TABLE IF NOT EXISTS socials (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          platform TEXT NOT NULL,
          label TEXT NOT NULL,
          url TEXT NOT NULL,
          icon TEXT NOT NULL
        )
      `, (socialCreateErr) => {
        if (socialCreateErr) return reject(socialCreateErr);

        db.get('SELECT COUNT(*) AS count FROM socials', (socialCountErr, socialRow) => {
          if (socialCountErr) return reject(socialCountErr);

          if (Number(socialRow.count) === 0) {
            const stmt = db.prepare(
              'INSERT INTO socials (platform, label, url, icon) VALUES (?, ?, ?, ?)'
            );

            defaultSocials.forEach((social) => {
              stmt.run(social.platform, social.label, social.url, social.icon);
            });

            stmt.finalize((socialFinalizeErr) => {
              if (socialFinalizeErr) return reject(socialFinalizeErr);
              resolve();
            });
            return;
          }

          resolve();
        });
      });
    }
  });
});

const all = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) return reject(err);
    resolve(rows);
  });
});

const run = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function onRun(err) {
    if (err) return reject(err);
    resolve({ lastID: this.lastID, changes: this.changes });
  });
});

const getMeetings = async () => {
  await ready;
  return all('SELECT * FROM meetings ORDER BY id ASC');
};

const createMeeting = async ({ day, time, location, title, verse, leader, moderator }) => {
  await ready;
  const result = await run(
    'INSERT INTO meetings (day, time, location, title, verse, leader, moderator) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [day, time, location, title, verse || '', leader || '', moderator || '']
  );

  return {
    id: result.lastID,
    day,
    time,
    location,
    title,
    verse: verse || '',
    leader: leader || '',
    moderator: moderator || ''
  };
};

const updateMeeting = async (id, { day, time, location, title, verse, leader, moderator }) => {
  await ready;
  const result = await run(
    'UPDATE meetings SET day = ?, time = ?, location = ?, title = ?, verse = ?, leader = ?, moderator = ? WHERE id = ?',
    [day, time, location, title, verse || '', leader || '', moderator || '', id]
  );

  return { updated: result.changes > 0, id: Number(id) };
};

const deleteMeeting = async (id) => {
  await ready;
  const result = await run('DELETE FROM meetings WHERE id = ?', [id]);
  return { deleted: result.changes > 0, id: Number(id) };
};

const getSocials = async () => {
  await ready;
  return all('SELECT * FROM socials ORDER BY id ASC');
};

const replaceSocials = async (socials) => {
  await ready;
  await run('DELETE FROM socials');

  if (!Array.isArray(socials) || !socials.length) {
    return [];
  }

  const insertPromises = socials.map((social) => run(
    'INSERT INTO socials (platform, label, url, icon) VALUES (?, ?, ?, ?)',
    [
      social.platform || social.name || 'social',
      social.label || social.platform || 'Social',
      social.url || '',
      social.icon || (social.label || social.platform || 'S').slice(0, 1).toUpperCase()
    ]
  ));

  await Promise.all(insertPromises);
  return socials;
};

module.exports = {
  db,
  ready,
  getMeetings,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  getSocials,
  replaceSocials
};
