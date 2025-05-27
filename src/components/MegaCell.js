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
  isActiveMegaCell
}) {
  let megaCellClasses = ['mega-cell'];
  if (winInfo && winInfo.winner) {
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
      />
    </div>
  );
} 