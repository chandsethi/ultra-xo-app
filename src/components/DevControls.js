import React from 'react';
import './DevControls.css';

const DevControls = ({
  onUndo,
  canUndo,
  onRedo,
  canRedo,
  onShowLogs,
  onToggleLoadStateModal
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
    </div>
  );
};

export default DevControls; 