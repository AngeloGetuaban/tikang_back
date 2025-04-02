const pool = require('../db');

// GET all bookings
exports.getAllBookings = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM bookings');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET a single booking by ID
exports.getBookingById = async (req, res) => {
  const bookingId = req.params.id;
  try {
    const result = await pool.query('SELECT * FROM bookings WHERE booking_id = $1', [bookingId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// CREATE a new booking
exports.createBooking = async (req, res) => {
  const {
    user_id,
    property_id,
    check_in_date,
    check_out_date,
    num_adults,
    num_children,
    num_rooms,
    stay_type,
    total_price,
    payment_status,
    booking_status,
    room_id,
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO bookings 
        (user_id, property_id, check_in_date, check_out_date, num_adults, num_children, num_rooms, stay_type, total_price, payment_status, booking_status, room_id)
       VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        user_id,
        property_id,
        check_in_date,
        check_out_date,
        num_adults,
        num_children,
        num_rooms,
        stay_type,
        total_price,
        payment_status,
        booking_status,
        room_id,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE booking
exports.updateBooking = async (req, res) => {
  const bookingId = req.params.id;
  const {
    user_id,
    property_id,
    check_in_date,
    check_out_date,
    num_adults,
    num_children,
    num_rooms,
    stay_type,
    total_price,
    payment_status,
    booking_status,
    room_id,
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE bookings SET
        user_id = $1,
        property_id = $2,
        check_in_date = $3,
        check_out_date = $4,
        num_adults = $5,
        num_children = $6,
        num_rooms = $7,
        stay_type = $8,
        total_price = $9,
        payment_status = $10,
        booking_status = $11,
        room_id = $12
       WHERE booking_id = $13
       RETURNING *`,
      [
        user_id,
        property_id,
        check_in_date,
        check_out_date,
        num_adults,
        num_children,
        num_rooms,
        stay_type,
        total_price,
        payment_status,
        booking_status,
        room_id,
        bookingId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE booking
exports.deleteBooking = async (req, res) => {
  const bookingId = req.params.id;
  try {
    const result = await pool.query(
      'DELETE FROM bookings WHERE booking_id = $1 RETURNING *',
      [bookingId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json({ message: 'Booking deleted', booking: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
