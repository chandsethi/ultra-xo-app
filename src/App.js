import React, { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import './App.css';
import { XIcon, OIcon } from './components/Icons';
import { WINNING_COMBINATIONS, LOCAL_STORAGE_KEY } from './utils/constants';
import { WinningLine } from './components/WinningLine';
import { Cell } from './components/Cell';
import { MiniGrid } from './components/MiniGrid';
import { MegaCell } from './components/MegaCell';
import { isSafari } from './utils/browserUtils';
import { 
  isMiniGridFull, 
  checkWinAndCombination, 
  simulateMove, 
  getEligibleMoves,
  processPlayerMove,
  getBotMove
} from './utils/gameLogic';
import { TopControls } from './components/TopControls';
import { LogModal } from './components/LogModal';
import { usePersistentGameState } from './utils/hooks'; // Import the custom hook

function App() {
  // States managed by the custom hook
  const {
    boardState, setBoardState,
    currentPlayer, setCurrentPlayer,
    miniGridWinInfo, setMiniGridWinInfo,
    megaGridWinInfo, setMegaGridWinInfo,
    activeMegaCellIndex, setActiveMegaCellIndex,
    history, setHistory,
    resetPersistedState
  } = usePersistentGameState();

  // States managed directly by App.js (not persisted or UI-specific)
  // const initialBoardState = () => Array(9).fill(null).map(() => Array(9).fill(null));
  // const initialPlayer = 'X';
  // const initialMiniGridWinInfo = () => Array(9).fill(null);
  // const initialMegaGridWinInfo = null;
  // const initialActiveMegaCellIndex = null;
  // const initialHistory = () => [];
  const initialRedoStack = () => [];
  const initialGameStateLog = () => [];
  const initialShowLogsModal = false;

  const [hoveredCell, setHoveredCell] = useState({ mega: null, mini: null });
  const [redoStack, setRedoStack] = useState(initialRedoStack());
  const [gameStateLog, setGameStateLog] = useState(initialGameStateLog());
  const [showLogsModal, setShowLogsModal] = useState(initialShowLogsModal);

  // useEffect for bot's turn
  useEffect(() => {
    if (currentPlayer === 'O' && !megaGridWinInfo) { 
      const botMoveResult = getBotMove(boardState, miniGridWinInfo, activeMegaCellIndex, 'O');

      if (botMoveResult && botMoveResult.move) {
        const { move, aiDecisionInfo } = botMoveResult;
        // Store aiDecisionInfo to be used after handleCellClick updates states
        // We can't directly pass it to handleCellClick as it doesn't expect it, 
        // and we need the state *after* the move for the log entry.
        // A simple way is to use a ref or a temporary state, but since this effect 
        // will re-run and handleCellClick is synchronous for state updates (within its scope),
        // we can leverage this. Let's create the base log string here and append AI info later.
        
        // Stash it for use in handleCellClick's logging section
        // This is a bit of a workaround. A cleaner way might involve passing a callback to handleCellClick
        // or making handleCellClick also return what it logged, but for now, this is simplest.
        // Or, more directly, reconstruct the log entry *after* handleCellClick.
        // For now, let's plan to pass it to handleCellClick, and modify handleCellClick to accept it.

        handleCellClick(move.megaCellIdx, move.miniCellIdx, aiDecisionInfo); 

      } else {
        // This case includes (botMoveResult.move === null)
        console.log(`AI Log: Bot found no move to make from App.js useEffect. Decision info: ${botMoveResult.aiDecisionInfo}`);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayer, boardState, activeMegaCellIndex, miniGridWinInfo, megaGridWinInfo]); 

  // Load game state from local storage on initial mount (MOVED TO HOOK)
  // useEffect(() => {
  //   try {
  //     const savedGame = localStorage.getItem(LOCAL_STORAGE_KEY);
  //     if (savedGame) {
  //       const gameState = JSON.parse(savedGame);
  //       setBoardState(gameState.boardState || initialBoardState());
  //       setCurrentPlayer(gameState.currentPlayer || initialPlayer);
  //       setMiniGridWinInfo(gameState.miniGridWinInfo || initialMiniGridWinInfo());
  //       setMegaGridWinInfo(gameState.megaGridWinInfo === undefined ? initialMegaGridWinInfo : gameState.megaGridWinInfo); // Allow null
  //       setActiveMegaCellIndex(gameState.activeMegaCellIndex === undefined ? initialActiveMegaCellIndex : gameState.activeMegaCellIndex); // Allow null
  //       setHistory(gameState.history || initialHistory());
  //       // redoStack and gameStateLog should not be loaded from localStorage for debugging purposes
  //       // setRedoStack(gameState.redoStack || initialRedoStack());
  //       // setGameStateLog(gameState.gameStateLog || initialGameStateLog());
  //     }
  //   } catch (error) {
  //     console.error("Failed to load game state from local storage:", error);
  //     // Optionally, clear corrupted storage
  //     // localStorage.removeItem(LOCAL_STORAGE_KEY);
  //   }
  // }, []); // Empty dependency array ensures this runs only once on mount

  // Save game state to local storage whenever it changes (MOVED TO HOOK)
  // useEffect(() => {
  //  ...
  // }, [boardState, currentPlayer, miniGridWinInfo, megaGridWinInfo, activeMegaCellIndex, history]);

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

  const handleCellClick = (megaCellIdx, miniCellIdx, aiDecisionInfoForLog = null) => {
    // Initial checks: game over, cell already won/taken, or invalid mega-cell target
    if (megaGridWinInfo || 
        (miniGridWinInfo[megaCellIdx] && miniGridWinInfo[megaCellIdx].winner) || 
        boardState[megaCellIdx][miniCellIdx]) {
      return; 
    }
    if (activeMegaCellIndex !== null && activeMegaCellIndex !== megaCellIdx) {
      return;
    }

    const playerMakingTheMove = currentPlayer;

    // Save current state for undo
    setHistory(prevHistory => [...prevHistory, 
      {
        boardState: JSON.parse(JSON.stringify(boardState)), // Deep copy
        currentPlayer,
        miniGridWinInfo: JSON.parse(JSON.stringify(miniGridWinInfo)), // Deep copy
        megaGridWinInfo: megaGridWinInfo ? JSON.parse(JSON.stringify(megaGridWinInfo)) : null, // Deep copy
        activeMegaCellIndex
      }
    ]);
    setRedoStack(initialRedoStack()); // Clear redo stack on new move

    // Get the new state by processing the move
    const { 
      processedBoardState,
      processedMiniGridWinInfo,
      processedMegaGridWinInfo,
      processedActiveMegaCellIndex,
      processedNextPlayer,
      gameShouldContinue // Renamed from gameContinues for clarity
    } = processPlayerMove(
      boardState, 
      miniGridWinInfo, 
      megaGridWinInfo, 
      activeMegaCellIndex, 
      currentPlayer, 
      megaCellIdx, 
      miniCellIdx
    );

    // Update React states
    setBoardState(processedBoardState);
    setMiniGridWinInfo(processedMiniGridWinInfo);
    
    if (processedMegaGridWinInfo) {
      setMegaGridWinInfo(processedMegaGridWinInfo);
    }

    if (gameShouldContinue) {
      setActiveMegaCellIndex(processedActiveMegaCellIndex);
      setCurrentPlayer(processedNextPlayer);
    } else {
      // If game does not continue (win/draw), currentPlayer doesn't change from the one who made the winning move.
      // activeMegaCellIndex might be set to null or handled by megaGridWinInfo presence.
      // Consider if activeMegaCellIndex needs explicit setting to null on game over.
      // For now, relying on megaGridWinInfo to stop further moves.
    }
    
    setHoveredCell({ mega: null, mini: null });

    const turnNumber = history.length; 
    
    const structuredBoardLog = {};
    for (let mgIdx = 0; mgIdx < 9; mgIdx++) {
      const megaWinner = processedMiniGridWinInfo[mgIdx] ? processedMiniGridWinInfo[mgIdx].winner : null;
      const miniGridLog = [];
      for (let mnIdx = 0; mnIdx < 9; mnIdx++) {
        const cellVal = processedBoardState[mgIdx][mnIdx];
        if (cellVal === 'X') {
          miniGridLog.push(megaWinner === 'X' ? 'X' : 'x'); 
        } else if (cellVal === 'O') {
          miniGridLog.push(megaWinner === 'O' ? 'O' : 'o');
        } else {
          miniGridLog.push('-');
        }
      }
      structuredBoardLog[mgIdx + 1] = miniGridLog; 
    }

    let boardString = "Board: \n{";
    for (let i = 1; i <= 9; i++) {
      boardString += `${i}: [${structuredBoardLog[i].join(',')}]`;
      if (i % 3 === 0) {
        boardString += (i === 9) ? "}" : ",\n";
      } else {
        boardString += ", ";
      }
    }
    
    let logEntryString = `Turn ${turnNumber}; ${playerMakingTheMove} played [mega ${megaCellIdx + 1}, mini ${miniCellIdx + 1}]`;
    if (playerMakingTheMove === 'O' && aiDecisionInfoForLog) {
      logEntryString += `; AI: ${aiDecisionInfoForLog}`;
    }
    logEntryString += `; Board: ${boardString}`;
    
    setGameStateLog(prevLog => [...prevLog, logEntryString]);
  };

  const resetGameState = () => {
    resetPersistedState(); // Reset states managed by the hook
    // Reset states managed by App.js
    setRedoStack(initialRedoStack());
    setGameStateLog(initialGameStateLog());
    setShowLogsModal(initialShowLogsModal);
    setHoveredCell({ mega: null, mini: null }); // Also reset hover

    const htmlElement = document.documentElement;
    htmlElement.classList.remove('cursor-o-default', 'cursor-x-default');
    if (isSafari()) {
      htmlElement.classList.add('cursor-x-default');
    }
    // localStorage.removeItem is now handled by resetPersistedState in the hook
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
      <TopControls 
        onNewGame={resetGameState}
        onUndo={handleUndo}
        canUndo={history.length > 0}
        onRedo={handleRedo}
        canRedo={redoStack.length > 0}
        onShowLogs={() => setShowLogsModal(true)}
      />
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
      <LogModal 
        show={showLogsModal}
        onClose={() => setShowLogsModal(false)}
        logEntries={gameStateLog}
      />
    </div>
  );
}

export default App;

