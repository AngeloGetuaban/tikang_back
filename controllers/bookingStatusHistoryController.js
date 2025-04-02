const pool = require('../db');

exports.getAllBookingStatusHistory = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM booking_status_history');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
