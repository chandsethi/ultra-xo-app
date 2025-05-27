import { WINNING_COMBINATIONS } from './constants';

export const isMiniGridFull = (miniGridCells) => {
  return miniGridCells.every(cell => cell !== null);
};

export const checkWinAndCombination = (gridCells) => {
  if (!gridCells) return null; // Guard against undefined gridCells
  for (const combination of WINNING_COMBINATIONS) {
    const [a, b, c] = combination;
    if (gridCells[a] && gridCells[a] === gridCells[b] && gridCells[a] === gridCells[c]) {
      return { winner: gridCells[a], combination };
    }
  }
  return null;
};

export const simulateMove = (boardState, miniGridWinInfo, megaCellIdx, miniCellIdx, player) => {
  const tempBoardState = boardState.map(megaCell => [...megaCell]);
  tempBoardState[megaCellIdx][miniCellIdx] = player;

  const tempMiniGridWinInfo = miniGridWinInfo.map(info => info ? { ...info } : null);

  const miniWinCheck = checkWinAndCombination(tempBoardState[megaCellIdx]);
  if (miniWinCheck) {
    tempMiniGridWinInfo[megaCellIdx] = miniWinCheck;
  }

  const megaGridCellsForWinCheck = tempMiniGridWinInfo.map(info => info ? info.winner : null);
  const overallWinCheck = checkWinAndCombination(megaGridCellsForWinCheck);

  return {
    globalWinDetails: overallWinCheck,
    tempBoardState,
    tempMiniGridWinInfo,
  };
};

