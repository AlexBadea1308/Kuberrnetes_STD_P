const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Încărcarea variabilelor de mediu
dotenv.config();

// Inițializarea aplicației Express
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Importarea rutelor
const uploadRoutes = require('./server/routes/upload');
const historyRoutes = require('./server/routes/history');

// Utilizarea rutelor API
app.use('/api/upload', uploadRoutes);
app.use('/api/history', historyRoutes);

// Servire fișiere statice React din folderul client/build
app.use(express.static(path.join(__dirname, 'client/build')));

// Pentru orice cerere care nu este API, servește index.html din React
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

// Inițializarea resurselor
const { initializeDatabase } = require('./server/config/db');
const { initializeStorage } = require('./server/config/storage');

// Funcție pentru inițializarea resurselor
async function initialize() {
  try {
    await initializeDatabase();
    await initializeStorage();
    console.log('Toate serviciile au fost inițializate cu succes');
  } catch (error) {
    console.error('Eroare la inițializarea serviciilor:', error);
  }
}

// Pornirea serverului
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Serverul rulează pe portul ${PORT}`);
  // Inițializarea resurselor după pornirea serverului
  initialize();
});

module.exports = app;