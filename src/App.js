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
import NavBar from './components/NavBar';
import DevControls from './components/DevControls';
import { LogModal } from './components/LogModal';
import { LoadStateModal } from './components/LoadStateModal';
import { usePersistentGameState } from './utils/hooks';
import ShareSection from './components/ShareSection';
import CollapsibleHelpWindow from './components/CollapsibleHelpWindow';

const IS_DEVELOPMENT_MODE = process.env.NODE_ENV === 'development'; // Use environment variable

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
  const [showShareSection, setShowShareSection] = useState(false);
  const [lastBotMoveDetails, setLastBotMoveDetails] = useState('');

  // State for blinking animation
  const [blinkingCell, setBlinkingCell] = useState({ mega: null, mini: null });
  const [isBlinking, setIsBlinking] = useState(false);
  const [blinkShowIcon, setBlinkShowIcon] = useState(true);
  const [pendingFinalization, setPendingFinalization] = useState(null);
  const [megaCellAwaitingReveal, setMegaCellAwaitingReveal] = useState(null);

  useEffect(() => {
    if (currentPlayer === 'O' && !megaGridWinInfo && !isBlinking && !pendingFinalization) {
      const botMoveResult = getBotMove(boardState, miniGridWinInfo, activeMegaCellIndex, 'O');

      if (botMoveResult && botMoveResult.move) {
        const { move, aiDecisionInfo } = botMoveResult;
        const playerMakingTheMove = 'O';

        // Standard history update
        setHistory(prevHistory => [...prevHistory, 
          {
            boardState: JSON.parse(JSON.stringify(boardState)),
            currentPlayer: playerMakingTheMove,
            miniGridWinInfo: JSON.parse(JSON.stringify(miniGridWinInfo)),
            megaGridWinInfo: megaGridWinInfo ? JSON.parse(JSON.stringify(megaGridWinInfo)) : null,
            activeMegaCellIndex
          }
        ]);
        setRedoStack(initialRedoStack());

        // Update board state for 'O's move
        const newBoardState = boardState.map((megaCell, mIdx) => 
          mIdx === move.megaCellIdx 
            ? megaCell.map((cell, cIdx) => (cIdx === move.miniCellIdx ? playerMakingTheMove : cell))
            : megaCell
        );
        setBoardState(newBoardState);

        // Recalculate win info based on O's move
        let newMiniGridWinInfoWithBotWin = miniGridWinInfo.map(info => info ? { ...info } : null);
        let overallWinCheckForBot = megaGridWinInfo ? { ...megaGridWinInfo } : null; // Start with current megaGridWinInfo
        
        const affectedMiniGridCells = newBoardState[move.megaCellIdx];
        const miniWinCheck = checkWinAndCombination(affectedMiniGridCells);

        let botCausedMiniWin = false;
        if (miniWinCheck && (!newMiniGridWinInfoWithBotWin[move.megaCellIdx] || !newMiniGridWinInfoWithBotWin[move.megaCellIdx].winner)) {
          newMiniGridWinInfoWithBotWin[move.megaCellIdx] = miniWinCheck;
          botCausedMiniWin = true;
          const megaGridCellsForWinCheck = newMiniGridWinInfoWithBotWin.map(info => info ? info.winner : null);
          const checkMega = checkWinAndCombination(megaGridCellsForWinCheck);
          if (checkMega) {
            overallWinCheckForBot = checkMega;
          }
        }
        
        // Determine next active mega cell for X
        let nextActiveMegaCellForX = move.miniCellIdx;
        if ((newMiniGridWinInfoWithBotWin[nextActiveMegaCellForX] && newMiniGridWinInfoWithBotWin[nextActiveMegaCellForX].winner) || 
            isMiniGridFull(newBoardState[nextActiveMegaCellForX])) {
          nextActiveMegaCellForX = null;
        }

        // Set up for finalization after blinking
        setPendingFinalization({
          type: 'bot',
          move: { megaCellIdx: move.megaCellIdx, miniCellIdx: move.miniCellIdx },
          miniGridWinInfoToSet: newMiniGridWinInfoWithBotWin, 
          megaGridWinInfoToSet: overallWinCheckForBot,
          nextActiveMegaCell: nextActiveMegaCellForX,
          nextPlayer: 'X'
        });

        // Logging
        const turnNumber = history.length; 
        const structuredBoardLog = {}; 
        for (let mgIdx = 0; mgIdx < 9; mgIdx++) {
          const megaWinner = newMiniGridWinInfoWithBotWin[mgIdx] ? newMiniGridWinInfoWithBotWin[mgIdx].winner : null;
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
        
        let botMoveDisplayString = `Turn ${turnNumber}; O played [mega ${move.megaCellIdx + 1}, mini ${move.miniCellIdx + 1}];`;
        if (aiDecisionInfo) {
          botMoveDisplayString = botMoveDisplayString + " AI: " + aiDecisionInfo;
        }
        setLastBotMoveDetails(aiDecisionInfo);
        
        // Start blinking
        setBlinkingCell({ mega: move.megaCellIdx, mini: move.miniCellIdx });
        setIsBlinking(true);
        setBlinkShowIcon(true); 

      } else {
        console.log(`AI Log: Bot found no move to make. Decision info: ${botMoveResult?.aiDecisionInfo}`);
      }
    }
  }, [currentPlayer, boardState, miniGridWinInfo, megaGridWinInfo, activeMegaCellIndex, isBlinking, pendingFinalization, history, setHistory, setBoardState, setGameStateLog, setLastBotMoveDetails]); 

  // useEffect for the blinking animation itself
  useEffect(() => {
    let t1, t2, t3, t4, t5; 

    if (isBlinking && blinkingCell.mega !== null) {
      setBlinkShowIcon(false); 
      t1 = setTimeout(() => {
        setBlinkShowIcon(true); 
        t2 = setTimeout(() => {
          setBlinkShowIcon(false); 
          t3 = setTimeout(() => {
            setBlinkShowIcon(true); 
            t4 = setTimeout(() => {
              setBlinkShowIcon(false); 
              t5 = setTimeout(() => {
                setBlinkShowIcon(true); 
                setIsBlinking(false); // Blinking done
              }, 250); 
            }, 250); 
          }, 250); 
        }, 250); 
      }, 1000); 

      return () => { 
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
        clearTimeout(t5);
      };
    }
  }, [isBlinking, blinkingCell]);

  // New useEffect for finalization after blinking
  useEffect(() => {
    if (!isBlinking && pendingFinalization) {
      const { type, move, miniGridWinInfoToSet, megaGridWinInfoToSet, nextActiveMegaCell, nextPlayer, miniWinDetailToSet } = pendingFinalization;

      let justWonMiniGridIndex = -1; // The index of the mini-grid that was just won

      if (type === 'bot') {
        setMiniGridWinInfo(miniGridWinInfoToSet); // Line appears for bot
        // Check if the specific mini-grid for the bot's move is now a winner
        if (miniGridWinInfoToSet[move.megaCellIdx] && miniGridWinInfoToSet[move.megaCellIdx].winner) {
          justWonMiniGridIndex = move.megaCellIdx;
        }
      } else { // human
        setMiniGridWinInfo(prev => { // Line appears for human
          const newInfo = [...prev];
          newInfo[move.megaCellIdx] = miniWinDetailToSet;
          return newInfo;
        });
        // Check if the specific mini-grid for the human's move is now a winner
        if (miniWinDetailToSet && miniWinDetailToSet.winner) {
          justWonMiniGridIndex = move.megaCellIdx;
        }
      }

      // If a mini-grid was just won, flag its mega-cell for the reveal delay
      if (justWonMiniGridIndex !== -1) {
        setMegaCellAwaitingReveal(justWonMiniGridIndex);
      }

      // Step 2: 1-second delay before showing big icon (for the specific mega-cell) and switching turn
      const timerId = setTimeout(() => {
        // Apply global game win state, if any (for the overall game winning line)
        if (megaGridWinInfoToSet && megaGridWinInfoToSet.winner) {
          setMegaGridWinInfo(megaGridWinInfoToSet);
        }
        
        // Clear the awaiting reveal flag. This will allow the MegaCell component 
        // (whose mini-grid was won) to re-render and show its large icon.
        setMegaCellAwaitingReveal(null); 

        // Switch player and active cell only if game is not globally won
        if (!(megaGridWinInfoToSet && megaGridWinInfoToSet.winner)) {
          setActiveMegaCellIndex(nextActiveMegaCell);
          setCurrentPlayer(nextPlayer);
        }
        setPendingFinalization(null); // Clear pending data
      }, 1000); // 1-second delay
      
      return () => clearTimeout(timerId); // Cleanup timeout
    }
  }, [isBlinking, pendingFinalization, setMiniGridWinInfo, setMegaGridWinInfo, setActiveMegaCellIndex, setCurrentPlayer, setPendingFinalization, setMegaCellAwaitingReveal]);

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

  useEffect(() => {
    if (megaGridWinInfo) {
      // Check if the game has ended (win, loss, or draw)
      // 'D' is for Draw, 'X' for X win, 'O' for O win
      if (megaGridWinInfo.winner === 'X' || megaGridWinInfo.winner === 'O' || megaGridWinInfo.winner === 'D') {
        setShowShareSection(true);
      }
    }
  }, [megaGridWinInfo]);

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

  const handleCellClick = useCallback(async (megaCellIdx, miniCellIdx, isBotMove = false, botDecisionInfo = null) => {
    // Prevent clicks during blinking, finalization, or if game is over
    if (isBlinking || pendingFinalization || megaGridWinInfo) return;

    // Existing checks for valid move
    if ((miniGridWinInfo[megaCellIdx] && miniGridWinInfo[megaCellIdx].winner) || 
        boardState[megaCellIdx][miniCellIdx]) {
      return; 
    }
    if (activeMegaCellIndex !== null && activeMegaCellIndex !== megaCellIdx) {
      return;
    }

    const playerMakingTheMove = currentPlayer;

    // Standard history update
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
      processedMiniGridWinInfo, // This contains the potential win info for the current mini-grid
      processedMegaGridWinInfo, // This contains potential overall game win
      processedActiveMegaCellIndex,
      processedNextPlayer,
      gameShouldContinue: newGameShouldContinue
    } = processPlayerMove(
      boardState, 
      miniGridWinInfo, 
      megaGridWinInfo, 
      activeMegaCellIndex, 
      currentPlayer, 
      megaCellIdx, 
      miniCellIdx
    );

    setBoardState(processedBoardState); // Show the piece immediately

    // Check if this move won the mini-grid
    const humanCausedMiniWin = 
      processedMiniGridWinInfo[megaCellIdx] && 
      processedMiniGridWinInfo[megaCellIdx].winner &&
      (!miniGridWinInfo[megaCellIdx] || !miniGridWinInfo[megaCellIdx].winner);

    if (humanCausedMiniWin) {
      setPendingFinalization({
        type: 'human',
        move: { megaCellIdx, miniCellIdx },
        miniWinDetailToSet: processedMiniGridWinInfo[megaCellIdx], // Just the detail for this specific grid
        megaGridWinInfoToSet: processedMegaGridWinInfo, // This will be null if no mega win
        nextActiveMegaCell: processedActiveMegaCellIndex,
        nextPlayer: processedNextPlayer
      });
      setBlinkingCell({ mega: megaCellIdx, mini: miniCellIdx });
      setIsBlinking(true);
      setBlinkShowIcon(true);
    } else {
      // No new mini-win, or not a win at all, proceed as before
      setMiniGridWinInfo(processedMiniGridWinInfo);
      if (processedMegaGridWinInfo) {
        setMegaGridWinInfo(processedMegaGridWinInfo);
      }
      if (newGameShouldContinue) {
        setActiveMegaCellIndex(processedActiveMegaCellIndex);
        setCurrentPlayer(processedNextPlayer);
      }
    }
    
    setHoveredCell({ mega: null, mini: null });

    // Logging
    const turnNumber = gameStateLog.length + 1;
    let logEntryForThisTurn = `Turn ${turnNumber}; ${playerMakingTheMove} played [mega ${megaCellIdx + 1}, mini ${miniCellIdx + 1}]`;
    setGameStateLog(prevLogs => [...prevLogs, logEntryForThisTurn]);
    
  }, [boardState, currentPlayer, miniGridWinInfo, megaGridWinInfo, activeMegaCellIndex, history, gameStateLog, processPlayerMove, isBlinking, pendingFinalization, setBoardState, setHistory, setRedoStack, setMiniGridWinInfo, setMegaGridWinInfo, setActiveMegaCellIndex, setCurrentPlayer, setPendingFinalization, setBlinkingCell, setIsBlinking, setBlinkShowIcon, setHoveredCell, setGameStateLog]);

  const resetGameState = () => {
    resetPersistedState();
    setRedoStack(initialRedoStack());
    setGameStateLog(initialGameStateLog());
    setShowLogsModal(initialShowLogsModal);
    setShowLoadStateModal(initialShowLoadStateModal);
    setHoveredCell({ mega: null, mini: null });

    // Reset blinking and finalization states
    setIsBlinking(false);
    setBlinkingCell({ mega: null, mini: null });
    setBlinkShowIcon(true);
    setPendingFinalization(null);
    setMegaCellAwaitingReveal(null);

    const htmlElement = document.documentElement;
    htmlElement.classList.remove('cursor-o-default', 'cursor-x-default');
    if (isSafari()) {
    }
    setShowShareSection(false);
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

  // Handlers for ShareSection
  const handleCopyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };

  // Twitter anker tag handles the tweet
  const handleTweet = () => {};

  const getMegaGridStateForShare = () => {
    // megaGridWinInfo provides the winner for each mini-grid
    // If a mini-grid is not won, it implies it might be ongoing or empty from the mega perspective.
    // The requirement is ❌ for red cross (X win), 🔵 for blue O (O win), ➖ for empty mega cells.
    // This translates to the winner of each mini-grid.
    const megaGridEmojis = [];
    for (let i = 0; i < 3; i++) {
      const row = [];
      for (let j = 0; j < 3; j++) {
        const megaCellIndex = i * 3 + j;
        const miniWin = miniGridWinInfo[megaCellIndex];
        if (miniWin && miniWin.winner === 'X') {
          row.push('X');
        } else if (miniWin && miniWin.winner === 'O') {
          row.push('O');
        } else {
          // If no winner, or winner is Draw ('D'), consider it empty for the share emoji grid
          row.push(null); 
        }
      }
      megaGridEmojis.push(row);
    }
    return megaGridEmojis;
  };

  return (
    <div className="app-container">
      <NavBar onNewGame={resetGameState} />
      <div className="scrollable-content">
        <div className="content-stack">
          <div className="game-and-share-wrapper">
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
                  blinkingCellGlobal={blinkingCell}
                  blinkShowIconGlobal={blinkShowIcon}
                  isCurrentlyBlinking={isBlinking}
                  megaCellAwaitingReveal={megaCellAwaitingReveal}
                />
              ))}
              {megaGridWinInfo && 
                <WinningLine 
                  combination={megaGridWinInfo.combination} 
                  gridType="mega" 
                  winner={megaGridWinInfo.winner} 
                />}
            </div>
            {showShareSection && megaGridWinInfo && (
              <ShareSection 
                gameResult={megaGridWinInfo.winner} 
                turns={history.length}
                megaGridState={getMegaGridStateForShare()} 
                onTweet={handleTweet}
              />
            )}
          </div>
          <CollapsibleHelpWindow gameMovesCount={gameStateLog.length} />
          {IS_DEVELOPMENT_MODE && (
            <DevControls 
              onUndo={handleUndo}
              canUndo={history.length > 0}
              onRedo={handleRedo}
              canRedo={redoStack.length > 0}
              onShowLogs={() => setShowLogsModal(true)}
              onToggleLoadStateModal={handleToggleLoadStateModal}
              lastBotMoveDetails={lastBotMoveDetails}
            />
          )}
        </div>
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