export const getEligibleMoves = (boardState, activeMegaCellIndex, miniGridWinInfo) => {
  const eligibleMoves = [];
  const targetMegaCellPlayable = 
    activeMegaCellIndex !== null && 
    (!miniGridWinInfo[activeMegaCellIndex] || !miniGridWinInfo[activeMegaCellIndex].winner) &&
    !isMiniGridFull(boardState[activeMegaCellIndex]);

  if (targetMegaCellPlayable) {
    for (let miniCellIdx = 0; miniCellIdx < 9; miniCellIdx++) {
      if (!boardState[activeMegaCellIndex][miniCellIdx]) {
        eligibleMoves.push({ megaCellIdx: activeMegaCellIndex, miniCellIdx });
      }
    }
  } else {
    for (let megaCellIdx = 0; megaCellIdx < 9; megaCellIdx++) {
      if ( (!miniGridWinInfo[megaCellIdx] || !miniGridWinInfo[megaCellIdx].winner) && 
           !isMiniGridFull(boardState[megaCellIdx]) ) {
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

export const calculate_heuristic_v1 = (currentMiniGridWinInfo) => {
  let botLocalWins = 0;
  let userLocalWins = 0;

  for (const winInfo of currentMiniGridWinInfo) {
    if (winInfo && winInfo.winner === 'O') {
      botLocalWins++;
    } else if (winInfo && winInfo.winner === 'X') {
      userLocalWins++;
    }
  }
  return 10 * (botLocalWins - userLocalWins);
};

export const getBotMove = (boardState, miniGridWinInfo, activeMegaCellIndex, player = 'O') => {
  const eligibleMoves = getEligibleMoves(boardState, activeMegaCellIndex, miniGridWinInfo);

  if (eligibleMoves.length === 0) {
    console.log("AI Log: No eligible moves found for Bot 'O'.");
    return { move: null, aiDecisionInfo: "No eligible moves." }; 
  }

  // --- Phase 2 Logic: Immediate Global Win/Loss Detection (Keep this check first) ---
  // 1. Check for Bot's ('O') immediate win
  for (const botMove of eligibleMoves) {
    const { globalWinDetails } = simulateMove(boardState, miniGridWinInfo, botMove.megaCellIdx, botMove.miniCellIdx, player);
    if (globalWinDetails && globalWinDetails.winner === player) {
      const aiDecisionInfo = "Played immediate global win.";
      console.log(`AI Log: Action: ${aiDecisionInfo} at [${botMove.megaCellIdx},${botMove.miniCellIdx}].`);
      return { move: botMove, aiDecisionInfo };
    }
  }

  // 2. Check for User's ('X') immediate win to block
  const opponent = player === 'O' ? 'X' : 'O';
  const allEmptyCells = [];
  for (let megaIdx = 0; megaIdx < 9; megaIdx++) {
    if (!miniGridWinInfo[megaIdx] || !miniGridWinInfo[megaIdx].winner) {
        if (!isMiniGridFull(boardState[megaIdx])) {
            for (let miniIdx = 0; miniIdx < 9; miniIdx++) {
                if (!boardState[megaIdx][miniIdx]) {
                    allEmptyCells.push({ megaCellIdx: megaIdx, miniCellIdx: miniIdx });
                }
            }
        }
    }
  }
  for (const cell of allEmptyCells) {
    const { globalWinDetails: opponentGlobalWin } = simulateMove(boardState, miniGridWinInfo, cell.megaCellIdx, cell.miniCellIdx, opponent);
    if (opponentGlobalWin && opponentGlobalWin.winner === opponent) {
      const isBlockableByBot = eligibleMoves.some(
        em => em.megaCellIdx === cell.megaCellIdx && em.miniCellIdx === cell.miniCellIdx
      );
      if (isBlockableByBot) {
        const blockMove = { megaCellIdx: cell.megaCellIdx, miniCellIdx: cell.miniCellIdx };
        const aiDecisionInfo = "Blocked User's potential global win.";
        console.log(`AI Log: Action: ${aiDecisionInfo} at [${blockMove.megaCellIdx},${blockMove.miniCellIdx}].`);
        return { move: blockMove, aiDecisionInfo };
      }
    }
  }
  // --- End of Phase 2 Immediate Win/Block Logic ---

  // --- Phase 3: Minimax Logic ---
  console.log("AI Log: Info: No immediate global win/block found. Proceeding to Minimax logic.");
  let bestScore = -Infinity;
  let bestMove = null;
  let consideredMovesLog = {}; 

  const eligibleMovesString = eligibleMoves.map(m => `[${m.megaCellIdx + 1},${m.miniCellIdx + 1}]`).join(', ');
  console.log(`AI Log: Eligible moves: [${eligibleMovesString}]`);

  for (const move of eligibleMoves) {
    const simStateAfterBotMove = simulateMove(boardState, miniGridWinInfo, move.megaCellIdx, move.miniCellIdx, player);
    const nextActiveMegaCellForOpponent = determineNextActiveMegaCell(move.miniCellIdx, simStateAfterBotMove.tempMiniGridWinInfo, simStateAfterBotMove.tempBoardState);
    const score = minimax(simStateAfterBotMove.tempBoardState, simStateAfterBotMove.tempMiniGridWinInfo, 1, false, nextActiveMegaCellForOpponent, player);
    
    consideredMovesLog[`[${move.megaCellIdx},${move.miniCellIdx}]`] = score;

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  if (bestMove) {
    const sortedConsideredMovesArray = Object.entries(consideredMovesLog)
      .sort(([,a],[,b]) => b-a); // Sort by score descending
    
    // Convert to 1-indexed for the UI log string
    const allMovesSummary = sortedConsideredMovesArray.map(([moveStr, score]) => {
      const match = moveStr.match(/\[(\d+),(\d+)\]/);
      if (match) {
        const megaIdx = parseInt(match[1], 10);
        const miniIdx = parseInt(match[2], 10);
        return `[${megaIdx + 1},${miniIdx + 1}]:${score}`;
      }
      return `${moveStr}:${score}`;
    }).join(', ');

    const aiDecisionInfo = `Minimax (Score: ${bestScore}, Considered: ${allMovesSummary})`;
    
    // Log to console just the chosen move and its score (1-indexed for console too)
    console.log(`AI Log: Chosen Move: [${bestMove.megaCellIdx + 1},${bestMove.miniCellIdx + 1}], Minimax Score: ${bestScore}. Full consideration details in UI Log.`);
    return { move: bestMove, aiDecisionInfo };
  } else if (eligibleMoves.length > 0) {
    const randomFallbackMove = eligibleMoves[Math.floor(Math.random() * eligibleMoves.length)];
    const aiDecisionInfo = "Random fallback from eligibles after Minimax failure.";
    console.log(`AI Log: ${aiDecisionInfo} Chosen: [${randomFallbackMove.megaCellIdx + 1},${randomFallbackMove.miniCellIdx + 1}]`);
    return { move: randomFallbackMove, aiDecisionInfo };
  }

  const aiDecisionInfo = "No move selected by any logic.";
  console.log("AI Log: " + aiDecisionInfo);
  return { move: null, aiDecisionInfo };
};

// Phase 3: Minimax Algorithm
const minimax = (boardState, miniGridWinInfo, depth, isMaximizingPlayer, currentActiveMegaCellIndex, playerForMinimax) => {
  // playerForMinimax is 'O' (bot, maximizer), opponent is 'X' (user, minimizer)
  const opponentPlayer = playerForMinimax === 'O' ? 'X' : 'O';

  // Check for terminal states (global win/loss/draw) or max depth
  // First, check for global win based on miniGridWinInfo directly passed into this node of minimax
  const megaGridCellsForWinCheck = miniGridWinInfo.map(info => info ? info.winner : null);
  const globalWinCheck = checkWinAndCombination(megaGridCellsForWinCheck);

  if (globalWinCheck) {
    if (globalWinCheck.winner === playerForMinimax) return Infinity; // Bot wins
    if (globalWinCheck.winner === opponentPlayer) return -Infinity; // Opponent wins
  }

  // Get eligible moves for the current player in the simulation
  const currentPlayerForNode = isMaximizingPlayer ? playerForMinimax : opponentPlayer;
  const eligibleMoves = getEligibleMoves(boardState, currentActiveMegaCellIndex, miniGridWinInfo);

  // Check for draw (no eligible moves and no global win)
  if (eligibleMoves.length === 0) {
    return 0; // Draw or stalemate in this path
  }

  if (depth === 2) { // Max depth for 2-ply (Bot move -> User move -> Heuristic)
    return calculate_heuristic_v1(miniGridWinInfo); // Evaluate using heuristic_v1
  }

  if (isMaximizingPlayer) { // Bot 'O' is maximizing
    let maxEval = -Infinity;
    for (const move of eligibleMoves) {
      // Simulate the bot's move
      const simState = simulateMove(boardState, miniGridWinInfo, move.megaCellIdx, move.miniCellIdx, playerForMinimax);
      const nextActiveMegaCell = determineNextActiveMegaCell(move.miniCellIdx, simState.tempMiniGridWinInfo, simState.tempBoardState);
      
      const evalScore = minimax(simState.tempBoardState, simState.tempMiniGridWinInfo, depth + 1, false, nextActiveMegaCell, playerForMinimax);
      maxEval = Math.max(maxEval, evalScore);
    }
    return maxEval;
  } else { // Opponent 'X' is minimizing
    let minEval = +Infinity;
    for (const move of eligibleMoves) {
      // Simulate the opponent's move
      const simState = simulateMove(boardState, miniGridWinInfo, move.megaCellIdx, move.miniCellIdx, opponentPlayer);
      const nextActiveMegaCell = determineNextActiveMegaCell(move.miniCellIdx, simState.tempMiniGridWinInfo, simState.tempBoardState);

      const evalScore = minimax(simState.tempBoardState, simState.tempMiniGridWinInfo, depth + 1, true, nextActiveMegaCell, playerForMinimax);
      minEval = Math.min(minEval, evalScore);
    }
    return minEval;
  }
};

// Helper to determine the next active mega cell for the simulation
const determineNextActiveMegaCell = (playedMiniCellIdx, nextMiniGridWinInfo, nextBoardState) => {
  if ((nextMiniGridWinInfo[playedMiniCellIdx] && nextMiniGridWinInfo[playedMiniCellIdx].winner) || 
      isMiniGridFull(nextBoardState[playedMiniCellIdx])) {
    return null; // Next player can play anywhere
  }
  return playedMiniCellIdx; // Next player must play in this mega-cell
};

export const processPlayerMove = (currentBoardState, currentMiniGridWinInfo, currentMegaGridWinInfo, activeMegaCellIndex, currentPlayer, megaCellIdx, miniCellIdx) => {
  const newBoardState = currentBoardState.map((megaCell, mIdx) => 
    mIdx === megaCellIdx 
      ? megaCell.map((cell, cIdx) => (cIdx === miniCellIdx ? currentPlayer : cell))
      : megaCell
  );

  let newMiniGridWinInfo = currentMiniGridWinInfo.map(info => info ? { ...info } : null);
  let newMegaGridWinInfo = currentMegaGridWinInfo ? { ...currentMegaGridWinInfo } : null;
  let gameShouldContinue = true;

  const affectedMiniGridCells = newBoardState[megaCellIdx];
  const miniWinCheck = checkWinAndCombination(affectedMiniGridCells);

  if (miniWinCheck && (!newMiniGridWinInfo[megaCellIdx] || !newMiniGridWinInfo[megaCellIdx].winner)) {
    newMiniGridWinInfo[megaCellIdx] = miniWinCheck;

    const megaGridCellsForWinCheck = newMiniGridWinInfo.map(info => info ? info.winner : null);
    const overallWinCheck = checkWinAndCombination(megaGridCellsForWinCheck);
    if (overallWinCheck) {
      newMegaGridWinInfo = overallWinCheck;
      gameShouldContinue = false;
    }
  }

  let nextActiveMegaCellIndex = activeMegaCellIndex;
  let nextPlayer = currentPlayer;

  if (gameShouldContinue) {
    nextActiveMegaCellIndex = miniCellIdx;
    if ((newMiniGridWinInfo[nextActiveMegaCellIndex] && newMiniGridWinInfo[nextActiveMegaCellIndex].winner) || 
        isMiniGridFull(newBoardState[nextActiveMegaCellIndex])) {
      nextActiveMegaCellIndex = null;
    }
    nextPlayer = currentPlayer === 'X' ? 'O' : 'X';
  }

  return {
    processedBoardState: newBoardState,
    processedMiniGridWinInfo: newMiniGridWinInfo,
    processedMegaGridWinInfo: newMegaGridWinInfo,
    processedActiveMegaCellIndex: nextActiveMegaCellIndex,
    processedNextPlayer: nextPlayer,
    gameShouldContinue
  };
}; 