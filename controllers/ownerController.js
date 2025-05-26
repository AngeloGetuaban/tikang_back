const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');        
const fs = require('fs-extra');  
const path = require('path');

const upload = multer({ dest: 'uploads/tmp' }); // temp folder
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

        const user = result.rows[0];

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { userId: user.user_id, full_name: user.full_name ,email: user.email, userType: user.user_type, emailVerify: user.email_verify },
            JWT_SECRET
        );

        await db.query(
            `INSERT INTO user_sessions (user_id, token) VALUES ($1, $2)`,
            [user.user_id, token]
        );

        res.status(200).json({ message: 'Login successful', token });
    } catch (error) {
        console.error('Owner login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// -------------------- Owner Registration --------------------
exports.ownerRegister = async (req, res) => {
    const {
      firstName,
      lastName,
      email,
      phone,
      address,
      age,
      password,
      confirmPassword
    } = req.body;
  
    if (!firstName || !lastName || !email || !phone || !address || !password || !confirmPassword || !age) {
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
  
      const fullName = `${firstName} ${lastName}`;
      const hashedPassword = await bcrypt.hash(password, 10);
  
      const result = await db.query(
        `INSERT INTO users (first_name, last_name, full_name, email, password_hash, phone, address, age, profile_picture, user_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL, 'owner')
         RETURNING user_id, full_name, email, user_type, email_verify, address, age`,
        [firstName, lastName, fullName, email, hashedPassword, phone, address, age]
      );
  
      const user = result.rows[0];
  
      const token = jwt.sign(
        {
          userId: user.user_id,
          full_name: user.full_name,
          email: user.email,
          userType: user.user_type,
          emailVerify: user.email_verify,
          address: user.address,
          age: user.age
        },
        JWT_SECRET
      );
  
      await db.query(
        `INSERT INTO user_sessions (user_id, token) VALUES ($1, $2)`,
        [user.user_id, token]
      );
  
      res.status(201).json({ message: 'Registration successful', token });
    } catch (error) {
      console.error('Owner registration error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };
  
  
  exports.getCurrentOwner = async (req, res) => {
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

  const pool = require('../db');

  // GET bookings with joined property, room, and user details by lessor_id
  exports.getBookingsByLessor = async (req, res) => {
    const { lessorId } = req.params;
  
    try {
      const result = await pool.query(`
        SELECT 
          b.booking_id,
          b.user_id,
          u.full_name,
          b.property_id,
          b.check_in_date,
          b.check_out_date,
          b.num_adults,
          b.num_children,
          b.num_rooms,
          b.stay_type,
          b.total_price,
          b.payment_status,
          b.booking_status,
          b.created_at,
          b.room_id,
          b.cancelled_date,
  
          -- Properties
          p.lessor_id,
          p.title,
          p.description AS property_description,
          p.city,
          p.province,
          p.country,
          p.type AS property_type,
          p.thumbnail_url,
          p.status AS property_status,
          p.max_rooms,
  
          -- Rooms
          r.room_id AS room_id,
          r.property_id AS room_property_id,
          r.room_name,
          r.room_type,
          r.room_images
  
        FROM bookings b
        INNER JOIN properties p ON b.property_id = p.property_id
        INNER JOIN users u ON b.user_id = u.user_id
        LEFT JOIN rooms r ON r.room_id = ANY(b.room_id) -- 👈 FIXED LINE
  
        WHERE p.lessor_id = $1
        ORDER BY b.created_at DESC
      `, [lessorId]);
  
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching bookings with joins:", err);
      res.status(500).json({ error: "Server error retrieving bookings" });
    }
  };
  
  // GET properties and their rooms by lessor_id
exports.getPropertiesWithRooms = async (req, res) => {
  const { lessorId } = req.params;

  try {
    const result = await pool.query(`
      SELECT 
        -- Properties
        p.property_id,
        p.lessor_id,
        p.title,
        p.description,
        p.address,
        p.type,
        p.thumbnail_url,
        p.price_per_night,
        p.price_day_use,
        p.max_rooms,
        p.amenities,
        p.is_day_use_available,
        p.status,
        p.created_at,
        p.city,
        p.province,
        p.country,

        -- Rooms
        r.room_id,
        r.property_id AS room_property_id,
        r.room_name,
        r.room_type,
        r.description AS room_description,
        r.price_per_night AS room_price_per_night,
        r.max_guests,
        r.total_rooms,
        r.amenities AS room_amenities,
        r.is_active,
        r.room_images

      FROM properties p
      LEFT JOIN rooms r ON p.property_id = r.property_id
      WHERE p.lessor_id = $1
      ORDER BY p.created_at DESC, r.room_id
    `, [lessorId]);

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching properties with rooms:", err);
    res.status(500).json({ error: "Failed to retrieve properties and rooms" });
  }
};

exports.uploadPropertyImages = upload.array('images');


exports.addProperty = async (req, res) => {
  const {
    title, address, type, price_per_night, price_day_use,
    max_rooms, city, province, country, amenities,
    is_day_use_available, status, description, lessor_id
  } = req.body;

  if (!title || !address || !type || !price_per_night || !max_rooms || !city || !province || !country || !lessor_id || !description) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // ✅ Convert amenities to a proper TEXT[] array for PostgreSQL
    const amenitiesArray = typeof amenities === 'string'
      ? amenities.replace(/[\[\]"]+/g, '').split(',').map(a => a.trim()).filter(Boolean)
      : Array.isArray(amenities) ? amenities : [];

    // ✅ Create folder named after the property title (sanitized)
    const safeTitle = title.replace(/[^a-z0-9-_]/gi, '_').toLowerCase();
    const propertyFolder = path.join(__dirname, '..', 'uploads', 'properties', safeTitle);
    await fs.ensureDir(propertyFolder);

    // ✅ Move uploaded files and collect URLs
    const imageUrls = [];
    for (const file of req.files) {
      const ext = path.extname(file.originalname);
      const fileName = `${Date.now()}-${file.originalname}`;
      const finalPath = path.join(propertyFolder, fileName);

      await fs.move(file.path, finalPath);
      const relativeUrl = `/uploads/properties/${safeTitle}/${fileName}`;
      imageUrls.push(relativeUrl);
    }

    // ✅ SQL insert
    const insertQuery = `
      INSERT INTO properties (
        lessor_id, title, address, type,
        price_per_night, price_day_use, max_rooms,
        city, province, country, amenities, is_day_use_available, description,
        status, thumbnail_url
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8,
        $9, $10, $11, $12, $13,
        $14, $15
      )
      RETURNING *;
    `;

    const values = [
      lessor_id,
      title,
      address,
      type,
      price_per_night,
      price_day_use || 0,
      max_rooms,
      city,
      province,
      country,
      amenitiesArray,
      is_day_use_available === 'true' || is_day_use_available === true,
      description,
      status || 'active',
      imageUrls
    ];

    const result = await db.query(insertQuery, values);

    res.status(201).json({
      message: 'Property added successfully',
      property: result.rows[0]
    });
  } catch (err) {
    console.error('Add property error:', err);
    res.status(500).json({ message: 'Server error while adding property' });
  }
};

exports.switchPropertyStatus = async (req, res) => {
  const { propertyId } = req.params;
  const { status } = req.body;

  if (!["active", "inactive"].includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  try {
    const result = await db.query(
      `UPDATE properties SET status = $1 WHERE property_id = $2 RETURNING *`,
      [status, propertyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Property not found" });
    }

    res.status(200).json({
      message: `Property status updated to ${status}`,
      property: result.rows[0]
    });
  } catch (error) {
    console.error("Error switching property status:", error);
    res.status(500).json({ message: "Server error while updating property status" });
  }
};

exports.uploadRoomImages = upload.array('images');

exports.addRoom = async (req, res) => {
  const { propertyId } = req.params;
  const {
    room_name,
    room_type,
    price_per_night,
    max_guests,
    total_rooms,
    amenities,
    description,
    is_active
  } = req.body;

  if (!propertyId || !room_name || !room_type || !price_per_night || !max_guests || !total_rooms) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    // 🧼 Clean and convert amenities string to array
    const amenitiesArray = typeof amenities === 'string'
      ? amenities.replace(/[\[\]"]+/g, '').split(',').map(a => a.trim()).filter(Boolean)
      : Array.isArray(amenities) ? amenities : [];

    // 📁 Create a folder for the room
    const safeRoomName = room_name.replace(/[^a-z0-9-_]/gi, '_').toLowerCase();
    const roomFolder = path.join(__dirname, '..', 'uploads', 'rooms', safeRoomName);
    await fs.ensureDir(roomFolder);

    // 📸 Move uploaded images and collect their relative paths
    const imageUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const fileName = `${Date.now()}-${file.originalname}`;
        const finalPath = path.join(roomFolder, fileName);
        await fs.move(file.path, finalPath);
        imageUrls.push(`/uploads/rooms/${safeRoomName}/${fileName}`);
      }
    }

    // 📥 Insert room without room_id — rely on sequence default
    const insertQuery = `
      INSERT INTO rooms (
        property_id, room_name, room_type, price_per_night, max_guests,
        total_rooms, amenities, description, is_active, room_images
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10
      )
      RETURNING *;
    `;

    const values = [
      propertyId,
      room_name,
      room_type,
      parseFloat(price_per_night),
      parseInt(max_guests),
      parseInt(total_rooms),
      amenitiesArray,
      description || '',
      is_active === 'true' || is_active === true,
      imageUrls
    ];

    const result = await db.query(insertQuery, values);

    res.status(201).json({
      message: "Room added successfully",
      room: result.rows[0]
    });

  } catch (error) {
    console.error("Add room error:", error);
    res.status(500).json({ message: "Server error while adding room" });
  }
};

exports.switchRoomStatus = async (req, res) => {
  const { roomId } = req.params;
  const { is_active } = req.body;

  try {
    const result = await db.query(
      `UPDATE rooms SET is_active = $1 WHERE room_id = $2 RETURNING *`,
      [is_active, roomId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Room not found" });
    }

    res.status(200).json({
      message: `Room status updated to ${is_active ? "Active" : "Inactive"}`,
      room: result.rows[0]
    });
  } catch (error) {
    console.error("Error switching room status:", error);
    res.status(500).json({ message: "Server error while updating room status" });
  }
};

exports.updateProperty = async (req, res) => {
  const { propertyId } = req.params;
  const {
    title,
    address,
    type,
    price_per_night,
    price_day_use,
    max_rooms,
    city,
    province,
    country,
    description,
    amenities,
    thumbnail_url
  } = req.body;

  try {
    // Parse amenities and existing thumbnails
    const amenitiesArray = typeof amenities === 'string'
      ? amenities.replace(/[\[\]"]+/g, '').split(',').map(a => a.trim())
      : Array.isArray(amenities) ? amenities : [];

    const existingImages = typeof thumbnail_url === 'string'
      ? JSON.parse(thumbnail_url)
      : thumbnail_url || [];

    const safeTitle = title.replace(/[^a-z0-9-_]/gi, '_').toLowerCase();
    const propertyFolder = path.join(__dirname, '..', 'uploads', 'properties', safeTitle);
    await fs.ensureDir(propertyFolder);

    // Process new images (if any)
    const uploadedImages = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const finalName = `${Date.now()}-${file.originalname}`;
        const finalPath = path.join(propertyFolder, finalName);
        await fs.move(file.path, finalPath);
        uploadedImages.push(`/uploads/properties/${safeTitle}/${finalName}`);
      }
    }

    const updatedImageArray = [...existingImages, ...uploadedImages];

    // Update property in DB
    const updateQuery = `
      UPDATE properties SET
        title = $1,
        address = $2,
        type = $3,
        price_per_night = $4,
        price_day_use = $5,
        max_rooms = $6,
        city = $7,
        province = $8,
        country = $9,
        description = $10,
        amenities = $11,
        thumbnail_url = $12
      WHERE property_id = $13
      RETURNING *;
    `;

    const values = [
      title,
      address,
      type,
      parseFloat(price_per_night),
      parseFloat(price_day_use),
      parseInt(max_rooms),
      city,
      province,
      country,
      description,
      amenitiesArray,
      updatedImageArray,
      propertyId
    ];

    const result = await db.query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Property not found" });
    }

    res.status(200).json({
      message: "Property updated successfully",
      property: result.rows[0]
    });

  } catch (err) {
    console.error("Error updating property:", err);
    res.status(500).json({ message: "Server error while updating property" });
  }
};

exports.deleteProperty = async (req, res) => {
  const { propertyId } = req.params;

  try {
    // ❗Check if there are active (non-canceled + not yet ended) bookings
    const check = await db.query(
      `
      SELECT 1 FROM bookings 
      WHERE property_id = $1 
        AND (cancelled_date IS NULL AND check_out_date > NOW())
      `,
      [propertyId]
    );

    if (check.rows.length > 0) {
      return res.status(400).json({
        message: "Cannot delete property: There are future or ongoing bookings that are not cancelled.",
      });
    }

    // ✅ Optionally delete related rooms
    await db.query(`DELETE FROM rooms WHERE property_id = $1`, [propertyId]);

    // ✅ Delete the property
    const result = await db.query(
      `DELETE FROM properties WHERE property_id = $1 RETURNING *`,
      [propertyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Property not found" });
    }

    res.status(200).json({
      message: "Property deleted successfully",
      deleted: result.rows[0]
    });

  } catch (err) {
    console.error("Error deleting property:", err);
    res.status(500).json({ message: "Server error while deleting property" });
  }
};

exports.updateRoom = async (req, res) => {
  const { roomId } = req.params;
  const {
    room_name,
    room_type,
    price_per_night,
    max_guests,
    total_rooms,
    amenities,
    description,
    room_images,
    is_active
  } = req.body;

  try {
    // 🧹 Parse and clean amenities
    const amenitiesArray = typeof amenities === 'string'
      ? amenities.replace(/[\[\]"]+/g, '').split(',').map(a => a.trim()).filter(Boolean)
      : Array.isArray(amenities) ? amenities : [];

    // 📷 Parse existing room_images
    const existingImages = typeof room_images === 'string'
      ? JSON.parse(room_images)
      : room_images || [];

    // 🧰 Folder setup
    const safeRoomName = room_name.replace(/[^a-z0-9-_]/gi, '_').toLowerCase();
    const roomFolder = path.join(__dirname, '..', 'uploads', 'rooms', safeRoomName);
    await fs.ensureDir(roomFolder);

    // 🖼️ Handle new uploads
    const uploadedImages = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const fileName = `${Date.now()}-${file.originalname}`;
        const finalPath = path.join(roomFolder, fileName);
        await fs.move(file.path, finalPath);
        uploadedImages.push(`/uploads/rooms/${safeRoomName}/${fileName}`);
      }
    }

    const updatedImageArray = [...existingImages, ...uploadedImages];

    const result = await db.query(`
      UPDATE rooms SET
        room_name = $1,
        room_type = $2,
        price_per_night = $3,
        max_guests = $4,
        total_rooms = $5,
        amenities = $6,
        description = $7,
        is_active = $8,
        room_images = $9
      WHERE room_id = $10
      RETURNING *;
    `, [
      room_name,
      room_type,
      parseFloat(price_per_night),
      parseInt(max_guests),
      parseInt(total_rooms),
      amenitiesArray,
      description || '',
      is_active === 'true' || is_active === true,
      updatedImageArray,
      roomId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Room not found" });
    }

    res.status(200).json({
      message: "Room updated successfully",
      room: result.rows[0]
    });
  } catch (err) {
    console.error("Error updating room:", err);
    res.status(500).json({ message: "Server error while updating room" });
  }
};

exports.deleteRoom = async (req, res) => {
  const { roomId } = req.params;

  try {
    // Check for future or ongoing non-cancelled bookings referencing this room
    const check = await db.query(
      `
      SELECT 1 FROM bookings 
      WHERE $1 = ANY(room_id)
        AND (cancelled_date IS NULL AND check_out_date > NOW())
      `,
      [roomId]
    );

    if (check.rows.length > 0) {
      return res.status(400).json({
        message: "Cannot delete room: There are future or ongoing bookings that are not cancelled.",
      });
    }

    // Proceed with deletion
    const result = await db.query(
      `DELETE FROM rooms WHERE room_id = $1 RETURNING *`,
      [roomId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Room not found" });
    }

    res.status(200).json({
      message: "Room deleted successfully",
      deleted: result.rows[0],
    });
  } catch (err) {
    console.error("Error deleting room:", err);
    res.status(500).json({ message: "Server error while deleting room" });
  }
};

exports.getAssociatedBookingsUsersPropertiesRooms = async (req, res) => {
  const { lessorId } = req.params;

  try {
    const result = await db.query(`
      SELECT 
        -- Booking info
        b.booking_id,
        b.user_id AS customer_user_id,
        b.property_id,
        b.room_id,
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
        b.created_at,

        -- Customer info
        u.full_name AS customer_name,
        u.email AS customer_email,
        u.phone AS customer_phone,
        u.address AS customer_address,
        u.age AS customer_age,

        -- Property info
        p.title AS property_title,
        p.address AS property_address,
        p.city AS property_city,
        p.province AS property_province,
        p.country AS property_country,

        -- Room info (optional)
        r.room_name,
        r.room_type,
        r.max_guests,
        r.price_per_night AS room_price_per_night

      FROM bookings b
      INNER JOIN properties p ON b.property_id = p.property_id
      INNER JOIN users u ON b.user_id = u.user_id
      LEFT JOIN rooms r ON r.room_id = ANY(b.room_id)
      WHERE p.lessor_id = $1
      ORDER BY b.check_in_date DESC;
    `, [lessorId]);

    res.status(200).json({
      message: "All associated data fetched successfully",
      data: result.rows
    });

  } catch (err) {
    console.error("Error fetching associated data:", err);
    res.status(500).json({ message: "Server error fetching data" });
  }
};

// -------------------- Register Owner via /register-owner --------------------
exports.registerOwner = async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    phone,
    address,
    city,
    province,
    country,
    age,
    password,
    confirmPassword
  } = req.body;

  // Validate required fields
  if (!firstName || !lastName || !email || !phone || !address || !city || !province || !country || !age || !password || !confirmPassword) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }

  try {
    // Check if email is already used by another owner
    const existingEmail = await db.query(
      `SELECT user_id FROM users WHERE email = $1 AND user_type = 'owner'`,
      [email]
    );

    if (existingEmail.rows.length > 0) {
      return res.status(409).json({ message: 'Email is already used by another owner' });
    }

    // Check if phone number is already used by another owner
    const existingPhone = await db.query(
      `SELECT user_id FROM users WHERE phone = $1 AND user_type = 'owner'`,
      [phone]
    );

    if (existingPhone.rows.length > 0) {
      return res.status(409).json({ message: 'Phone number is already used by another owner' });
    }

    const fullName = `${firstName} ${lastName}`;
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO users (
        first_name, last_name, full_name, email, password_hash, phone, address, city, province, country, age, profile_picture, user_type
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NULL, 'owner'
      ) RETURNING user_id, full_name, email, user_type, email_verify, address, city, province, country, age`,
      [firstName, lastName, fullName, email, hashedPassword, phone, address, city, province, country, age]
    );

    const user = result.rows[0];

    const token = jwt.sign(
      {
        userId: user.user_id,
        full_name: user.full_name,
        email: user.email,
        userType: user.user_type,
        emailVerify: user.email_verify,
        address: user.address,
        city: user.city,
        province: user.province,
        country: user.country,
        age: user.age
      },
      JWT_SECRET
    );

    await db.query(
      `INSERT INTO user_sessions (user_id, token) VALUES ($1, $2)`,
      [user.user_id, token]
    );

    res.status(201).json({ message: 'Registration successful', token });

  } catch (err) {
    console.error('registerOwner error:', err);
    res.status(500).json({ message: 'Server error during registration' });
  }
};




