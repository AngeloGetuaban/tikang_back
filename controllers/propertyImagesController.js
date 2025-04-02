const pool = require('../db');

exports.getAllPropertyImages = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM property_images');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
