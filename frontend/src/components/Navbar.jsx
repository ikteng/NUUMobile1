import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';

export default function Navbar() {
  const location = useLocation(); // Get the current location

  // Function to check if the current link is active
  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <img src="/NuuMobileLogo.png" alt="Logo" className="logo" />
      </div>
      <div className="navbar-items">
        <Link to="/upload" className={`nav-item ${isActive('/upload') ? 'active' : ''}`}>
          Upload
        </Link>
        <Link to="/dashboard" className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`}>
          Dashboard
        </Link>
        <Link to="/predictions" className={`nav-item ${isActive('/predictions') ? 'active' : ''}`}>
          Predictions
        </Link>
      </div>
      <div className="navbar-right"></div>
    </nav>
  );
};
