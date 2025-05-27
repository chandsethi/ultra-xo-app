import React, { useState, useEffect, useCallback } from 'react';
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

const IS_DEVELOPMENT_MODE = true; // Manually toggle this for dev/prod

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

  // State for blinking animation
  const [blinkingCell, setBlinkingCell] = useState({ mega: null, mini: null });
  const [isBlinking, setIsBlinking] = useState(false);
  const [blinkShowIcon, setBlinkShowIcon] = useState(true);
  const [botMoveToFinalize, setBotMoveToFinalize] = useState(null); // To store the bot's move details

  // Wrapped in useCallback to ensure stable reference if used in other useEffect deps
  const completeBotTurnAndSwitchPlayer = useCallback(() => {
    if (!botMoveToFinalize) return;

    const { megaCellIdx, miniCellIdx } = botMoveToFinalize;

    // Determine next active mega cell based on where the bot (O) played
    let nextActiveMegaCellForX = miniCellIdx;
    // Need boardState and miniGridWinInfo at the point of O's move completion
    // Assuming boardState and miniGridWinInfo are already updated with O's move
    if ((miniGridWinInfo[nextActiveMegaCellForX] && miniGridWinInfo[nextActiveMegaCellForX].winner) || 
        isMiniGridFull(boardState[nextActiveMegaCellForX])) {
      nextActiveMegaCellForX = null;
    }

    setActiveMegaCellIndex(nextActiveMegaCellForX);
    setCurrentPlayer('X');
    
    setBlinkingCell({ mega: null, mini: null });
    setBotMoveToFinalize(null);
  }, [botMoveToFinalize, boardState, miniGridWinInfo, setActiveMegaCellIndex, setCurrentPlayer]);

  useEffect(() => {
    if (currentPlayer === 'O' && !megaGridWinInfo && !isBlinking) { 
      const botMoveResult = getBotMove(boardState, miniGridWinInfo, activeMegaCellIndex, 'O');

      if (botMoveResult && botMoveResult.move) {
        const { move, aiDecisionInfo } = botMoveResult;
        // Store the move to be finalized after blinking
        setBotMoveToFinalize(move); 

        // --- Part 1: Apply bot's move visually, log it, and start blinking --- 
        const playerMakingTheMove = 'O';

        setHistory(prevHistory => [...prevHistory, 
          {
            boardState: JSON.parse(JSON.stringify(boardState)),
            currentPlayer: playerMakingTheMove, // Log 'O' as current player for this state
            miniGridWinInfo: JSON.parse(JSON.stringify(miniGridWinInfo)),
            megaGridWinInfo: megaGridWinInfo ? JSON.parse(JSON.stringify(megaGridWinInfo)) : null,
            activeMegaCellIndex // Log activeMegaCellIndex as it was for O's turn
          }
        ]);
        setRedoStack(initialRedoStack());

        // Directly update board state for 'O'
        const newBoardState = boardState.map((megaCell, mIdx) => 
          mIdx === move.megaCellIdx 
            ? megaCell.map((cell, cIdx) => (cIdx === move.miniCellIdx ? playerMakingTheMove : cell))
            : megaCell
        );
        setBoardState(newBoardState);

        // Recalculate win info based on O's move
        let newMiniGridWinInfo = miniGridWinInfo.map(info => info ? { ...info } : null);
        let newMegaGridWinInfo = megaGridWinInfo ? { ...megaGridWinInfo } : null;
        
        const affectedMiniGridCells = newBoardState[move.megaCellIdx];
        const miniWinCheck = checkWinAndCombination(affectedMiniGridCells);
        if (miniWinCheck && (!newMiniGridWinInfo[move.megaCellIdx] || !newMiniGridWinInfo[move.megaCellIdx].winner)) {
          newMiniGridWinInfo[move.megaCellIdx] = miniWinCheck;
          const megaGridCellsForWinCheck = newMiniGridWinInfo.map(info => info ? info.winner : null);
          const overallWinCheck = checkWinAndCombination(megaGridCellsForWinCheck);
          if (overallWinCheck) {
            newMegaGridWinInfo = overallWinCheck;
            // If bot wins, no blinking, just show result (or handle game over state differently)
            setMegaGridWinInfo(newMegaGridWinInfo);
            // Potentially skip blinking if game ends
            // For now, we'll let it blink, then game over state will be apparent
          }
        }
        setMiniGridWinInfo(newMiniGridWinInfo);
        if (newMegaGridWinInfo && (!megaGridWinInfo || newMegaGridWinInfo.winner !== megaGridWinInfo.winner )){
            setMegaGridWinInfo(newMegaGridWinInfo);
            if(newMegaGridWinInfo.winner) {
                 // Game ended by bot's move, skip further blinking/turn switch if desired
                 // For now, let blinking proceed, game over will be clear.
            }
        }

        // Logging the bot's move
        const turnNumber = history.length; // history has just been updated
        const structuredBoardLog = {}; // Rebuild or adapt existing log generation
        for (let mgIdx = 0; mgIdx < 9; mgIdx++) {
          const megaWinner = newMiniGridWinInfo[mgIdx] ? newMiniGridWinInfo[mgIdx].winner : null;
          const miniGridLog = [];
          for (let mnIdx = 0; mnIdx < 9; mnIdx++) {
            const cellVal = newBoardState[mgIdx][mnIdx];
            if (cellVal === 'X') miniGridLog.push(megaWinner === 'X' ? 'X' : 'x'); 
            else if (cellVal === 'O') miniGridLog.push(megaWinner === 'O' ? 'O' : 'o');
            else miniGridLog.push('-');
          }
          structuredBoardLog[mgIdx + 1] = miniGridLog; 
        }
        let boardString = "Board: \n{";
        for (let i = 1; i <= 9; i++) {
          boardString += `${i}: [${structuredBoardLog[i].join(',')}]`;
          if (i % 3 === 0) boardString += (i === 9) ? "}" : ",\n";
          else boardString += ", ";
        }
        let logEntryString = `Turn ${turnNumber}; ${playerMakingTheMove} played [mega ${move.megaCellIdx + 1}, mini ${move.miniCellIdx + 1}]`;
        if (aiDecisionInfo) logEntryString += `; AI: ${aiDecisionInfo}`;
        logEntryString += `; Board: ${boardString}`;
        setGameStateLog(prevLog => [...prevLog, logEntryString]);
        
        // Start blinking
        setBlinkingCell({ mega: move.megaCellIdx, mini: move.miniCellIdx });
        setIsBlinking(true);
        setBlinkShowIcon(true); // Start with icon visible

      } else {
        // No move found by bot, shouldn't usually happen if eligible moves exist
        console.log(`AI Log: Bot found no move to make from App.js useEffect. Decision info: ${botMoveResult.aiDecisionInfo}`);
        // Consider switching to player X if bot truly has no move and game isn't over
        // For now, this might halt the game, needs robust handling if it occurs.
        // setCurrentPlayer('X'); // Fallback if bot fails? Or should gameLogic handle draws?
      }
    }
  }, [currentPlayer, boardState, miniGridWinInfo, megaGridWinInfo, activeMegaCellIndex, isBlinking, history, setHistory, setBoardState, setMiniGridWinInfo, setMegaGridWinInfo, setGameStateLog]); 

  // useEffect for the blinking animation itself
  useEffect(() => {
    let t1, t2, t3, t4, t5; // Timeout IDs for the new blinking sequence

    if (isBlinking && blinkingCell.mega !== null) {
      // Start with icon invisible for the initial 1-second delay
      setBlinkShowIcon(false);

      t1 = setTimeout(() => {
        // After 1s, start the first V-I cycle
        setBlinkShowIcon(true); // Visible for 250ms
        t2 = setTimeout(() => {
          setBlinkShowIcon(false); // Invisible for 250ms
          t3 = setTimeout(() => {
            // Start the second V-I cycle
            setBlinkShowIcon(true); // Visible for 250ms
            t4 = setTimeout(() => {
              setBlinkShowIcon(false); // Invisible for 250ms
              t5 = setTimeout(() => {
                // End of animation
                setBlinkShowIcon(true); // Ensure icon is finally visible
                setIsBlinking(false);
                completeBotTurnAndSwitchPlayer();
              }, 250); // Duration of the second invisible part
            }, 250); // Duration of the second visible part
          }, 250); // Duration of the first invisible part
        }, 250); // Duration of the first visible part
      }, 1000); // Initial 1-second delay (invisible)

      return () => { // Cleanup function to clear all timeouts
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
        clearTimeout(t5);
      };
    }
  }, [isBlinking, blinkingCell, completeBotTurnAndSwitchPlayer]);

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
    if (isBlinking) return;
    if (megaGridWinInfo || (miniGridWinInfo[mega] && miniGridWinInfo[mega].winner)) return;
    if (activeMegaCellIndex === null || activeMegaCellIndex === mega) {
      setHoveredCell({ mega, mini });
    }
  };

  const handleCellMouseLeave = () => {
    if (isBlinking) return; // Potentially keep hover if blinking, or clear, user preference
    setHoveredCell({ mega: null, mini: null });
  };

  const handleCellClick = (megaCellIdx, miniCellIdx, aiDecisionInfoForLog = null) => {
    // Prevent user clicks if it's O's turn and blinking, or game over
    if ((currentPlayer === 'O' && isBlinking) || megaGridWinInfo) return;

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
    
    // Only construct log for human player here
    if (playerMakingTheMove === 'X') {
      const structuredBoardLog = {};
      for (let mgIdx = 0; mgIdx < 9; mgIdx++) {
        const megaWinner = processedMiniGridWinInfo[mgIdx] ? processedMiniGridWinInfo[mgIdx].winner : null;
        const miniGridLog = [];
        for (let mnIdx = 0; mnIdx < 9; mnIdx++) {
          const cellVal = processedBoardState[mgIdx][mnIdx];
          if (cellVal === 'X') miniGridLog.push(megaWinner === 'X' ? 'X' : 'x'); 
          else if (cellVal === 'O') miniGridLog.push(megaWinner === 'O' ? 'O' : 'o');
          else miniGridLog.push('-');
        }
        structuredBoardLog[mgIdx + 1] = miniGridLog; 
      }
      let boardString = "Board: \n{";
      for (let i = 1; i <= 9; i++) {
        boardString += `${i}: [${structuredBoardLog[i].join(',')}]`;
        if (i % 3 === 0) boardString += (i === 9) ? "}" : ",\n";
        else boardString += ", ";
      }
      let logEntryString = `Turn ${turnNumber}; ${playerMakingTheMove} played [mega ${megaCellIdx + 1}, mini ${miniCellIdx + 1}]`;
      // aiDecisionInfoForLog is for bot, human moves don't have it here.
      logEntryString += `; Board: ${boardString}`;
      setGameStateLog(prevLog => [...prevLog, logEntryString]);
    }
  };

  const resetGameState = () => {
    resetPersistedState();
    setRedoStack(initialRedoStack());
    setGameStateLog(initialGameStateLog());
    setShowLogsModal(initialShowLogsModal);
    setShowLoadStateModal(initialShowLoadStateModal);
    setHoveredCell({ mega: null, mini: null });

    // Reset blinking states
    setIsBlinking(false);
    setBlinkingCell({ mega: null, mini: null });
    setBlinkShowIcon(true);
    setBotMoveToFinalize(null);

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
        showDevControls={IS_DEVELOPMENT_MODE}
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
            // Blinking props for MegaCell to pass to Cell
            blinkingCellGlobal={blinkingCell} // Use a different prop name to avoid conflict if MegaCell itself had a 'blinkingCell' concept
            blinkShowIconGlobal={blinkShowIcon}
            isCurrentlyBlinking={isBlinking}
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

