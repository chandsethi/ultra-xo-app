import React from 'react';
import './NavBar.css';

const NavBar = ({ onNewGame }) => {
  return (
    <div className="nav-bar-container">
      <div className="nav-bar-title">Ultra XOXO</div>
      <div className="nav-bar-actions">
        <span onClick={onNewGame} className="nav-bar-link">New Game</span>
      </div>
    </div>
  );
};

export default NavBar; 