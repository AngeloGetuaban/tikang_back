// controllers/otpController.js
const emailjs = require('@emailjs/nodejs');
const { setCode, isCodeValid } = require('../utils/otpStore');
const db = require('../db');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

exports.sendEmailVerification = async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    const userEmail = decoded.email;

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setCode(userId, code);

    await emailjs.send(
      process.env.VITE_EMAILJS_SERVICE_ID,
      process.env.VITE_EMAILJS_TEMPLATE_ID,
      {
        to_email: userEmail,
        verification_code: code,
      },
      {
        publicKey: process.env.VITE_EMAILJS_PUBLIC_KEY,
        privateKey: process.env.EMAILJS_SECRET_KEY,
      }
    );

    res.status(200).json({ message: 'Verification code sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to send code.' });
  }
};

exports.verifyEmailCode = async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Unauthorized' });
  
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const userId = decoded.userId;
      const { code } = req.body;
  
      if (!code) return res.status(400).json({ message: 'Code is required' });
  
      if (!isCodeValid(userId, code)) {
        return res.status(400).json({ message: 'Invalid or expired code' });
      }
  
      await db.query(`UPDATE users SET email_verify = 'yes' WHERE user_id = $1`, [userId]);
      res.status(200).json({ message: 'Email verified!' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Verification failed' });
    }
  };
  