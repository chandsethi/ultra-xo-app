import React from 'react';
import './HowToPlayModal.css';

export const HowToPlayModal = ({ show, onClose }) => {
  if (!show) {
    return null;
  }

  const handleOverlayClick = (e) => {
    // Close if the click is directly on the overlay, not on the modal content
    if (e.target.id === 'how-to-play-modal-overlay') {
      onClose();
    }
  };

  return (
    <div id="how-to-play-modal-overlay" className="how-to-play-modal-overlay" onClick={handleOverlayClick}>
      <div className="how-to-play-modal-content">
        <img src="/onboarding.png" alt="How to play guide" className="how-to-play-modal-image" />
        <ol className="how-to-play-modal-text">
          <li>If <span className="player-x">X</span> plays in top right corner on the SMALL board, <span className="player-o">O</span> must play in the top right corner of the BIG board.</li>
          <li>If that corner is already full, <span className="player-o">O</span> gets a free turn.</li>
        </ol>
        <button onClick={onClose} className="how-to-play-modal-got-it-btn">
          Got it
        </button>
      </div>
    </div>
  );
}; 