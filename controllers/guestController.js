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
            { userId: user.user_id, full_name: user.full_name ,email: user.email, userType: user.user_type, emailVerify: user.email_verify },
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
            { userId: newUser.user_id, full_name: newUser.name, email: newUser.email, userType: newUser.user_type },
            JWT_SECRET
        );

        res.status(201).json({ message: 'Registration successful', token });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getCurrentGuest = async (req, res) => {
    const authHeader = req.headers.authorization;
  
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token missing' });
    }
  
    const token = authHeader.split(' ')[1];
  
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const userId = decoded.userId;
  
      const result = await db.query(`SELECT * FROM users WHERE user_id = $1`, [userId]);
  
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      const user = result.rows[0];
      delete user.password_hash; // Hide sensitive info
  
      res.status(200).json({ user });
    } catch (error) {
      console.error('Token verification error:', error);
      res.status(403).json({ message: 'Invalid or expired token' });
    }
  };
  
  exports.guestLogout = async (req, res) => {
    const authHeader = req.headers.authorization;
  
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token missing' });
    }
    
    const token = authHeader.split(' ')[1];
  
    try {
      // Delete the token from user_sessions
      await db.query('DELETE FROM user_sessions WHERE token = $1', [token]);
  
      res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ message: 'Server error during logout' });
    }
  };
  exports.getGuestReviews = async (req, res) => {
    const authHeader = req.headers.authorization;
  
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token missing' });
    }
  
    const token = authHeader.split(' ')[1];
  
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const userId = decoded.userId;
  
      const reviewsResult = await db.query(
        `
        SELECT 
          r.user_id,
          r.rating,
          r.comment,
          r.review_images,
          p.title AS property_name,
          p.thumbnail_url,
          b.check_in_date,
          b.check_out_date,
          b.num_adults,
          b.num_children,
          b.num_rooms,
          b.stay_type,
          b.room_id
        FROM reviews r
        JOIN bookings b ON r.booking_id = b.booking_id
        JOIN properties p ON r.property_id = p.property_id
        WHERE r.user_id = $1
        ORDER BY b.check_in_date DESC
        `,
        [userId]
      );
  
      const reviewsWithRooms = [];
  
      for (const row of reviewsResult.rows) {
        const roomIds = row.room_id || [];
  
        const roomQuery = await db.query(
          `SELECT room_id, room_name, room_type FROM rooms WHERE room_id = ANY($1)`,
          [roomIds]
        );
  
        const rooms = roomQuery.rows.map((room) => ({
          room_name: room.room_name,
          room_type: room.room_type,
        }));
  
        reviewsWithRooms.push({
          user_id: row.user_id,
          property_name: row.property_name,
          thumbnail_url: row.thumbnail_url,
          review_images: row.review_images || [],
          check_in_date: row.check_in_date,
          check_out_date: row.check_out_date,
          num_adults: row.num_adults,
          num_children: row.num_children,
          num_rooms: row.num_rooms,
          stay_type: row.stay_type,
          rating: row.rating,
          comment: row.comment,
          rooms,
        });
      }
  
      res.status(200).json({ reviews: reviewsWithRooms });
    } catch (error) {
      console.error('Error fetching guest reviews with rooms:', error);
      res.status(500).json({ message: 'Server error while fetching reviews' });
    }
  };
  exports.updateGuestName = async (req, res) => {
    const authHeader = req.headers.authorization;
  
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token missing' });
    }
  
    const token = authHeader.split(' ')[1];
  
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const userId = decoded.userId;
  
      const { first_name, last_name } = req.body;
  
      if (!first_name || !last_name) {
        return res.status(400).json({ message: 'First name and last name are required' });
      }
  
      const full_name = `${first_name} ${last_name}`;
  
      await db.query(
        `
        UPDATE users
        SET first_name = $1,
            last_name = $2,
            full_name = $3
        WHERE user_id = $4
        `,
        [first_name, last_name, full_name, userId]
      );
  
      res.status(200).json({ message: 'Name updated successfully', full_name });
    } catch (error) {
      console.error('Error updating guest name:', error);
      res.status(500).json({ message: 'Server error while updating name' });
    }
  };
  exports.updateGuestPhone = async (req, res) => {
    const authHeader = req.headers.authorization;
  
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token missing' });
    }
  
    const token = authHeader.split(' ')[1];
  
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const userId = decoded.userId;
  
      const { phone } = req.body;
  
      if (!phone || !/^\+\d{7,15}$/.test(phone)) {
        return res.status(400).json({ message: 'Invalid phone number format. Must start with + and be 7–15 digits.' });
      }
  
      await db.query(
        `
        UPDATE users
        SET phone = $1
        WHERE user_id = $2
        `,
        [phone, userId]
      );
  
      res.status(200).json({ message: 'Phone number updated successfully', phone });
    } catch (error) {
      console.error('Error updating phone:', error);
      res.status(500).json({ message: 'Server error while updating phone' });
    }
  };

