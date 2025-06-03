import React from 'react';
import './NavBar.css';

const NavBar = ({ onNewGame, onShowHowToPlay }) => {
  return (
    <div className="nav-bar-container">
      <div className="nav-bar-title">Ultra XOXO</div>
      <div className="nav-bar-actions">
        <span onClick={onNewGame} className="nav-bar-link">New Game</span>
        <span onClick={onShowHowToPlay} className="nav-bar-link">How to play</span>
      </div>
    </div>
  );
};

export default NavBar; 