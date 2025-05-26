import React, { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import './App.css';

const XIcon = ({ isLarge = false, customClass = '', color = 'black' }) => (
  <svg 
    className={`icon-svg ${customClass}`}
    viewBox='0 0 24 24' 
    width={isLarge ? '100%' : '70%'} 
    height={isLarge ? '100%' : '70%'} 
    preserveAspectRatio='xMidYMid meet' 
    style={{ display: 'block', margin: isLarge ? '0' : 'auto', color: color }}
  >
    <path stroke='currentColor' strokeWidth={isLarge ? 2 : 3} strokeLinecap='square' d='M6 6 L18 18 M6 18 L18 6'/>
  </svg>
);

const OIcon = ({ isLarge = false, customClass = '', color = 'black' }) => (
  <svg 
    className={`icon-svg ${customClass}`}
    viewBox='0 0 24 24' 
    width={isLarge ? '100%' : '70%'} 
    height={isLarge ? '100%' : '70%'} 
    preserveAspectRatio='xMidYMid meet' 
    style={{ display: 'block', margin: isLarge ? '0' : 'auto', color: color }}
  >
    <circle cx='12' cy='12' r='8' stroke='currentColor' strokeWidth={isLarge ? 2 : 3} fill='none'/>
  </svg>
);

const WinningLine = ({ combination, gridType, winner }) => {
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

function Cell({ 
  value, 
  onClick, 
  megaIndex, 
  miniIndex, 
  hoveredMegaIndex, 
  hoveredMiniIndex, 
  onCellMouseEnter, 
  onCellMouseLeave, 
  currentPlayer,
  isActiveCell
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

  return (
    <div 
      className={cellClasses.join(' ')}
      onClick={onClick}
      onMouseEnter={() => onCellMouseEnter(megaIndex, miniIndex)}
      onMouseLeave={onCellMouseLeave}
    >
      {value === 'X' && <XIcon color="red" />}
      {value === 'O' && <OIcon color="blue" />}
      {isEmpty && isCurrentlyHovered && isActiveCell && !isSafari() && (
        <div className="hover-preview">
          {currentPlayer === 'X' ? <XIcon customClass="hover-icon" color="red"/> : <OIcon customClass="hover-icon" color="blue"/>}
        </div>
      )}
    </div>
  );
}

function MiniGrid({ 
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

function MegaCell({ 
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

const WINNING_COMBINATIONS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6]             // diagonals
];

const isMiniGridFull = (miniGridCells) => {
  return miniGridCells.every(cell => cell !== null);
};

const checkWinAndCombination = (gridCells) => {
  for (const combination of WINNING_COMBINATIONS) {
    const [a, b, c] = combination;
    if (gridCells[a] && gridCells[a] === gridCells[b] && gridCells[a] === gridCells[c]) {
      return { winner: gridCells[a], combination };
    }
  }
  return null;
};

const isSafari = () => {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('safari') && !ua.includes('chrome') && !ua.includes('android');
};

const LOCAL_STORAGE_KEY = 'ultraXOGameState';

// Helper function to simulate a move and check for a global win
const simulateMove = (boardState, miniGridWinInfo, megaCellIdx, miniCellIdx, player) => {
  // Create temporary copies for simulation
  const tempBoardState = boardState.map(megaCell => [...megaCell]);
  tempBoardState[megaCellIdx][miniCellIdx] = player;

  const tempMiniGridWinInfo = miniGridWinInfo.map(info => info ? { ...info } : null);

  // Check for local win in the affected mini-grid
  // Assumes the move is into a valid, open cell in an undecided mini-grid
  const miniWinCheck = checkWinAndCombination(tempBoardState[megaCellIdx]);
  if (miniWinCheck) {
    tempMiniGridWinInfo[megaCellIdx] = miniWinCheck;
  }

  // Check for global win based on the updated tempMiniGridWinInfo
  const megaGridCellsForWinCheck = tempMiniGridWinInfo.map(info => info ? info.winner : null);
  const overallWinCheck = checkWinAndCombination(megaGridCellsForWinCheck);

  return { globalWinDetails: overallWinCheck }; 
};

// Helper function to get eligible moves
const getEligibleMoves = (boardState, activeMegaCellIndex, miniGridWinInfo) => {
  const eligibleMoves = [];
  if (activeMegaCellIndex !== null && !miniGridWinInfo[activeMegaCellIndex] && !isMiniGridFull(boardState[activeMegaCellIndex])) {
    // Play in the target mega-cell
    for (let miniCellIdx = 0; miniCellIdx < 9; miniCellIdx++) {
      if (!boardState[activeMegaCellIndex][miniCellIdx]) {
        eligibleMoves.push({ megaCellIdx: activeMegaCellIndex, miniCellIdx });
      }
    }
  } else {
    // Play in any non-won and non-full mega-cell
    for (let megaCellIdx = 0; megaCellIdx < 9; megaCellIdx++) {
      if (!miniGridWinInfo[megaCellIdx] && !isMiniGridFull(boardState[megaCellIdx])) {
        for (let miniCellIdx = 0; miniCellIdx < 9; miniCellIdx++) {
          if (!boardState[megaCellIdx][miniCellIdx]) {
            eligibleMoves.push({ megaCellIdx, miniCellIdx });
          }
        }
      }
    }
  }
  return eligibleMoves;
};

function App() {
  const initialBoardState = () => Array(9).fill(null).map(() => Array(9).fill(null));
  const initialPlayer = 'X';
  const initialMiniGridWinInfo = () => Array(9).fill(null);
  const initialMegaGridWinInfo = null;
  const initialActiveMegaCellIndex = null;
  const initialHistory = () => [];
  const initialRedoStack = () => [];
  const initialGameStateLog = () => [];
  const initialShowLogsModal = false;

  const [boardState, setBoardState] = useState(initialBoardState());
  const [currentPlayer, setCurrentPlayer] = useState(initialPlayer);
  const [hoveredCell, setHoveredCell] = useState({ mega: null, mini: null });
  const [miniGridWinInfo, setMiniGridWinInfo] = useState(initialMiniGridWinInfo());
  const [megaGridWinInfo, setMegaGridWinInfo] = useState(initialMegaGridWinInfo);
  const [activeMegaCellIndex, setActiveMegaCellIndex] = useState(initialActiveMegaCellIndex);
  const [history, setHistory] = useState(initialHistory());
  const [redoStack, setRedoStack] = useState(initialRedoStack());
  const [gameStateLog, setGameStateLog] = useState(initialGameStateLog());
  const [showLogsModal, setShowLogsModal] = useState(initialShowLogsModal);

  // useEffect for bot's turn
  useEffect(() => {
    if (currentPlayer === 'O' && !megaGridWinInfo) { // Check if it's Bot's turn and game is not over
      const eligibleMoves = getEligibleMoves(boardState, activeMegaCellIndex, miniGridWinInfo);
      
      if (eligibleMoves.length === 0) {
        return; // No moves available for the bot
      }

      // 1. Check for Bot's ('O') immediate win
      for (const botMove of eligibleMoves) {
        const { globalWinDetails } = simulateMove(boardState, miniGridWinInfo, botMove.megaCellIdx, botMove.miniCellIdx, 'O');
        if (globalWinDetails && globalWinDetails.winner === 'O') {
          handleCellClick(botMove.megaCellIdx, botMove.miniCellIdx);
          return;
        }
      }

      // 2. Check for User's ('X') immediate win to block
      let moveToBlockUserWin = null;
      // Iterate through all possible cells on the board to find where User 'X' could win
      for (let megaIdx = 0; megaIdx < 9; megaIdx++) {
        for (let miniIdx = 0; miniIdx < 9; miniIdx++) {
          if (!boardState[megaIdx][miniIdx]) { // If cell is empty
            const { globalWinDetails: userGlobalWin } = simulateMove(boardState, miniGridWinInfo, megaIdx, miniIdx, 'X');
            if (userGlobalWin && userGlobalWin.winner === 'X') {
              // User 'X' can win by playing at (megaIdx, miniIdx).
              // Is this cell among Bot's current eligible moves?
              const isBlockableByBot = eligibleMoves.some(
                em => em.megaCellIdx === megaIdx && em.miniCellIdx === miniIdx
              );
              if (isBlockableByBot) {
                moveToBlockUserWin = { megaCellIdx: megaIdx, miniCellIdx: miniIdx };
                break; // Found a cell Bot can play to block User's win
              }
            }
          }
        }
        if (moveToBlockUserWin) break; // Exit outer loop if block move is found
      }

      if (moveToBlockUserWin) {
        handleCellClick(moveToBlockUserWin.megaCellIdx, moveToBlockUserWin.miniCellIdx);
        return;
      }

      // 3. Fallback: Play a random eligible move
      const randomMove = eligibleMoves[Math.floor(Math.random() * eligibleMoves.length)];
      handleCellClick(randomMove.megaCellIdx, randomMove.miniCellIdx);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayer, boardState, activeMegaCellIndex, miniGridWinInfo, megaGridWinInfo, /* handleCellClick */]); 
  // Added handleCellClick to dependency array in comment as it should be there or memoized.
  // For now, to avoid potential infinite loops if handleCellClick is not stable, 
  // will rely on ESLint disable. Ideally, handleCellClick should be wrapped in useCallback.

  // Load game state from local storage on initial mount
  useEffect(() => {
    try {
      const savedGame = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedGame) {
        const gameState = JSON.parse(savedGame);
        setBoardState(gameState.boardState || initialBoardState());
        setCurrentPlayer(gameState.currentPlayer || initialPlayer);
        setMiniGridWinInfo(gameState.miniGridWinInfo || initialMiniGridWinInfo());
        setMegaGridWinInfo(gameState.megaGridWinInfo === undefined ? initialMegaGridWinInfo : gameState.megaGridWinInfo); // Allow null
        setActiveMegaCellIndex(gameState.activeMegaCellIndex === undefined ? initialActiveMegaCellIndex : gameState.activeMegaCellIndex); // Allow null
        setHistory(gameState.history || initialHistory());
        // redoStack and gameStateLog should not be loaded from localStorage for debugging purposes
        // setRedoStack(gameState.redoStack || initialRedoStack());
        // setGameStateLog(gameState.gameStateLog || initialGameStateLog());
      }
    } catch (error) {
      console.error("Failed to load game state from local storage:", error);
      // Optionally, clear corrupted storage
      // localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  // Save game state to local storage whenever it changes
  useEffect(() => {
    const gameState = {
      boardState,
      currentPlayer,
      miniGridWinInfo,
      megaGridWinInfo,
      activeMegaCellIndex,
      history
      // redoStack and gameStateLog are not part of persisted state
      // redoStack,
      // gameStateLog
    };
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(gameState));
    } catch (error) {
      console.error("Failed to save game state to local storage:", error);
    }
  }, [boardState, currentPlayer, miniGridWinInfo, megaGridWinInfo, activeMegaCellIndex, history]);

  useEffect(() => {
    const htmlElement = document.documentElement;
    htmlElement.classList.remove('cursor-x-default', 'cursor-o-default', 'safari-styles');

    if (isSafari()) {
      htmlElement.classList.add('safari-styles');
      if (!megaGridWinInfo) {
        if (currentPlayer === 'X') {
          htmlElement.classList.add('cursor-x-default');
        } else {
          htmlElement.classList.add('cursor-o-default');
        }
      }
    } 
    return () => {
      htmlElement.classList.remove('cursor-x-default', 'cursor-o-default', 'safari-styles');
    };
  }, [currentPlayer, megaGridWinInfo]);

  const handleCellMouseEnter = (mega, mini) => {
    if (megaGridWinInfo || (miniGridWinInfo[mega] && miniGridWinInfo[mega].winner)) return;
    if (activeMegaCellIndex === null || activeMegaCellIndex === mega) {
      setHoveredCell({ mega, mini });
    }
  };

  const handleCellMouseLeave = () => {
    setHoveredCell({ mega: null, mini: null });
  };

  const handleCellClick = (megaCellIdx, miniCellIdx) => {
    if (megaGridWinInfo || 
        (miniGridWinInfo[megaCellIdx] && miniGridWinInfo[megaCellIdx].winner) || 
        boardState[megaCellIdx][miniCellIdx]) {
      return; 
    }

    if (activeMegaCellIndex !== null && activeMegaCellIndex !== megaCellIdx) {
      return;
    }

    // Player who made this move (before switching)
    const movePlayer = currentPlayer;

    setHistory(prevHistory => [...prevHistory, 
      {
        boardState: JSON.parse(JSON.stringify(boardState)),
        currentPlayer,
        miniGridWinInfo: JSON.parse(JSON.stringify(miniGridWinInfo)),
        megaGridWinInfo: megaGridWinInfo ? JSON.parse(JSON.stringify(megaGridWinInfo)) : null, 
        activeMegaCellIndex
      }
    ]);
    setRedoStack(initialRedoStack());

    const newBoardState = boardState.map((megaCell, mIdx) => 
      mIdx === megaCellIdx 
        ? megaCell.map((cell, cIdx) => (cIdx === miniCellIdx ? currentPlayer : cell))
        : megaCell
    );
    setBoardState(newBoardState);

    const currentMiniGridCells = newBoardState[megaCellIdx];
    const miniWinCheck = checkWinAndCombination(currentMiniGridCells);
    let newMiniGridWinInfo = [...miniGridWinInfo];
    let gameContinues = true;
    let newMegaGridWinInfo = megaGridWinInfo; // Use a new variable for megaGridWinInfo within this scope

    if (miniWinCheck && !(miniGridWinInfo[megaCellIdx] && miniGridWinInfo[megaCellIdx].winner)) {
      newMiniGridWinInfo[megaCellIdx] = miniWinCheck;
      setMiniGridWinInfo(newMiniGridWinInfo);

      const megaGridCellsForWinCheck = newMiniGridWinInfo.map(info => info ? info.winner : null);
      const overallWinCheck = checkWinAndCombination(megaGridCellsForWinCheck);
      if (overallWinCheck) {
        newMegaGridWinInfo = overallWinCheck; // Update local newMegaGridWinInfo
        setMegaGridWinInfo(overallWinCheck);
        gameContinues = false; 
      }
    }
    
    if (gameContinues) {
      const nextTargetMegaCellIndex = miniCellIdx;
      if (newMiniGridWinInfo[nextTargetMegaCellIndex] && newMiniGridWinInfo[nextTargetMegaCellIndex].winner) {
        setActiveMegaCellIndex(null);
      } else if (isMiniGridFull(newBoardState[nextTargetMegaCellIndex])) {
        setActiveMegaCellIndex(null);
      } else {
        setActiveMegaCellIndex(nextTargetMegaCellIndex);
      }
      setCurrentPlayer(currentPlayer === 'X' ? 'O' : 'X');
    }
    
    setHoveredCell({ mega: null, mini: null });

    // Add to game state log
    const turnNumber = history.length; // history.length is now 1-based for the turn number
    const playerWhoMadeTheMove = movePlayer;

    let boardRepresentation = [];
    for (let mgIdx = 0; mgIdx < 9; mgIdx++) {
      const megaWinner = newMiniGridWinInfo[mgIdx] ? newMiniGridWinInfo[mgIdx].winner : null;
      for (let mnIdx = 0; mnIdx < 9; mnIdx++) {
        const cellVal = newBoardState[mgIdx][mnIdx];
        if (cellVal === 'X') {
          boardRepresentation.push(megaWinner === 'X' ? 'X' : 'x');
        } else if (cellVal === 'O') {
          boardRepresentation.push(megaWinner === 'O' ? 'O' : 'o');
        } else {
          boardRepresentation.push('-');
        }
      }
    }
    const boardString = boardRepresentation.join(',');

    const logEntryString = `Turn ${turnNumber}; ${playerWhoMadeTheMove} played [mega ${megaCellIdx}, mini ${miniCellIdx}]; Board: [${boardString}]`;
    setGameStateLog(prevLog => [...prevLog, logEntryString]);
  };

  const resetGameState = () => {
    setBoardState(initialBoardState());
    setCurrentPlayer(initialPlayer);
    setMiniGridWinInfo(initialMiniGridWinInfo());
    setMegaGridWinInfo(initialMegaGridWinInfo);
    setActiveMegaCellIndex(initialActiveMegaCellIndex);
    setHistory(initialHistory());
    setRedoStack(initialRedoStack());
    setGameStateLog(initialGameStateLog());
    setShowLogsModal(initialShowLogsModal); // Reset modal state
    const htmlElement = document.documentElement;
    htmlElement.classList.remove('cursor-o-default', 'cursor-x-default');
    if (isSafari()) {
      htmlElement.classList.add('cursor-x-default');
    }
    // Clear saved game from local storage
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (error) {
      console.error("Failed to remove game state from local storage:", error);
    }
  };

  const handleUndo = () => {
    if (history.length === 0) return;

    // Capture current state to push to redoStack
    const currentStateForRedo = {
      boardState: JSON.parse(JSON.stringify(boardState)),
      currentPlayer,
      miniGridWinInfo: JSON.parse(JSON.stringify(miniGridWinInfo)),
      megaGridWinInfo: megaGridWinInfo ? JSON.parse(JSON.stringify(megaGridWinInfo)) : null,
      activeMegaCellIndex,
      // We might also want to save the game log state if undo/redo should affect it
      // For now, game log will be linear and not affected by undo/redo for simplicity of debugging.
    };
    setRedoStack(prevRedoStack => [currentStateForRedo, ...prevRedoStack]);

    const lastState = history[history.length - 1];
    setBoardState(JSON.parse(JSON.stringify(lastState.boardState))); 
    setCurrentPlayer(lastState.currentPlayer);
    setMiniGridWinInfo(JSON.parse(JSON.stringify(lastState.miniGridWinInfo)));
    setMegaGridWinInfo(lastState.megaGridWinInfo ? JSON.parse(JSON.stringify(lastState.megaGridWinInfo)) : null);
    setActiveMegaCellIndex(lastState.activeMegaCellIndex);
    
    setHistory(prevHistory => prevHistory.slice(0, -1));
    setHoveredCell({ mega: null, mini: null }); 

    // Log undo action (optional, could also just let the state reflect)
    // setGameStateLog(prevLog => [...prevLog, { turn: 'Undo', player: 'N/A'}]);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;

    const stateToRedo = redoStack[0];

    // Push current state to history before redoing
    setHistory(prevHistory => [...prevHistory, 
      {
        boardState: JSON.parse(JSON.stringify(boardState)),
        currentPlayer,
        miniGridWinInfo: JSON.parse(JSON.stringify(miniGridWinInfo)),
        megaGridWinInfo: megaGridWinInfo ? JSON.parse(JSON.stringify(megaGridWinInfo)) : null,
        activeMegaCellIndex
      }
    ]);

    setBoardState(JSON.parse(JSON.stringify(stateToRedo.boardState)));
    setCurrentPlayer(stateToRedo.currentPlayer);
    setMiniGridWinInfo(JSON.parse(JSON.stringify(stateToRedo.miniGridWinInfo)));
    setMegaGridWinInfo(stateToRedo.megaGridWinInfo ? JSON.parse(JSON.stringify(stateToRedo.megaGridWinInfo)) : null);
    setActiveMegaCellIndex(stateToRedo.activeMegaCellIndex);

    setRedoStack(prevRedoStack => prevRedoStack.slice(1));
    setHoveredCell({ mega: null, mini: null });

    // Log redo action (optional)
    // setGameStateLog(prevLog => [...prevLog, { turn: 'Redo', player: 'N/A'}]);
  };

  return (
    <div className="app-container">
      <div className="top-controls">
        <button onClick={resetGameState} className="new-game-button">
          New Game
        </button>
        <button onClick={handleUndo} className="undo-button" disabled={history.length === 0}>
          Undo
        </button>
        <button onClick={handleRedo} className="redo-button" disabled={redoStack.length === 0}>
          Redo
        </button>
        <button onClick={() => setShowLogsModal(true)} className="show-logs-button">
          Show Logs
        </button>
      </div>
      <div className={`mega-grid ${megaGridWinInfo ? 'game-over' : ''}`} style={{ position: 'relative'}}>
        {boardState.map((individualMiniGridCells, idx) => (
          <MegaCell 
            key={idx} 
            megaCellIndex={idx} 
            miniGridCells={individualMiniGridCells} 
            onCellClick={handleCellClick} 
            hoveredMegaIndex={hoveredCell.mega}
            hoveredMiniIndex={hoveredCell.mini}
            onCellMouseEnter={handleCellMouseEnter}
            onCellMouseLeave={handleCellMouseLeave}
            currentPlayer={currentPlayer}
            winInfo={miniGridWinInfo[idx]} 
            isActiveMegaCell={activeMegaCellIndex === null || activeMegaCellIndex === idx}
          />
        ))}
        {megaGridWinInfo && 
          <WinningLine 
            combination={megaGridWinInfo.combination} 
            gridType="mega" 
            winner={megaGridWinInfo.winner} 
          />}
      </div>
      <Analytics />
      {/* Game State Log Modal */}
      {showLogsModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Game State Log</h3>
              <button onClick={() => setShowLogsModal(false)} className="modal-close-button">&times;</button>
            </div>
            <div className="modal-body">
              {gameStateLog.length > 0 ? (
                gameStateLog.map((logLine, index) => (
                  <p key={index} className="log-line">{logLine}</p>
                ))
              ) : (
                <p>No logs yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
