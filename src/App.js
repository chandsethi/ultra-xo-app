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
import { LoadStateModal } from './components/LoadStateModal';
import { usePersistentGameState } from './utils/hooks';

function App() {
  const {
    boardState, setBoardState,
    currentPlayer, setCurrentPlayer,
    miniGridWinInfo, setMiniGridWinInfo,
    megaGridWinInfo, setMegaGridWinInfo,
    activeMegaCellIndex, setActiveMegaCellIndex,
    history, setHistory,
    resetPersistedState
  } = usePersistentGameState();

  const initialRedoStack = () => [];
  const initialGameStateLog = () => [];
  const initialShowLogsModal = false;
  const initialShowLoadStateModal = false;

  const [hoveredCell, setHoveredCell] = useState({ mega: null, mini: null });
  const [redoStack, setRedoStack] = useState(initialRedoStack());
  const [gameStateLog, setGameStateLog] = useState(initialGameStateLog());
  const [showLogsModal, setShowLogsModal] = useState(initialShowLogsModal);
  const [showLoadStateModal, setShowLoadStateModal] = useState(initialShowLoadStateModal);

  useEffect(() => {
    if (currentPlayer === 'O' && !megaGridWinInfo) { 
      const botMoveResult = getBotMove(boardState, miniGridWinInfo, activeMegaCellIndex, 'O');

      if (botMoveResult && botMoveResult.move) {
        const { move, aiDecisionInfo } = botMoveResult;
        handleCellClick(move.megaCellIdx, move.miniCellIdx, aiDecisionInfo); 
      } else {
        console.log(`AI Log: Bot found no move to make from App.js useEffect. Decision info: ${botMoveResult.aiDecisionInfo}`);
      }
    }
  }, [currentPlayer, boardState, activeMegaCellIndex, miniGridWinInfo, megaGridWinInfo]); 

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
    if (megaGridWinInfo || 
        (miniGridWinInfo[megaCellIdx] && miniGridWinInfo[megaCellIdx].winner) || 
        boardState[megaCellIdx][miniCellIdx]) {
      return; 
    }
    if (activeMegaCellIndex !== null && activeMegaCellIndex !== megaCellIdx) {
      return;
    }

    const playerMakingTheMove = currentPlayer;

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

    const { 
      processedBoardState,
      processedMiniGridWinInfo,
      processedMegaGridWinInfo,
      processedActiveMegaCellIndex,
      processedNextPlayer,
      gameShouldContinue
    } = processPlayerMove(
      boardState, 
      miniGridWinInfo, 
      megaGridWinInfo, 
      activeMegaCellIndex, 
      currentPlayer, 
      megaCellIdx, 
      miniCellIdx
    );

    setBoardState(processedBoardState);
    setMiniGridWinInfo(processedMiniGridWinInfo);
    
    if (processedMegaGridWinInfo) {
      setMegaGridWinInfo(processedMegaGridWinInfo);
    }

    if (gameShouldContinue) {
      setActiveMegaCellIndex(processedActiveMegaCellIndex);
      setCurrentPlayer(processedNextPlayer);
    } else {
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
    resetPersistedState();
    setRedoStack(initialRedoStack());
    setGameStateLog(initialGameStateLog());
    setShowLogsModal(initialShowLogsModal);
    setShowLoadStateModal(initialShowLoadStateModal);
    setHoveredCell({ mega: null, mini: null });

    const htmlElement = document.documentElement;
    htmlElement.classList.remove('cursor-o-default', 'cursor-x-default');
    if (isSafari()) {
    }
  };

  const handleUndo = () => {
    if (history.length > 0) {
      const lastState = history[history.length - 1];
      setRedoStack(prevRedoStack => [
        {
          boardState: JSON.parse(JSON.stringify(boardState)),
          currentPlayer,
          miniGridWinInfo: JSON.parse(JSON.stringify(miniGridWinInfo)),
          megaGridWinInfo: megaGridWinInfo ? JSON.parse(JSON.stringify(megaGridWinInfo)) : null,
          activeMegaCellIndex,
        },
        ...prevRedoStack
      ]);

      setBoardState(lastState.boardState);
      setCurrentPlayer(lastState.currentPlayer);
      setMiniGridWinInfo(lastState.miniGridWinInfo);
      setMegaGridWinInfo(lastState.megaGridWinInfo);
      setActiveMegaCellIndex(lastState.activeMegaCellIndex);
      setHistory(prevHistory => prevHistory.slice(0, -1));
      setGameStateLog(prevLog => prevLog.slice(0, -1));
    }
  };

  const handleRedo = () => {
    if (redoStack.length > 0) {
      const nextState = redoStack[0];
      setHistory(prevHistory => [...prevHistory, 
        {
          boardState: JSON.parse(JSON.stringify(boardState)),
          currentPlayer,
          miniGridWinInfo: JSON.parse(JSON.stringify(miniGridWinInfo)),
          megaGridWinInfo: megaGridWinInfo ? JSON.parse(JSON.stringify(megaGridWinInfo)) : null,
          activeMegaCellIndex,
        }
      ]);
      
      setBoardState(nextState.boardState);
      setCurrentPlayer(nextState.currentPlayer);
      setMiniGridWinInfo(nextState.miniGridWinInfo);
      setMegaGridWinInfo(nextState.megaGridWinInfo);
      setActiveMegaCellIndex(nextState.activeMegaCellIndex);
      setRedoStack(prevRedoStack => prevRedoStack.slice(1));

      // Re-log the redone move. This requires knowing the move made.
      // For simplicity, this part is omitted. A more complex solution would store moves in history.
      // Or, re-construct log based on state change if AI made the move.
    }
  };

  const handleToggleLoadStateModal = () => {
    setShowLoadStateModal(!showLoadStateModal);
  };

  const handleLoadState = (gameStateString) => {
    const newBoardState = Array(9).fill(null).map(() => Array(9).fill(null));
    let charIndex = 0;
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        const char = gameStateString[charIndex++];
        if (char === 'x') newBoardState[i][j] = 'X';
        else if (char === 'o') newBoardState[i][j] = 'O';
        else newBoardState[i][j] = null;
      }
    }
    setBoardState(newBoardState);

    const newMiniGridWinInfo = Array(9).fill(null);
    for (let i = 0; i < 9; i++) {
      const miniGrid = newBoardState[i];
      const winCheck = checkWinAndCombination(miniGrid, WINNING_COMBINATIONS, (cell) => cell);
      if (winCheck) {
        newMiniGridWinInfo[i] = { winner: winCheck.winner, line: winCheck.line };
      } else if (isMiniGridFull(miniGrid)) {
        newMiniGridWinInfo[i] = { winner: 'D', line: null }; // D for Draw
      }
    }
    setMiniGridWinInfo(newMiniGridWinInfo);

    const mainBoardForMegaWin = newMiniGridWinInfo.map(info => info ? info.winner : null);
    const megaWinCheck = checkWinAndCombination(mainBoardForMegaWin, WINNING_COMBINATIONS, (cell) => cell);
    setMegaGridWinInfo(megaWinCheck ? { winner: megaWinCheck.winner, line: megaWinCheck.line, isDraw: false } : null);
    // Check for global draw if no winner and all relevant megaCells are decided
    if (!megaWinCheck) {
        let allDecided = true;
        for(let i=0; i<9; i++) {
            if (!newMiniGridWinInfo[i]) { // if a mini-grid is not won or drawn
                // And if the mega cell is not itself part of a winning line for current player
                // This logic can get complex, for now, simple check:
                // If any subgrid is undecided AND not part of a global win, game is not a global draw.
                allDecided = false;
                break;
            }
        }
        if (allDecided) {
             // Check if all mini-grids are full or won
            const isBoardFullOrAllMiniGridsDecided = newMiniGridWinInfo.every(info => info !== null) && 
                                                     newBoardState.every((mg, mgIdx) => isMiniGridFull(mg) || newMiniGridWinInfo[mgIdx] !== null);
            if (isBoardFullOrAllMiniGridsDecided) {
                setMegaGridWinInfo({ winner: 'D', line: null, isDraw: true });
            }
        }
    }

    setCurrentPlayer('X');
    setActiveMegaCellIndex(null);
    setHistory([]); // Clear history and start fresh
    setRedoStack([]);
    setGameStateLog([]); // Clear logs
    setHoveredCell({ mega: null, mini: null });
    setShowLoadStateModal(false); // Close modal
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
        onToggleLoadStateModal={handleToggleLoadStateModal}
        isRedoDisabled={redoStack.length === 0}
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
      <LoadStateModal 
        show={showLoadStateModal}
        onClose={() => setShowLoadStateModal(false)}
        onLoadState={handleLoadState}
      />
    </div>
  );
}

export default App;

