const pool = require('../db');

// GET all users
exports.getAllUsers = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET users by type
exports.getUsersByType = async (req, res) => {
  const userType = req.params.type;
  try {
    const result = await pool.query('SELECT * FROM users WHERE user_type = $1', [userType]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET single user by ID
exports.getUserById = async (req, res) => {
  const userId = req.params.id;
  try {
    const result = await pool.query('SELECT * FROM users WHERE user_id = $1', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// CREATE new user
exports.createUser = async (req, res) => {
  const { full_name, email, password_hash, phone, profile_picture, user_type } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, phone, profile_picture, user_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [full_name, email, password_hash, phone, profile_picture, user_type]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE user
exports.updateUser = async (req, res) => {
  const userId = req.params.id;
  const { full_name, email, password_hash, phone, profile_picture, user_type } = req.body;
  try {
    const result = await pool.query(
      `UPDATE users SET full_name = $1, email = $2, password_hash = $3, phone = $4, profile_picture = $5, user_type = $6
       WHERE user_id = $7 RETURNING *`,
      [full_name, email, password_hash, phone, profile_picture, user_type, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE user
exports.deleteUser = async (req, res) => {
  const userId = req.params.id;
  try {
    const result = await pool.query('DELETE FROM users WHERE user_id = $1 RETURNING *', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted', user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
