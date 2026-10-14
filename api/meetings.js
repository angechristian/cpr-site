const { getMeetings, createMeeting, updateMeeting, deleteMeeting } = require('./db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const meetings = await getMeetings();
    return res.status(200).json({ meetings });
  }

  if (req.method === 'POST') {
    const { day, time, location, title, verse, leader, moderator } = req.body || {};

    if (!day || !time || !location || !title) {
      return res.status(400).json({ error: 'day, time, location and title are required.' });
    }

    const meeting = await createMeeting({ day, time, location, title, verse, leader, moderator });
    return res.status(201).json({ meeting });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
