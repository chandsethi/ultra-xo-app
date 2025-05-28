import React from 'react';
import './DevControls.css';

const DevControls = ({
  onUndo,
  canUndo,
  onRedo,
  canRedo,
  onShowLogs,
  onToggleLoadStateModal,
  lastBotMoveDetails
}) => {
  return (
    <div className="dev-controls-container">
      <button onClick={onUndo} disabled={!canUndo}>
        Undo
      </button>
      <button onClick={onRedo} disabled={!canRedo}>
        Redo
      </button>
      <button onClick={onShowLogs}>
        Show Logs
      </button>
      <button onClick={onToggleLoadStateModal}>
        Load Game State
      </button>
      {lastBotMoveDetails && (
        <div className="last-bot-move-details">
          <h3>Last Bot Move:</h3>
          <pre>{lastBotMoveDetails}</pre>
        </div>
      )}
    </div>
  );
};

export default DevControls; 