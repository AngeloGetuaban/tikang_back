const pool = require('../db');

exports.getUserConversations = async (req, res) => {
  const userId = req.params.userId;

  try {
    const result = await pool.query(
      `SELECT 
         m.message_id,
         m.content,
         m.created_at,
         m.sender_id,
         m.recipient_id,
         u.user_id AS other_user_id,
         u.full_name AS other_user_name,
         u.user_type AS other_user_type
       FROM messages m
       JOIN users u ON (
         (u.user_id = m.sender_id AND m.sender_id != $1)
         OR (u.user_id = m.recipient_id AND m.recipient_id != $1)
       )
       WHERE $1 IN (m.sender_id, m.recipient_id)
       ORDER BY m.created_at DESC`,
      [userId]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching conversations:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
