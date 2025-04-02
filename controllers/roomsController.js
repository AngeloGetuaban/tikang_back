const pool = require('../db');

// Get all rooms
exports.getAllRooms = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM rooms');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get room by ID
exports.getRoomById = async (req, res) => {
  const roomId = req.params.id;
  try {
    const result = await pool.query('SELECT * FROM rooms WHERE room_id = $1', [roomId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Room not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create a new room
exports.createRoom = async (req, res) => {
  const {
    property_id,
    room_name,
    room_type,
    description,
    price_per_night,
    max_guests,
    total_rooms,
    amenities,
    is_active
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO rooms 
        (property_id, room_name, room_type, description, price_per_night, max_guests, total_rooms, amenities, is_active)
       VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        property_id,
        room_name,
        room_type,
        description,
        price_per_night,
        max_guests,
        total_rooms,
        amenities,
        is_active
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a room
exports.updateRoom = async (req, res) => {
  const roomId = req.params.id;
  const {
    property_id,
    room_name,
    room_type,
    description,
    price_per_night,
    max_guests,
    total_rooms,
    amenities,
    is_active
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE rooms SET
        property_id = $1,
        room_name = $2,
        room_type = $3,
        description = $4,
        price_per_night = $5,
        max_guests = $6,
        total_rooms = $7,
        amenities = $8,
        is_active = $9
       WHERE room_id = $10
       RETURNING *`,
      [
        property_id,
        room_name,
        room_type,
        description,
        price_per_night,
        max_guests,
        total_rooms,
        amenities,
        is_active,
        roomId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Room not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a room
exports.deleteRoom = async (req, res) => {
  const roomId = req.params.id;
  try {
    const result = await pool.query('DELETE FROM rooms WHERE room_id = $1 RETURNING *', [roomId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Room not found' });
    }
    res.json({ message: 'Room deleted successfully', room: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