exports.updateGuestEmail = async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization token missing' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    const { email } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Check if the email is already used
    const emailExists = await db.query(
      `SELECT user_id FROM users WHERE email = $1 AND user_id != $2`,
      [email, userId]
    );

    if (emailExists.rows.length > 0) {
      return res.status(409).json({ message: 'Email is already in use by another account' });
    }

    await db.query(
      `
      UPDATE users
      SET email = $1,
          email_verify = 'yes'
      WHERE user_id = $2
      `,
      [email, userId]
    );

    res.status(200).json({ message: 'Email updated successfully', email });
  } catch (error) {
    console.error('Error updating email:', error);
    res.status(500).json({ message: 'Server error while updating email' });
  }
};

exports.updateGuestPassword = async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization token missing' });
  }
  
  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const { password, confirmPassword } = req.body;

    if (!password || !confirmPassword) {
      return res.status(400).json({ message: 'Both password and confirmPassword are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    // Fetch current hashed password
    const result = await db.query(`SELECT password_hash FROM users WHERE user_id = $1`, [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const currentHash = result.rows[0].password_hash;

    // Compare new password with current hashed password
    const isSamePassword = await bcrypt.compare(password, currentHash);
    if (isSamePassword) {
      return res.status(400).json({ message: 'You cannot reuse your current password' });
    }

    // Hash and update if different
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      `UPDATE users SET password_hash = $1 WHERE user_id = $2`,
      [hashedPassword, userId]
    );

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ message: 'Server error while updating password' });
  }
};

exports.getGuestUnreviewedBookings = async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization token missing' });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const result = await db.query(
      `
      SELECT 
        b.*
      FROM bookings b
      LEFT JOIN reviews r ON b.booking_id = r.booking_id
      WHERE b.user_id = $1
        AND r.booking_id IS NULL
        AND b.booking_status = 'completed'
      ORDER BY b.check_in_date DESC
      `,
      [userId]
    );

    res.status(200).json({ bookings: result.rows });
  } catch (error) {
    console.error('Error fetching unreviewed bookings:', error);
    res.status(500).json({ message: 'Server error while fetching unreviewed bookings' });
  }
};

exports.getGuestBookings = async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization token missing' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const result = await db.query(
      `
      SELECT 
        b.booking_id,
        b.check_in_date,
        b.check_out_date,
        b.num_adults,
        b.num_children,
        b.num_rooms,
        b.stay_type,
        b.total_price,  
        b.payment_status,
        b.booking_status,
        b.cancelled_date,
        p.title,
        p.address,
        p.thumbnail_url,
        COALESCE(json_agg(
          DISTINCT jsonb_build_object(
            'room_name', r.room_name,
            'room_type', r.room_type,
            'price_per_night', r.price_per_night,
            'room_images', r.room_images
          )
        ) FILTER (WHERE r.room_id IS NOT NULL), '[]') AS rooms
      FROM bookings b
      LEFT JOIN properties p ON b.property_id = p.property_id
      LEFT JOIN LATERAL (
        SELECT * FROM rooms
        WHERE room_id = ANY(b.room_id)
      ) r ON true
      WHERE b.user_id = $1
      GROUP BY b.booking_id, p.property_id
      ORDER BY b.check_in_date DESC
      `,
      [userId]
    );

    res.status(200).json({ bookings: result.rows });
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({ message: 'Server error while fetching bookings' });
  }
};






  
  