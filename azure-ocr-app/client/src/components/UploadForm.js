import React, { useState } from 'react';
import axios from 'axios';
import './UploadForm.css';

const UploadForm = () => {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setResult(null);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Vă rugăm să selectați un fișier.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Eroare la procesarea fișierului.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-container">
      <h2>Încarcă o imagine pentru OCR</h2>

      <form onSubmit={handleSubmit} className="upload-form">
        <label className="form-label">
          Selectează o imagine:
          <input type="file" onChange={handleFileChange} accept="image/*" />
        </label>

        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? 'Procesare...' : 'Încarcă și procesează'}
        </button>
      </form>

      {error && <div className="alert error">{error}</div>}

      {result && (
        <div className="alert success">
          <h4>Rezultat OCR</h4>
          <p><strong>Nume fișier:</strong> {result.fileName}</p>
          <p><strong>Text extras:</strong></p>
          <pre>{result.ocrResult}</pre>
          <p><strong>URL Blob:</strong> <a href={result.blobUrl} target="_blank" rel="noopener noreferrer">Vezi imaginea</a></p>
        </div>
      )}
    </div>
  );
};

export default UploadForm; 