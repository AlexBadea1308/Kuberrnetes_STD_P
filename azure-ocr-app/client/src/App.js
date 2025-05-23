import React from 'react';
import UploadForm from './components/UploadForm';
import History from './components/History';
import './App.css';

function App() {
  return (
    <>
      <header className="navbar">
        <div className="navbar-brand">OCR App</div>
        <nav className="navbar-links">
          <a href="#upload">Încarcă</a>
          <a href="#history">Istoric</a>
        </nav>
      </header>

      <main className="main-container">
        <section id="upload">
          <UploadForm />
        </section>
        <hr />
        <section id="history">
          <History />
        </section>
      </main>

      <footer className="footer">
        <p>© {new Date().getFullYear()} OCR Application - Powered by Azure OCR</p>
      </footer>
    </>
  );
}

export default App; 