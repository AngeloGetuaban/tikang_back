const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

// -------------------- Owner Login --------------------
exports.ownerLogin = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        const result = await db.query(
            `SELECT * FROM users WHERE email = $1 AND user_type = 'owner'`,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const owner = result.rows[0];

        const isPasswordValid = await bcrypt.compare(password, owner.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { userId: owner.user_id, email: owner.email, userType: owner.user_type },
            JWT_SECRET
        );

        await db.query(
            `INSERT INTO user_sessions (user_id, token) VALUES ($1, $2)`,
            [owner.user_id, token]
        );

        res.status(200).json({ message: 'Login successful', token });
    } catch (error) {
        console.error('Owner login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// -------------------- Owner Registration --------------------
exports.ownerRegister = async (req, res) => {
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
             VALUES ($1, $2, $3, $4, $5, NULL, 'owner')
             RETURNING user_id, full_name, email, user_type`,
            [name, email, hashedPassword, phone, address]
        );

        const newUser = result.rows[0];

        const token = jwt.sign(
            { userId: newUser.user_id, email: newUser.email, userType: newUser.user_type },
            JWT_SECRET
        );

        await db.query(
            `INSERT INTO user_sessions (user_id, token) VALUES ($1, $2)`,
            [newUser.user_id, token]
        );

        res.status(201).json({ message: 'Registration successful', token });
    } catch (error) {
        console.error('Owner registration error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
