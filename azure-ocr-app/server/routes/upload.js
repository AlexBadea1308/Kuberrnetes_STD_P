const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { containerClient } = require('../config/storage');
const { connectToDatabase, sql } = require('../config/db');
const { client } = require('../config/ocr');
const { generateBlobSASQueryParameters, BlobSASPermissions, StorageSharedKeyCredential } = require('@azure/storage-blob');

// Configurare multer pentru upload-uri
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Route pentru upload fișier și procesare OCR
router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nu a fost furnizat niciun fișier' });
  }

  try {
    // Generare nume unic pentru blob
    const fileName = req.file.originalname;
    const blobName = `${uuidv4()}-${fileName}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Upload fișier în Azure Blob Storage
    await blockBlobClient.uploadData(req.file.buffer);

    // Generează SAS token pentru a permite accesul la blob
    const credential = new StorageSharedKeyCredential(
      process.env.AZURE_STORAGE_ACCOUNT_NAME,
      process.env.AZURE_STORAGE_ACCOUNT_KEY
    );
    const sasOptions = {
      startsOn: new Date(),
      expiresOn: new Date(new Date().valueOf() + 3600 * 1000), // Valabil 1 oră
      permissions: BlobSASPermissions.parse('r'), // Doar citire
      containerName: process.env.AZURE_STORAGE_CONTAINER_NAME,
      blobName: blobName
    };
    const sasToken = generateBlobSASQueryParameters(sasOptions, credential).toString();
    const blobUrl = `${blockBlobClient.url}?${sasToken}`;

    // Salvare informații în baza de date
    const pool = await connectToDatabase();
    const result = await pool.request()
      .input('fileName', sql.NVarChar, fileName)
      .input('blobUrl', sql.NVarChar, blobUrl)
      .input('status', sql.NVarChar, 'processing')
      .query(`
        INSERT INTO ocr_files (file_name, blob_url, processing_status)
        VALUES (@fileName, @blobUrl, @status);
        SELECT SCOPE_IDENTITY() AS id;
      `);
    
    const fileId = result.recordset[0].id;

    // Procesare OCR cu Computer Vision
    const readResult = await client.read(blobUrl);
    const operationLocation = readResult.operationLocation;
    const operationId = operationLocation.split('/').pop();

    // Așteaptă finalizarea procesării OCR
    let ocrResult;
    do {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Așteaptă 1 secundă
      ocrResult = await client.getReadResult(operationId);
    } while (ocrResult.status !== 'succeeded' && ocrResult.status !== 'failed');

    // Verifică dacă procesarea a reușit
    if (ocrResult.status === 'failed') {
      throw new Error('Procesarea OCR a eșuat');
    }

    // Convertire rezultat OCR într-un format stocat
    let extractedText = '';
    for (const page of ocrResult.analyzeResult.readResults) {
      for (const line of page.lines) {
        extractedText += line.text + '\n';
      }
    }

    // Actualizare rezultat în baza de date
    await pool.request()
      .input('id', sql.Int, fileId)
      .input('status', sql.NVarChar, 'completed')
      .input('result', sql.NVarChar, extractedText)
      .query(`
        UPDATE ocr_files
        SET processing_status = @status, ocr_result = @result
        WHERE id = @id;
      `);

    res.status(200).json({
      id: fileId,
      fileName,
      blobUrl,
      status: 'completed',
      ocrResult: extractedText
    });
  } catch (error) {
    console.error('Eroare la procesarea fișierului:', error);
    res.status(500).json({ error: 'Eroare la procesarea fișierului: ' + error.message });
  }
});

module.exports = router; 