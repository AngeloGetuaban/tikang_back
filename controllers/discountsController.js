const pool = require('../db');

exports.getAllDiscounts = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM discounts');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

