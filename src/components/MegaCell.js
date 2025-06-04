import React from 'react';
import { XIcon, OIcon } from './Icons';
import { MiniGrid } from './MiniGrid';

export function MegaCell({ 
  megaCellIndex, 
  miniGridCells, 
  onCellClick, 
  hoveredMegaIndex, 
  hoveredMiniIndex, 
  onCellMouseEnter, 
  onCellMouseLeave, 
  currentPlayer,
  winInfo,
  isActiveMegaCell,
  blinkingCellGlobal,
  blinkShowIconGlobal,
  isCurrentlyBlinking,
  megaCellAwaitingReveal
}) {
  let megaCellClasses = ['mega-cell'];

  // Determine if this specific megaCell is the one that contains the actively blinking miniCell
  const isThisCellBlinkingItsWinningMove = 
    isCurrentlyBlinking && 
    blinkingCellGlobal && 
    blinkingCellGlobal.mega === megaCellIndex;

  // Condition to show large icon:
  // 1. This mega cell has a winner (winInfo.winner)
  // 2. Its own winning move is NOT currently blinking (!isThisCellBlinkingItsWinningMove)
  // 3. This specific mega cell is NOT in the "awaiting mega reveal" phase (megaCellAwaitingReveal !== megaCellIndex)
  const shouldShowLargeIcon = 
    winInfo && 
    winInfo.winner && 
    !isThisCellBlinkingItsWinningMove && 
    megaCellAwaitingReveal !== megaCellIndex;

  if (shouldShowLargeIcon) {
    megaCellClasses.push('winner');
    return (
      <div className={megaCellClasses.join(' ')}>
        {winInfo.winner === 'X' && <XIcon isLarge={true} color="red" />}
        {winInfo.winner === 'O' && <OIcon isLarge={true} color="blue" />}
      </div>
    );
  } else if (isActiveMegaCell) {
    if (currentPlayer === 'X') {
      megaCellClasses.push('active-for-x');
    } else {
      megaCellClasses.push('active-for-o');
    }
  }

  return (
    <div className={megaCellClasses.join(' ')} style={{ position: 'relative' }}>
      <MiniGrid 
        megaCellIndex={megaCellIndex} 
        cells={miniGridCells} 
        onCellClick={onCellClick} 
        hoveredMegaIndex={hoveredMegaIndex}
        hoveredMiniIndex={hoveredMiniIndex}
        onCellMouseEnter={onCellMouseEnter}
        onCellMouseLeave={onCellMouseLeave}
        currentPlayer={currentPlayer}
        winInfo={winInfo}
        isActiveMiniGrid={isActiveMegaCell}
        blinkingCellGlobal={blinkingCellGlobal}
        blinkShowIconGlobal={blinkShowIconGlobal}
        isCurrentlyBlinking={isCurrentlyBlinking}
      />
    </div>
  );
} 