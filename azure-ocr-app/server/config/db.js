const sql = require('mssql');
const dotenv = require('dotenv');

dotenv.config();

const config = {
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  server: process.env.SQL_SERVER,
  database: process.env.SQL_DATABASE,
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
};

// Funcție pentru conectarea la baza de date
async function connectToDatabase() {
  try {
    const pool = await sql.connect(config);
    console.log('Conectat la baza de date SQL');
    return pool;
  } catch (err) {
    console.error('Eroare la conectarea la baza de date:', err);
    throw err;
  }
}

// Funcție pentru crearea tabelei dacă nu există
async function initializeDatabase() {
  try {
    const pool = await connectToDatabase();
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ocr_files')
      BEGIN
        CREATE TABLE ocr_files (
          id INT IDENTITY(1,1) PRIMARY KEY,
          file_name NVARCHAR(255) NOT NULL,
          blob_url NVARCHAR(512) NOT NULL,
          upload_time DATETIME DEFAULT GETDATE(),
          processing_status NVARCHAR(50) DEFAULT 'pending',
          ocr_result NVARCHAR(MAX)
        );
      END
    `);
    console.log('Tabela ocr_files verificată/creată');
  } catch (err) {
    console.error('Eroare la inițializarea bazei de date:', err);
    throw err;
  }
}

module.exports = {
  connectToDatabase,
  initializeDatabase,
  sql
}; 