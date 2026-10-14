const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data.db');
const PREVIEW_MODE = process.env.PREVIEW_MODE === '1';

app.use(express.json());
app.use('/assets', express.static(path.join(__dirname, 'assets'), { dotfiles: 'deny' }));
app.get('/styles.css', (req, res) => res.sendFile(path.join(__dirname, 'styles.css')));
app.get('/script.js', (req, res) => res.sendFile(path.join(__dirname, 'script.js')));

app.use((req, res, next) => {
  if (!PREVIEW_MODE) return next();

  if (req.path === '/admin' || req.path === '/admin.html') {
    return res.status(404).send('Not found');
  }

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return res.status(403).json({ error: 'This preview is read-only.' });
  }

  next();
});

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Failed to connect to SQLite:', err.message);
    process.exit(1);
  }

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
      if (createErr) {
        console.error('Failed to initialize meetings table:', createErr.message);
        process.exit(1);
      }

      db.get('SELECT COUNT(*) AS count FROM meetings', (countErr, row) => {
        if (!countErr && Number(row.count) === 0) {
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

          stmt.finalize();
        }
      });
    });

    db.run(`
      CREATE TABLE IF NOT EXISTS socials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform TEXT NOT NULL,
        label TEXT NOT NULL,
        url TEXT NOT NULL,
        icon TEXT NOT NULL
      )
    `, (socialCreateErr) => {
      if (socialCreateErr) {
        console.error('Failed to initialize socials table:', socialCreateErr.message);
        process.exit(1);
      }

      db.get('SELECT COUNT(*) AS count FROM socials', (socialCountErr, socialRow) => {
        if (!socialCountErr && Number(socialRow.count) === 0) {
          const defaultSocials = [
            { platform: 'facebook', label: 'Facebook', url: 'https://www.facebook.com/votre-page-cpr', icon: 'f' },
            { platform: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/votre-compte-cpr/', icon: '◎' },
            { platform: 'tiktok', label: 'TikTok', url: 'https://www.tiktok.com/@votre-compte-cpr', icon: '♪' },
            { platform: 'x', label: 'X', url: 'https://x.com/votre-compte-cpr', icon: 'X' }
          ];

          const stmt = db.prepare(
            'INSERT INTO socials (platform, label, url, icon) VALUES (?, ?, ?, ?)'
          );

          defaultSocials.forEach((social) => {
            stmt.run(social.platform, social.label, social.url, social.icon);
          });

          stmt.finalize();
        }
      });
    });
  });
});

app.get('/api/meetings', (req, res) => {
  db.all('SELECT * FROM meetings ORDER BY id ASC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json({ meetings: rows });
  });
});

app.get('/api/socials', (req, res) => {
  db.all('SELECT * FROM socials ORDER BY id ASC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json({ socials: rows });
  });
});

app.post('/api/meetings', (req, res) => {
  const { day, time, location, title, verse, leader, moderator } = req.body || {};

  if (!day || !time || !location || !title) {
    return res.status(400).json({ error: 'day, time, location and title are required.' });
  }

  const stmt = db.prepare(
    'INSERT INTO meetings (day, time, location, title, verse, leader, moderator) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );

  stmt.run(day, time, location, title, verse || '', leader || '', moderator || '', function (insertErr) {
    if (insertErr) {
      return res.status(500).json({ error: insertErr.message });
    }

    const newMeeting = {
      id: this.lastID,
      day,
      time,
      location,
      title,
      verse: verse || '',
      leader: leader || '',
      moderator: moderator || ''
    };

    res.status(201).json({ meeting: newMeeting });
  });
});

app.put('/api/meetings/:id', (req, res) => {
  const { id } = req.params;
  const { day, time, location, title, verse, leader, moderator } = req.body || {};

  if (!day || !time || !location || !title) {
    return res.status(400).json({ error: 'day, time, location and title are required.' });
  }

  db.run(
    'UPDATE meetings SET day = ?, time = ?, location = ?, title = ?, verse = ?, leader = ?, moderator = ? WHERE id = ?',
    [day, time, location, title, verse || '', leader || '', moderator || '', id],
    function (updateErr) {
      if (updateErr) {
        return res.status(500).json({ error: updateErr.message });
      }

      res.json({ updated: this.changes > 0, id: Number(id) });
    }
  );
});

app.delete('/api/meetings/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM meetings WHERE id = ?', [id], function (deleteErr) {
    if (deleteErr) {
      return res.status(500).json({ error: deleteErr.message });
    }

    res.json({ deleted: this.changes > 0, id: Number(id) });
  });
});

app.put('/api/socials', (req, res) => {
  const socials = Array.isArray(req.body) ? req.body : [];

  db.run('DELETE FROM socials', (deleteErr) => {
    if (deleteErr) {
      return res.status(500).json({ error: deleteErr.message });
    }

    if (!socials.length) {
      return res.json({ socials: [] });
    }

    const stmt = db.prepare('INSERT INTO socials (platform, label, url, icon) VALUES (?, ?, ?, ?)');

    socials.forEach((social) => {
      stmt.run(
        social.platform || social.name || 'social',
        social.label || social.platform || 'Social',
        social.url || '',
        social.icon || (social.label || social.platform || 'S').slice(0, 1).toUpperCase()
      );
    });

    stmt.finalize(() => {
      res.json({ socials });
    });
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get(/^(?!\/api\/).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`CPR app running at http://localhost:${PORT}`);
});
