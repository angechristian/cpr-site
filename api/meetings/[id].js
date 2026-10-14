const { updateMeeting, deleteMeeting } = require('../db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (req.method === 'PUT') {
    const { day, time, location, title, verse, leader, moderator } = req.body || {};

    if (!day || !time || !location || !title) {
      return res.status(400).json({ error: 'day, time, location and title are required.' });
    }

    const result = await updateMeeting(id, { day, time, location, title, verse, leader, moderator });
    return res.status(200).json(result);
  }

  if (req.method === 'DELETE') {
    const result = await deleteMeeting(id);
    return res.status(200).json(result);
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
