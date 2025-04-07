// controllers/guestController.js
const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Load JWT secret from .env if you're using it
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

// -------------------- Guest Login --------------------
exports.guestLogin = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        const result = await db.query(
            `SELECT * FROM users WHERE email = $1 AND user_type = 'guest'`,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const user = result.rows[0];

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Non-expiring token
        const token = jwt.sign(
            { userId: user.user_id, email: user.email, userType: user.user_type },
            JWT_SECRET
        );

        // Save token in sessions
        await db.query(
            `INSERT INTO user_sessions (user_id, token) VALUES ($1, $2)`,
            [user.user_id, token]
        );

        res.status(200).json({ message: 'Login successful', token });
    } catch (error) {
        console.error('Guest login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
// -------------------- Guest Registration --------------------
exports.guestRegister = async (req, res) => {
    const { name, email, phone, address, password, confirmPassword } = req.body;

    if (!name || !email || !phone || !address || !password || !confirmPassword) {
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
            `INSERT INTO users (full_name, email, password_hash, phone, address, profile_picture, user_type)
             VALUES ($1, $2, $3, $4, $5, NULL, 'guest')
             RETURNING user_id, full_name, email, user_type`,
            [name, email, hashedPassword, phone, address]
        );

        const newUser = result.rows[0];

        const token = jwt.sign(
            { userId: newUser.user_id, email: newUser.email, userType: newUser.user_type },
            JWT_SECRET
        );

        res.status(201).json({ message: 'Registration successful', token });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
