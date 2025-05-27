import React from 'react';
import { XIcon, OIcon } from './Icons';
import { isSafari } from '../utils/browserUtils';

// Forward declaration for isSafari, will be imported properly later
// const isSafari = () => { /* implementation from App.js */ }; 

// Temporary isSafari until it's moved to utils and imported
// const isSafari = () => {
//   const ua = navigator.userAgent.toLowerCase();
//   return ua.includes('safari') && !ua.includes('chrome') && !ua.includes('android');
// };

export function Cell({ 
  value, 
  onClick, 
  megaIndex, 
  miniIndex, 
  hoveredMegaIndex, 
  hoveredMiniIndex, 
  onCellMouseEnter, 
  onCellMouseLeave, 
  currentPlayer,
  isActiveCell,
  // Blinking props from MiniGrid
  isBlinkingTarget,
  blinkShowIcon
}) {
  const isEmpty = !value;
  const isCurrentlyHovered = megaIndex === hoveredMegaIndex && miniIndex === hoveredMiniIndex;
  const cellClasses = ['cell'];
  if (isEmpty) {
    cellClasses.push('empty');
    if (isSafari() && isActiveCell) {
      cellClasses.push('safari-hoverable');
    }
  }

  let showOIcon = true;
  if (value === 'O' && isBlinkingTarget && !blinkShowIcon) {
    showOIcon = false;
  }

  return (
    <div 
      className={cellClasses.join(' ')}
      onClick={onClick}
      onMouseEnter={() => onCellMouseEnter(megaIndex, miniIndex)}
      onMouseLeave={onCellMouseLeave}
    >
      {value === 'X' && <XIcon color="red" />}
      {value === 'O' && showOIcon && <OIcon color="blue" />}
      {isEmpty && isCurrentlyHovered && isActiveCell && !isSafari() && (
        <div className="hover-preview">
          {currentPlayer === 'X' ? <XIcon customClass="hover-icon" color="red"/> : <OIcon customClass="hover-icon" color="blue"/>}
        </div>
      )}
    </div>
  );
} 