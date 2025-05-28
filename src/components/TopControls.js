import React from 'react';
import './TopControls.css'; // Assuming this file will be created or already exists

const TopControls = ({ 
  onNewGame,
  // Removed unused props: onUndo, canUndo, onRedo, canRedo, onShowLogs, onToggleLoadStateModal, isRedoDisabled, showDevControls
}) => {
  return (
    <div className="top-nav-bar">
      <div className="title">Ultra XOXO</div>
      <div className="nav-actions">
        <span onClick={onNewGame} className="nav-link">New Game</span>
        {/* All other buttons are removed as per the new design focus */}
      </div>
    </div>
  );
};

export default TopControls; 