import React, { useState, useEffect, useCallback } from 'react';
import './CollapsibleHelpWindow.css';

const CollapsibleHelpWindow = ({ gameMovesCount }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 900);
  const [gameMovesCountWhenExpanded, setGameMovesCountWhenExpanded] = useState(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 900);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isExpanded && typeof gameMovesCount === 'number' && gameMovesCountWhenExpanded === null) {
      setGameMovesCountWhenExpanded(gameMovesCount);
    }
  }, [isExpanded, gameMovesCount, gameMovesCountWhenExpanded]);

  const handleToggleExpand = useCallback(() => {
    setIsExpanded(currentExpanded => {
      const newExpanded = !currentExpanded;
      if (newExpanded) {
        setGameMovesCountWhenExpanded(gameMovesCount);
      } else {
        setGameMovesCountWhenExpanded(null);
      }
      return newExpanded;
    });
  }, [gameMovesCount]);

  useEffect(() => {
    if (isExpanded && gameMovesCountWhenExpanded !== null && typeof gameMovesCount === 'number') {
      if (gameMovesCount >= gameMovesCountWhenExpanded + 3) {
        handleToggleExpand();
      }
    }
  }, [gameMovesCount, isExpanded, gameMovesCountWhenExpanded, handleToggleExpand]);

  const rulesContentShared = (
    <>
      <img src="/onboarding.png" alt="How to play guide" className="help-window-image" />
      <ol className="help-window-rules">
        <li>If <span className="player-x">X</span> plays in top right corner on the SMALL board, <span className="player-o">O</span> must play in the top right corner of the BIG board.</li>
        <li>If that corner is already full, <span className="player-o">O</span> gets a free turn.</li>
      </ol>
    </>
  );

  const rulesContentMobileShared = (
    <>
      <ol className="help-window-rules">
        <li>If <span className="player-x">X</span> plays in top right corner on the SMALL board, <span className="player-o">O</span> must play in the top right corner of the BIG board.</li>
        <li>If that corner is already full, <span className="player-o">O</span> gets a free turn.</li>
      </ol>
      <img src="/onboarding.png" alt="How to play guide" className="help-window-image" />
    </>
  );

  if (isMobileView) {
    return (
      <div className="mobile-help-section">
        <h2>How to play</h2>
        {rulesContentMobileShared}
      </div>
    );
  }

  return (
    <div className={`collapsible-help-window ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="help-window-header" onClick={handleToggleExpand}>
        <span>How to play</span>
        <span>{isExpanded ? '↓' : '↑'}</span>
      </div>
      <div className="help-window-content">
        {rulesContentShared}
      </div>
    </div>
  );
};

export default CollapsibleHelpWindow; 