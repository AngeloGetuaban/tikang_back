const { Pool } = require('pg');
const pool = new Pool({
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'tikang',
  password: process.env.PGPASSWORD || 'admin',
  port: process.env.PGPORT || 5432,
});
module.exports = pool;