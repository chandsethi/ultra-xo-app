import React from 'react';

export function LogModal({ show, onClose, logEntries }) {
  if (!show) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Game State Log</h3>
          <button onClick={onClose} className="modal-close-button">&times;</button>
        </div>
        <div className="modal-body">
          {logEntries.length > 0 ? (
            logEntries.map((logLine, index) => (
              <p key={index} className="log-line">{logLine}</p>
            ))
          ) : (
            <p>No logs yet.</p>
          )}
        </div>
      </div>
    </div>
  );
} 