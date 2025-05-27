import React from 'react';
import { Cell } from './Cell';
import { WinningLine } from './WinningLine';

export function MiniGrid({ 
  megaCellIndex, 
  cells, 
  onCellClick, 
  hoveredMegaIndex, 
  hoveredMiniIndex, 
  onCellMouseEnter, 
  onCellMouseLeave, 
  currentPlayer,
  winInfo,
  isActiveMiniGrid
}) {
  return (
    <div className="mini-grid" style={{ position: 'relative' }}>
      {cells.map((cellValue, miniCellIndex) => (
        <Cell 
          key={miniCellIndex} 
          value={cellValue} 
          onClick={() => onCellClick(megaCellIndex, miniCellIndex)} 
          megaIndex={megaCellIndex}
          miniIndex={miniCellIndex}
          hoveredMegaIndex={hoveredMegaIndex}
          hoveredMiniIndex={hoveredMiniIndex}
          onCellMouseEnter={onCellMouseEnter}
          onCellMouseLeave={onCellMouseLeave}
          currentPlayer={currentPlayer}
          isActiveCell={isActiveMiniGrid}
        />
      ))}
      {winInfo && <WinningLine combination={winInfo.combination} gridType="mini" winner={winInfo.winner} />}
    </div>
  );
} 