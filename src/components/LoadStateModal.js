import React, { useState } from 'react';
import './LoadStateModal.css'; // We'll create this CSS file next

function LoadStateModal({ show, onClose, onLoadState }) {
  const [gameStateString, setGameStateString] = useState('');
  const [error, setError] = useState('');

  if (!show) {
    return null;
  }

  const handleSubmit = () => {
    if (gameStateString.length !== 81) {
      setError('Input string must be exactly 81 characters long.');
      return;
    }
    if (!/^[xo-]+$/.test(gameStateString)) {
      setError("Input string can only contain 'x', 'o', or '-'.");
      return;
    }
    setError('');
    onLoadState(gameStateString);
    setGameStateString(''); // Clear input after successful load
  };

  const handleCancel = () => {
    setGameStateString('');
    setError('');
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Load Game State</h2>
          <button onClick={handleCancel} className="close-button">&times;</button>
        </div>
        <div className="modal-body">
          <p>Paste an 81-character string representing the board state.</p>
          <p>Use 'x' for Player X, 'o' for Player O, and '-' for empty cells.</p>
          <textarea
            value={gameStateString}
            onChange={(e) => setGameStateString(e.target.value)}
            rows="3"
            placeholder="Example: ----x-----------------------------------o------------------------------------"
          />
          {error && <p className="error-message">{error}</p>}
        </div>
        <div className="modal-footer">
          <button onClick={handleSubmit} className="button">Load State</button>
          <button onClick={handleCancel} className="button secondary">Cancel</button>
        </div>
      </div>
    </div>
  );
}

export { LoadStateModal }; 