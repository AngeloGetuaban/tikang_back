const pool = require('../db'); // Adjust path if needed

// Get all properties
exports.getAllProperties = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM properties');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching properties:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
