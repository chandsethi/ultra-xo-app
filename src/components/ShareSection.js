import React from 'react';
import './ShareSection.css';

const ShareSection = ({ gameResult, turns, megaGridState, onTweet }) => {
  const getResultTextVerb = () => {
    if (gameResult === 'X') return 'won';
    if (gameResult === 'O') return 'lost';
    return "drew";
  };

  const getEmoji = (cellWinner) => {
    if (cellWinner === 'X') return '❌';
    if (cellWinner === 'O') return '🔵';
    return '➖';
  };

  const emojiGrid = megaGridState.map(row => 
    row.map(cell => getEmoji(cell)).join('')
  ).join('\n');

  const shareText = `I ${getResultTextVerb()} in ${turns} turn${turns === 1 ? '' : 's'}.\n${emojiGrid}`;

  return (
    <div className="share-section">
      <div className="share-text-frame">
        <p>{`I ${getResultTextVerb()} in ${turns} turn${turns === 1 ? '' : 's'}.`}</p>
        <pre className="emoji-grid">{emojiGrid}</pre>
      </div>
      <div className="share-buttons">
        <a
          className="twitter-share-button"
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
          data-size="small"
          target="_blank"
          rel="noopener noreferrer"
        >
          Tweet
        </a>
      </div>
    </div>
  );
};

export default ShareSection; 