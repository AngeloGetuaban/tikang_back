const pool = require('../db');

// Get all favorites
exports.getAllFavorites = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM favorites');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get a favorite by ID
exports.getFavoriteById = async (req, res) => {
  const favoriteId = req.params.id;
  try {
    const result = await pool.query('SELECT * FROM favorites WHERE favorite_id = $1', [favoriteId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Favorite not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create a favorite
exports.createFavorite = async (req, res) => {
  const { user_id, property_id } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO favorites 
        (user_id, property_id, created_at)
       VALUES 
        ($1, $2, NOW())
       RETURNING *`,
      [user_id, property_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a favorite (only property_id update allowed for demo)
exports.updateFavorite = async (req, res) => {
  const favoriteId = req.params.id;
  const { property_id } = req.body;

  try {
    const result = await pool.query(
      `UPDATE favorites SET 
        property_id = $1
       WHERE favorite_id = $2
       RETURNING *`,
      [property_id, favoriteId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Favorite not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a favorite
exports.deleteFavorite = async (req, res) => {
  const favoriteId = req.params.id;
  try {
    const result = await pool.query('DELETE FROM favorites WHERE favorite_id = $1 RETURNING *', [favoriteId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Favorite not found' });
    }
    res.json({ message: 'Favorite deleted successfully', favorite: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
