const { getSocials, replaceSocials } = require('./db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const socials = await getSocials();
    return res.status(200).json({ socials });
  }

  if (req.method === 'PUT') {
    const socials = Array.isArray(req.body) ? req.body : [];
    const saved = await replaceSocials(socials);
    return res.status(200).json({ socials: saved });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
