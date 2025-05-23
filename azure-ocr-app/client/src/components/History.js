import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './History.css';

const History = () => {
  const [history, setHistory] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await axios.get('/api/history');
      setHistory(response.data);
    } catch (err) {
      setError('Eroare la obținerea istoricului.');
    }
  };

  const handleShowDetails = async (id) => {
    try {
      const response = await axios.get(`/api/history/${id}`);
      setSelectedRecord(response.data);
      setShowModal(true);
    } catch (err) {
      setError('Eroare la obținerea detaliilor.');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedRecord(null);
  };

  return (
    <div className="history-container">
      <h2>Istoric procesări</h2>

      {error && (
        <div className="alert">
          {error}
        </div>
      )}

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nume fișier</th>
              <th>Data încărcării</th>
              <th>Status</th>
              <th>Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center' }}>
                  Nu există înregistrări.
                </td>
              </tr>
            ) : (
              history.map((record) => (
                <tr key={record.id}>
                  <td>{record.id}</td>
                  <td>{record.file_name}</td>
                  <td>{new Date(record.upload_time).toLocaleString()}</td>
                  <td>{record.processing_status}</td>
                  <td>
                    <button className="info-btn" onClick={() => handleShowDetails(record.id)}>
                      Vezi detalii
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && selectedRecord && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={handleCloseModal}>×</button>
            <h3>Detalii procesare</h3>
            <p><strong>ID:</strong> {selectedRecord.id}</p>
            <p><strong>Nume fișier:</strong> {selectedRecord.file_name}</p>
            <p><strong>Data încărcării:</strong> {new Date(selectedRecord.upload_time).toLocaleString()}</p>
            <p><strong>Status:</strong> {selectedRecord.processing_status}</p>
            <p><strong>URL Blob:</strong> <a href={selectedRecord.blob_url} target="_blank" rel="noopener noreferrer">Vezi imaginea</a></p>
            <p><strong>Text extras:</strong></p>
            <pre>{selectedRecord.ocr_result || 'Niciun text extras.'}</pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default History; 