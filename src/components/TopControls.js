import React from 'react';

export function TopControls({
  onNewGame,
  onUndo,
  canUndo,
  onRedo,
  canRedo,
  onShowLogs
}) {
  return (
    <div className="top-controls">
      <button onClick={onNewGame} className="new-game-button">
        New Game
      </button>
      <button onClick={onUndo} className="undo-button" disabled={!canUndo}>
        Undo
      </button>
      <button onClick={onRedo} className="redo-button" disabled={!canRedo}>
        Redo
      </button>
      <button onClick={onShowLogs} className="show-logs-button">
        Show Logs
      </button>
    </div>
  );
} 