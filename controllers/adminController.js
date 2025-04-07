// controllers/adminController.js
const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

exports.getActiveUsers = async (req, res) => {
    try {
      const result = await db.query(
        `SELECT DISTINCT u.user_id, u.full_name, u.email, u.phone, u.user_type
         FROM users u
         INNER JOIN user_sessions s ON u.user_id = s.user_id`
      );
  
      res.status(200).json({ users: result.rows });
    } catch (error) {
      console.error('Error fetching active users:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };

exports.adminRegister = async (req, res) => {
    const { name, email, phone, password, confirmPassword } = req.body;

    if (!name || !email || !phone || !password || !confirmPassword) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match' });
    }

    try {
        const existing = await db.query('SELECT user_id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ message: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await db.query(
            `INSERT INTO users (full_name, email, password_hash, phone, profile_picture, user_type)
             VALUES ($1, $2, $3, $4, NULL, 'admin')
             RETURNING user_id, full_name, email, user_type`,
            [name, email, hashedPassword, phone, address]
        );

        const admin = result.rows[0];

        const token = jwt.sign(
            { userId: admin.user_id, email: admin.email, userType: admin.user_type },
            JWT_SECRET
        );

        res.status(201).json({ message: 'Admin registered successfully', token });
    } catch (error) {
        console.error('Admin registration error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// ------------------ Admin Login ------------------
exports.adminLogin = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        const result = await db.query(
            `SELECT * FROM users WHERE email = $1 AND user_type = 'admin'`,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const admin = result.rows[0];

        const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Non-expiring token
        const token = jwt.sign(
            { userId: admin.user_id, email: admin.email, userType: admin.user_type },
            JWT_SECRET
        );

        // Save token in sessions
        await db.query(
            `INSERT INTO user_sessions (user_id, token) VALUES ($1, $2)`,
            [admin.user_id, token]
        );

        res.status(200).json({ message: 'Login successful', token });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};