import React from 'react';

export const WinningLine = ({ combination, gridType, winner }) => {
  if (!combination) return null;

  const getCoords = (index, type) => {
    const cellSize = type === 'mini' ? (100 / 3) : (100 / 3); // Percentage based
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = col * cellSize + cellSize / 2;
    const y = row * cellSize + cellSize / 2;
    return { x, y };
  };

  let startCell = getCoords(combination[0], gridType);
  let endCell = getCoords(combination[2], gridType);
  
  const lineColor = winner === 'X' ? 'red' : (winner === 'O' ? 'blue' : 'black');
  const lineStrokeWidth = gridType === 'mini' ? "1.5" : "3"; // Reduced stroke width

  // Extend line by 5 units on each side
  const dirX = endCell.x - startCell.x;
  const dirY = endCell.y - startCell.y;
  const len = Math.sqrt(dirX * dirX + dirY * dirY);
  const extension = 5; // 5 units in viewBox

  let extendedStartX = startCell.x;
  let extendedStartY = startCell.y;
  let extendedEndX = endCell.x;
  let extendedEndY = endCell.y;
  if (len > 0) {
    const normX = dirX / len;
    const normY = dirY / len;
    extendedStartX = startCell.x - normX * extension;
    extendedStartY = startCell.y - normY * extension;
    extendedEndX = endCell.x + normX * extension;
    extendedEndY = endCell.y + normY * extension;
  }

  return (
    <svg 
      className={`winning-line ${gridType}-winning-line`}
      preserveAspectRatio="xMidYMid meet"
      viewBox="0 0 100 100" // Using a 0-100 viewBox for easier percentage-based calcs
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    >
      <line 
        x1={`${extendedStartX}%`} y1={`${extendedStartY}%`} 
        x2={`${extendedEndX}%`} y2={`${extendedEndY}%`} 
        stroke={lineColor} 
        strokeWidth={lineStrokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
}; 