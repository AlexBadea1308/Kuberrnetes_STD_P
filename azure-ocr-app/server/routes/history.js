const express = require('express');
const router = express.Router();
const { connectToDatabase } = require('../config/db');

// Obține toate înregistrările din istoric
router.get('/', async (req, res) => {
  try {
    const pool = await connectToDatabase();
    const result = await pool.request().query(`
      SELECT id, file_name, blob_url, upload_time, processing_status, ocr_result
      FROM ocr_files
      ORDER BY upload_time DESC;
    `);

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Eroare la obținerea istoricului:', error);
    res.status(500).json({ error: 'Eroare la obținerea istoricului' });
  }
});

// Obține o înregistrare specifică din istoric după ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await connectToDatabase();
    const result = await pool.request()
      .input('id', id)
      .query(`
        SELECT id, file_name, blob_url, upload_time, processing_status, ocr_result
        FROM ocr_files
        WHERE id = @id;
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Înregistrare negăsită' });
    }

    res.status(200).json(result.recordset[0]);
  } catch (error) {
    console.error('Eroare la obținerea înregistrării:', error);
    res.status(500).json({ error: 'Eroare la obținerea înregistrării' });
  }
});

module.exports = router; 