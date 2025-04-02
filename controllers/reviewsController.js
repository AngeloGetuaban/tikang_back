const pool = require('../db');

// Get all reviews
exports.getAllReviews = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM reviews');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get review by ID
exports.getReviewById = async (req, res) => {
  const reviewId = req.params.id;
  try {
    const result = await pool.query('SELECT * FROM reviews WHERE review_id = $1', [reviewId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Review not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create a review
exports.createReview = async (req, res) => {
  const { booking_id, user_id, property_id, rating, comment } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO reviews 
        (booking_id, user_id, property_id, rating, comment, created_at)
       VALUES 
        ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [booking_id, user_id, property_id, rating, comment]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a review
exports.updateReview = async (req, res) => {
  const reviewId = req.params.id;
  const { rating, comment } = req.body;

  try {
    const result = await pool.query(
      `UPDATE reviews SET 
        rating = $1,
        comment = $2
       WHERE review_id = $3
       RETURNING *`,
      [rating, comment, reviewId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Review not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a review
exports.deleteReview = async (req, res) => {
  const reviewId = req.params.id;
  try {
    const result = await pool.query('DELETE FROM reviews WHERE review_id = $1 RETURNING *', [reviewId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Review not found' });
    }
    res.json({ message: 'Review deleted successfully', review: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
