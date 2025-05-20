const pool = require('../db');

// GET all users with their tikang_cash
exports.getAllUsersCash = async (req, res) => {
  try {
    const result = await pool.query('SELECT user_id, full_name, tikang_cash FROM users');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching users cash:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET cash for a specific user
exports.getUserCash = async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      'SELECT user_id, full_name, tikang_cash FROM users WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching user cash:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// UPDATE tikang_cash for a specific user
exports.updateUserCash = async (req, res) => {
  const { userId } = req.params;S
  const { tikang_cash } = req.body;

  if (tikang_cash == null || isNaN(tikang_cash)) {
    return res.status(400).json({ error: 'Valid tikang_cash amount is required' });
  }

  try {
    const result = await pool.query(
      'UPDATE users SET tikang_cash = $1 WHERE user_id = $2 RETURNING user_id, full_name, tikang_cash',
      [tikang_cash, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error updating cash:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE tikang_cash (reset to 0.00)
exports.resetUserCash = async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      'UPDATE users SET tikang_cash = 0.00 WHERE user_id = $1 RETURNING user_id, full_name, tikang_cash',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error resetting cash:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
