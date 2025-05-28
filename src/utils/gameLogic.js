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

// Phase 4: Heuristic V2 - Adds global board evaluation
export const calculate_heuristic_v2 = (boardState, currentMiniGridWinInfo, playerToEvaluateFor = 'O') => {
  let heuristicScore = 0;
  const opponent = playerToEvaluateFor === 'O' ? 'X' : 'O';

  // 1. Local board scoring (from v1)
  let botLocalWins = 0;
  let userLocalWins = 0;
  for (const winInfo of currentMiniGridWinInfo) {
    if (winInfo && winInfo.winner === playerToEvaluateFor) {
      botLocalWins++;
    } else if (winInfo && winInfo.winner === opponent) {
      userLocalWins++;
    }
  }
  const localScoreComponent = 10 * (botLocalWins - userLocalWins);
  heuristicScore += localScoreComponent;

  // 2. Global board scoring
  // Determine global win status from the currentMiniGridWinInfo
  const megaGridCellsForWinCheck = currentMiniGridWinInfo.map(info => info ? info.winner : null);
  const globalWinCheck = checkWinAndCombination(megaGridCellsForWinCheck);

  let globalScoreComponent = 0;
  if (globalWinCheck) {
    if (globalWinCheck.winner === playerToEvaluateFor) {
      globalScoreComponent = 100;
    } else if (globalWinCheck.winner === opponent) {
      globalScoreComponent = -100;
    } else if (globalWinCheck.winner === 'D') { // Global draw from heuristic perspective
        globalScoreComponent = 0; // Or a small penalty/bonus if desired, but 0 for now
    }
  }
  heuristicScore += globalScoreComponent;

  // Optional: Log the components for debugging if needed within getBotMove later
  // console.log(`Heuristic v2 for ${playerToEvaluateFor}: Total=${heuristicScore}, Local=${localScoreComponent}, Global=${globalScoreComponent}`);

  return heuristicScore;
};

// Phase 5: Helper function to count threats (2 in a row with an empty cell)
const countThreats = (gridCells, player) => {
  if (!gridCells) return 0;
  let threatCount = 0;
  for (const combination of WINNING_COMBINATIONS) {
    const [a, b, c] = combination;
    const cellsInLine = [gridCells[a], gridCells[b], gridCells[c]];
    
    const playerCount = cellsInLine.filter(cell => cell === player).length;
    const emptyCount = cellsInLine.filter(cell => cell === null || cell === undefined).length; // Ensure empty is properly checked

    if (playerCount === 2 && emptyCount === 1) {
      threatCount++;
    }
  }
  return threatCount;
};

// Phase 5: Heuristic V3 - Adds threat evaluation
export const calculate_heuristic_v3 = (boardState, currentMiniGridWinInfo, playerToEvaluateFor = 'O') => {
  const opponent = playerToEvaluateFor === 'O' ? 'X' : 'O';

  // Weights
  const W_O_MINI = 10;
  const W_X_MINI = -10; // Penalty for opponent winning a mini board
  const W_MEGA_DIFF = 100;
  const W_O_MINI_THREAT = 2;
  const W_O_MEGA_THREAT = 5;
  const W_X_MINI_THREAT = -2;
  const W_X_MEGA_THREAT = -5;

  // --- Component Calculation ---
  let o_mini_wins_raw = 0;
  let x_mini_wins_raw = 0;
  for (const winInfo of currentMiniGridWinInfo) {
    if (winInfo && winInfo.winner === playerToEvaluateFor) {
      o_mini_wins_raw++;
    } else if (winInfo && winInfo.winner === opponent) {
      x_mini_wins_raw++;
    }
  }

  const megaGridCellsForWinCheck = currentMiniGridWinInfo.map(info => info ? info.winner : null);
  const globalWinCheck = checkWinAndCombination(megaGridCellsForWinCheck);
  let mega_diff_raw = 0;
  if (globalWinCheck) {
    if (globalWinCheck.winner === playerToEvaluateFor) mega_diff_raw = 1;
    else if (globalWinCheck.winner === opponent) mega_diff_raw = -1;
  }

  let o_mini_threat_raw = 0;
  let x_mini_threat_raw = 0;
  for (let i = 0; i < 9; i++) {
    if (!currentMiniGridWinInfo[i] || !currentMiniGridWinInfo[i].winner) {
      o_mini_threat_raw += countThreats(boardState[i], playerToEvaluateFor);
      x_mini_threat_raw += countThreats(boardState[i], opponent);
    }
  }

  let o_mega_threat_raw = 0;
  let x_mega_threat_raw = 0;
  if (!globalWinCheck) { // Only count global threats if game not over
    o_mega_threat_raw = countThreats(megaGridCellsForWinCheck, playerToEvaluateFor);
    x_mega_threat_raw = countThreats(megaGridCellsForWinCheck, opponent);
  }

  // --- Weighted Scores ---
  const oMiniScore = W_O_MINI * o_mini_wins_raw;
  const xMiniScore = W_X_MINI * x_mini_wins_raw; // W_X_MINI is already negative
  const megaScore = W_MEGA_DIFF * mega_diff_raw;
  const oMiniThreatScore = W_O_MINI_THREAT * o_mini_threat_raw;
  const oMegaThreatScore = W_O_MEGA_THREAT * o_mega_threat_raw;
  const xMiniThreatScore = W_X_MINI_THREAT * x_mini_threat_raw;
  const xMegaThreatScore = W_X_MEGA_THREAT * x_mega_threat_raw;

  const totalScore = oMiniScore + xMiniScore + megaScore + 
                     oMiniThreatScore + oMegaThreatScore + 
                     xMiniThreatScore + xMegaThreatScore;

  return {
    score: totalScore,
    components: {
      Omini: o_mini_wins_raw,
      Xmini: x_mini_wins_raw,
      mega: mega_diff_raw,
      Omini_threat: o_mini_threat_raw,
      Omega_threat: o_mega_threat_raw,
      Xmini_threat: x_mini_threat_raw,
      Xmega_threat: x_mega_threat_raw
    },
    // Storing individual weighted scores can be useful for detailed logging if needed later,
    // but the primary need for logging is raw components + final score + overall weights list.
    // For now, the `weights` object will be constructed in getBotMove/formatAiDecisionInfo.
  };
};

// Placeholder for Phase 6: Tie-breaking helper
const applyTieBreakingRules = (topScoringMoves, boardState, miniGridWinInfo, player) => {
  // TODO: Implement Phase 6 tie-breaking rules 6.2.1, 6.2.2, 6.2.3
  // For now, just returns the first move from the list
  // topScoringMoves is an array of { move: {megaCellIdx, miniCellIdx}, eval: {heuristic_object} }
  const opponent = player === 'O' ? 'X' : 'O';
  let currentTiedMoves = [...topScoringMoves];
  let filteredMoves;
  let ruleAppliedLog = "Minimax (Heuristic_v3)"; // Default if no tie-breakers are hit decisively

  // Rule 6.2.1: Avoid Sending opponent to a full or already-won board
  filteredMoves = currentTiedMoves.filter(item => {
    const { move } = item;
    const targetMegaCellForOpponent = move.miniCellIdx; // The mega-cell opponent is sent to
    const isTargetWon = miniGridWinInfo[targetMegaCellForOpponent] && miniGridWinInfo[targetMegaCellForOpponent].winner;
    const isTargetFull = isMiniGridFull(boardState[targetMegaCellForOpponent]);
    return !isTargetWon && !isTargetFull;
  });

  if (filteredMoves.length > 0) {
    if (filteredMoves.length < currentTiedMoves.length) {
      ruleAppliedLog = "Rule 6.2.1 - Avoided sending opponent to full/won board";
    }
    currentTiedMoves = filteredMoves;
    if (currentTiedMoves.length === 1) {
      return { move: currentTiedMoves[0].move, ruleApplied: ruleAppliedLog };
    }
  } // If all moves send to a bad board, we don't filter, proceed with original list to next rule
  
  // Rule 6.2.2: Play center cell of a local board over corners over edges
  const centerMiniCell = 4;
  const cornerMiniCells = [0, 2, 6, 8];
  const edgeMiniCells = [1, 3, 5, 7]; // Not strictly needed for filtering, but good for clarity

  // Prefer Center
  filteredMoves = currentTiedMoves.filter(item => item.move.miniCellIdx === centerMiniCell);
  if (filteredMoves.length > 0) {
    if (filteredMoves.length < currentTiedMoves.length) {
         // Update log only if this rule was decisive or narrowed choices from a previous rule application
        ruleAppliedLog = (ruleAppliedLog.startsWith("Rule 6.2.1") || ruleAppliedLog === "Minimax (Heuristic_v3)") ? 
                         "Rule 6.2.2 - Preferred Center" : 
                         `${ruleAppliedLog} then Rule 6.2.2 - Preferred Center`;
    }
    currentTiedMoves = filteredMoves;
    if (currentTiedMoves.length === 1) {
      return { move: currentTiedMoves[0].move, ruleApplied: ruleAppliedLog };
    }
  } else {
    // Prefer Corners if no center moves found among ties
    filteredMoves = currentTiedMoves.filter(item => cornerMiniCells.includes(item.move.miniCellIdx));
    if (filteredMoves.length > 0) {
      if (filteredMoves.length < currentTiedMoves.length) {
        ruleAppliedLog = (ruleAppliedLog.startsWith("Rule 6.2.1") || ruleAppliedLog === "Minimax (Heuristic_v3)") ? 
                           "Rule 6.2.2 - Preferred Corner" : 
                           `${ruleAppliedLog} then Rule 6.2.2 - Preferred Corner`;
      }
      currentTiedMoves = filteredMoves;
      if (currentTiedMoves.length === 1) {
        return { move: currentTiedMoves[0].move, ruleApplied: ruleAppliedLog };
      }
    } else {
      // All remaining must be edges (or list is empty, though unlikely here)
      // No need to filter further for edges if centers/corners were not found, just use currentTiedMoves
      // Update log if edges are chosen by elimination and count was reduced from previous step
      if (currentTiedMoves.every(item => edgeMiniCells.includes(item.move.miniCellIdx)) && 
          currentTiedMoves.length < topScoringMoves.length && // Check if the original list was actually larger
          !ruleAppliedLog.includes("Preferred Edge")) { // Avoid double logging if no centers/corners
          ruleAppliedLog = (ruleAppliedLog.startsWith("Rule 6.2.1") || ruleAppliedLog === "Minimax (Heuristic_v3)") ? 
                             "Rule 6.2.2 - Preferred Edge (by elimination)" : 
                             `${ruleAppliedLog} then Rule 6.2.2 - Preferred Edge (by elimination)`;
      }
    }
  }

  // Rule 6.2.3: Win or block a local-board fork for Bot ('O')
  // First, check if any move creates a fork for the bot
  let forkCreatingMoves = currentTiedMoves.filter(item => {
    const { move } = item;
    // is_fork needs the local board cells, the player making the move, and the specific miniCell index of that move
    return is_fork(boardState[move.megaCellIdx], player, move.miniCellIdx);
  });

  if (forkCreatingMoves.length > 0) {
    ruleAppliedLog = (ruleAppliedLog === "Minimax (Heuristic_v3)" || ruleAppliedLog.includes("Rule 6.2.1") || ruleAppliedLog.includes("Rule 6.2.2")) ? 
                     "Rule 6.2.3 - Created Own Fork" : 
                     `${ruleAppliedLog} then Rule 6.2.3 - Created Own Fork`;
    currentTiedMoves = forkCreatingMoves;
    if (currentTiedMoves.length === 1) {
      return { move: currentTiedMoves[0].move, ruleApplied: ruleAppliedLog };
    }
    // If multiple moves create a fork, we fall through to the default (first one)
  } else {
    // If no move creates a fork for the bot, check if any move blocks an opponent's fork
    // A move blocks an opponent's fork if, had the opponent played in that same cell, they would have created a fork.
    let forkBlockingMoves = currentTiedMoves.filter(item => {
      const { move } = item;
      // Check if opponent (e.g., 'X') playing at this cell would create a fork for them
      return is_fork(boardState[move.megaCellIdx], opponent, move.miniCellIdx);
    });

    if (forkBlockingMoves.length > 0) {
      ruleAppliedLog = (ruleAppliedLog === "Minimax (Heuristic_v3)" || ruleAppliedLog.includes("Rule 6.2.1") || ruleAppliedLog.includes("Rule 6.2.2")) ? 
                       "Rule 6.2.3 - Blocked Opponent Fork" : 
                       `${ruleAppliedLog} then Rule 6.2.3 - Blocked Opponent Fork`;
      currentTiedMoves = forkBlockingMoves;
      if (currentTiedMoves.length === 1) {
        return { move: currentTiedMoves[0].move, ruleApplied: ruleAppliedLog };
      }
    }
  }

  // Fallback: If still tied after all rules, return the first move from the current list of tied moves.
  // The ruleAppliedLog might be a composite if earlier rules narrowed it down but didn't result in a single move.
  if (!ruleAppliedLog.includes("Rule 6.2")) { // If no tie-breaker rule was decisively applied
      ruleAppliedLog = "Minimax (Heuristic_v3) - Tie broken by selection order";
  }
  return { move: currentTiedMoves[0].move, ruleApplied: ruleAppliedLog };
};

// Placeholder for Phase 6: Fork detection helper
// A fork is when a player makes a move that creates two ways to win on their next turn (two threats).
const is_fork = (localBoardCells, player, moveMiniCellIdx) => {
  // TODO: Implement Phase 6 fork detection logic for a local board
  // This function would check if playing `player` at `moveMiniCellIdx` on `localBoardCells`
  // creates two simultaneous threats (two ways to win on the next move).
  
  // 1. Simulate the move
  const tempBoard = [...localBoardCells];
  if (tempBoard[moveMiniCellIdx]) return false; // Cell already occupied, cannot make this move
  tempBoard[moveMiniCellIdx] = player;

  // 2. Count threats after the move
  // countThreats is an existing helper: countThreats(gridCells, player)
  const threatsAfterMove = countThreats(tempBoard, player);

  // 3. A fork is created if there are 2 or more threats
  return threatsAfterMove >= 2;
};

export const getBotMove = (boardState, miniGridWinInfo, activeMegaCellIndex, player = 'O', turnNumber) => {
  const eligibleMoves = getEligibleMoves(boardState, activeMegaCellIndex, miniGridWinInfo);

  if (eligibleMoves.length === 0) {
    console.log("AI Log: No eligible moves found for Bot 'O'.");
    return { move: null, aiDecisionInfo: "No eligible moves." }; 
  }

  let topReason = "Best move determined by Minimax"; // Default reason
  let tieBreakerReason = "N/A";
  let bestMove = null;
  let anticipatedReplyMove = null;
  let finalScore = 0;
  let bestMoveComponentList = {};
  let bestMoveWeightedScores = {};
  let otherMovesConsideredLog = "";

  const currentWeights = {
    Omini: 10,
    Xmini: -10,
    mega: 100,
    Omini_threat: 2,
    Omega_threat: 5,
    Xmini_threat: -2,
    Xmega_threat: -5
  };

  // --- Phase 2 Logic: Immediate Global Win/Loss Detection ---
  for (const botMove of eligibleMoves) {
    const { globalWinDetails } = simulateMove(boardState, miniGridWinInfo, botMove.megaCellIdx, botMove.miniCellIdx, player);
    if (globalWinDetails && globalWinDetails.winner === player) {
      topReason = "Wins mega board (global game)";
      bestMove = botMove;
      finalScore = Infinity;
      bestMoveComponentList = { Omini: 0, Xmini: 0, mega: 1, Omini_threat: 0, Omega_threat: 0, Xmini_threat: 0, Xmega_threat: 0 }; 
      console.log(`AI Log: Action: ${topReason} at [${botMove.megaCellIdx + 1},${botMove.miniCellIdx + 1}].`);
      return formatAiDecisionInfo(turnNumber, player, bestMove, topReason, tieBreakerReason, anticipatedReplyMove, finalScore, bestMoveComponentList, currentWeights, otherMovesConsideredLog);
    }
  }

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
        topReason = "Blocks losing mega board (global game)";
        bestMove = { megaCellIdx: cell.megaCellIdx, miniCellIdx: cell.miniCellIdx };
        finalScore = -Infinity; 
        bestMoveComponentList = { Omini: 0, Xmini: 0, mega: -1, Omini_threat: 0, Omega_threat: 0, Xmini_threat: 0, Xmega_threat: 0 }; 
        console.log(`AI Log: Action: ${topReason} at [${bestMove.megaCellIdx + 1},${bestMove.miniCellIdx + 1}].`);
        return formatAiDecisionInfo(turnNumber, player, bestMove, topReason, tieBreakerReason, anticipatedReplyMove, finalScore, bestMoveComponentList, currentWeights, otherMovesConsideredLog);
      }
    }
  }
  // --- End of Phase 2 Immediate Win/Block Logic ---

  // --- Minimax Logic ---
  console.log("AI Log: Info: No immediate global win/block found. Proceeding to Minimax logic.");
  
  let allEvaluatedMoves = []; 

  const eligibleMovesString = eligibleMoves.map(m => `[${m.megaCellIdx + 1},${m.miniCellIdx + 1}]`).join(', ');
  console.log(`AI Log: Eligible moves: [${eligibleMovesString}]`);

  for (const move of eligibleMoves) {
    const simStateAfterBotMove = simulateMove(boardState, miniGridWinInfo, move.megaCellIdx, move.miniCellIdx, player);
    const nextActiveMegaCellForOpponent = determineNextActiveMegaCell(move.miniCellIdx, simStateAfterBotMove.tempMiniGridWinInfo, simStateAfterBotMove.tempBoardState);
    // The 'move' from minimax here is the bot's move that led to this evaluation path.
    // The 'anticipatedReply' is the opponent's move.
    const moveEvalObject = minimax(simStateAfterBotMove.tempBoardState, simStateAfterBotMove.tempMiniGridWinInfo, 1, false, nextActiveMegaCellForOpponent, player);
    
    allEvaluatedMoves.push({
        move: move, // This is the bot's potential move
        eval: moveEvalObject // Contains score, components, weightedScores, and anticipatedReply from opponent
    });
  }

  if (allEvaluatedMoves.length === 0 && eligibleMoves.length > 0) {
    const randomFallbackMove = eligibleMoves[Math.floor(Math.random() * eligibleMoves.length)];
    topReason = "Random fallback (Minimax produced no evaluated moves).";
    bestMove = randomFallbackMove;
    console.log(`AI Log: ${topReason} Chosen: [${bestMove.megaCellIdx + 1},${bestMove.miniCellIdx + 1}]`);
    return formatAiDecisionInfo(turnNumber, player, bestMove, topReason, tieBreakerReason, null, 0, {}, currentWeights, "");
  }
  
  if (allEvaluatedMoves.length === 0 && eligibleMoves.length === 0) {
     topReason = "No eligible moves were found at the start of Minimax phase.";
     console.log("AI Log: " + topReason);
     return formatAiDecisionInfo(turnNumber, player, null, topReason, tieBreakerReason, null, 0, {}, currentWeights, "");
  }

  allEvaluatedMoves.sort((a, b) => b.eval.score - a.eval.score);

  const bestScoreFromMinimax = allEvaluatedMoves[0].eval.score;
  const topScoringMoves = allEvaluatedMoves.filter(m => m.eval.score === bestScoreFromMinimax);

  let chosenMoveObject;

  if (topScoringMoves.length === 1) {
    chosenMoveObject = { move: topScoringMoves[0].move, ruleApplied: "Minimax Highest Score" };
    anticipatedReplyMove = topScoringMoves[0].eval.anticipatedReply;
    bestMoveComponentList = topScoringMoves[0].eval.components;
    bestMoveWeightedScores = topScoringMoves[0].eval.weightedScores; 
    tieBreakerReason = "N/A (Minimax direct choice)";
  } else if (topScoringMoves.length > 1) {
    console.log(`AI Log: Tie-breaking initiated. Minimax Score: ${bestScoreFromMinimax}. Tied Moves Count: ${topScoringMoves.length}`);
    // Pass the full eval object to applyTieBreakingRules if it needs heuristic components for tie-breaking
    chosenMoveObject = applyTieBreakingRules(topScoringMoves, boardState, miniGridWinInfo, player);
    tieBreakerReason = chosenMoveObject.ruleApplied;
    // Find the chosen move in allEvaluatedMoves to get its full eval object for logging
    const fullChosenEval = allEvaluatedMoves.find(m => 
        m.move.megaCellIdx === chosenMoveObject.move.megaCellIdx && 
        m.move.miniCellIdx === chosenMoveObject.move.miniCellIdx
    );
    if (fullChosenEval) {
        anticipatedReplyMove = fullChosenEval.eval.anticipatedReply;
        bestMoveComponentList = fullChosenEval.eval.components;
        bestMoveWeightedScores = fullChosenEval.eval.weightedScores;
    } else {
        // Fallback if chosen move not found, though should not happen
        anticipatedReplyMove = null;
        bestMoveComponentList = {};
        bestMoveWeightedScores = {};
    }
  } else {
    const randomFallbackMove = eligibleMoves[Math.floor(Math.random() * eligibleMoves.length)];
    topReason = "Random fallback (No top scoring moves identified after sort).";
    bestMove = randomFallbackMove;
    console.log(`AI Log: ${topReason} Chosen: [${bestMove.megaCellIdx + 1},${bestMove.miniCellIdx + 1}]`);
    return formatAiDecisionInfo(turnNumber, player, bestMove, topReason, "N/A", null, 0, {}, currentWeights, "");
  }
  
  bestMove = chosenMoveObject.move;
  finalScore = bestScoreFromMinimax; // The score of the best move (and tied moves)

  // Prepare otherMovesConsideredLog (top 12, excluding the best one if already chosen by minimax directly)
  const movesToLog = allEvaluatedMoves.slice(0, 12);
  otherMovesConsideredLog = movesToLog.map(item => {
    const moveStr = `[${item.move.megaCellIdx + 1},${item.move.miniCellIdx + 1}]`;
    const evalObj = item.eval;
    const c = evalObj.components || {}; 
    return `  ${moveStr} Score:${evalObj.score} (Omini:${c.Omini || 0}, Xmini:${c.Xmini || 0}, mega:${c.mega || 0}, Omini_thr:${c.Omini_threat || 0}, Omega_thr:${c.Omega_threat || 0}, Xmini_thr:${c.Xmini_threat || 0}, Xmega_thr:${c.Xmega_threat || 0})`;
  }).join('\n');

  if (bestMove) {
    console.log(`AI Log: Chosen Move: [${bestMove.megaCellIdx + 1},${bestMove.miniCellIdx + 1}], Decision: ${topReason}, Tie-Breaker: ${tieBreakerReason}, Minimax Score: ${finalScore}.`);
    return formatAiDecisionInfo(turnNumber, player, bestMove, topReason, tieBreakerReason, anticipatedReplyMove, finalScore, bestMoveComponentList, currentWeights, otherMovesConsideredLog);
  } else if (eligibleMoves.length > 0) {
    const randomFallbackMove = eligibleMoves[Math.floor(Math.random() * eligibleMoves.length)];
    topReason = "Random fallback (Tie-breaking did not yield a move).";
    bestMove = randomFallbackMove;
    console.log(`AI Log: ${topReason} Chosen: [${bestMove.megaCellIdx + 1},${bestMove.miniCellIdx + 1}]`);
    return formatAiDecisionInfo(turnNumber, player, bestMove, topReason, "N/A", null, 0, {}, currentWeights, "");
  }

  topReason = "No move selected by any logic (end of getBotMove).";
  console.log("AI Log: " + topReason);
  return formatAiDecisionInfo(turnNumber, player, null, topReason, "N/A", null, 0, {}, currentWeights, "");
};

const formatAiDecisionInfo = (turnNumber, player, bestMove, topReason, tieBreakerRuleApplied, anticipatedReply, score, components, weights, otherMovesConsideredLog) => {
  const moveStr = bestMove ? `Mega ${bestMove.megaCellIdx + 1} Mini ${bestMove.miniCellIdx + 1}` : "N/A";
  const anticipatedReplyStr = anticipatedReply ? `[${anticipatedReply.megaCellIdx + 1},${anticipatedReply.miniCellIdx + 1}]` : "N/A";
  
  const componentsStr = `[Omini: ${components.Omini !== undefined ? components.Omini : 'N/A'}, ` +
                        `Xmini: ${components.Xmini !== undefined ? components.Xmini : 'N/A'}, ` +
                        `mega: ${components.mega !== undefined ? components.mega : 'N/A'}, ` +
                        `Omini_threat: ${components.Omini_threat !== undefined ? components.Omini_threat : 'N/A'}, ` +
                        `Omega_threat: ${components.Omega_threat !== undefined ? components.Omega_threat : 'N/A'}, ` +
                        `Xmini_threat: ${components.Xmini_threat !== undefined ? components.Xmini_threat : 'N/A'}, ` +
                        `Xmega_threat: ${components.Xmega_threat !== undefined ? components.Xmega_threat : 'N/A'}]`;

  const weightsStr = `[Omini: ${weights.Omini}, Xmini: ${weights.Xmini}, mega: ${weights.mega}, ` +
                     `Omini_threat: ${weights.Omini_threat}, Omega_threat: ${weights.Omega_threat}, ` +
                     `Xmini_threat: ${weights.Xmini_threat}, Xmega_threat: ${weights.Xmega_threat}]`;

  let tieBreakerDescription = "N/A";
  if (tieBreakerRuleApplied && tieBreakerRuleApplied !== "N/A" && tieBreakerRuleApplied !== "N/A (Minimax direct choice)" && tieBreakerRuleApplied !== "Minimax Highest Score") {
    if (tieBreakerRuleApplied.includes("Rule 6.2.1")) {
      tieBreakerDescription = "Strategy: Avoid giving opponent a free turn";
    } else if (tieBreakerRuleApplied.includes("Rule 6.2.2")) {
      tieBreakerDescription = "Strategy: Positional play (Center/Corner/Edge preference)";
    } else if (tieBreakerRuleApplied.includes("Rule 6.2.3")) {
      tieBreakerDescription = "Strategy: Tactical fork management (Create/Block)";
    } else {
      tieBreakerDescription = tieBreakerRuleApplied; // Fallback to original rule string if not mapped
    }
  }

  let logString = `Turn ${turnNumber}; ${player} played ${moveStr}\n`;
  logString += `because: ${topReason}\n`;
  if (tieBreakerDescription !== "N/A") {
    logString += `with tie breaker: ${tieBreakerDescription}\n`;
  }
  logString += `Best move: ${bestMove ? `[${bestMove.megaCellIdx+1},${bestMove.miniCellIdx+1}]` : 'N/A'}\n`;
  logString += `Anticipated Reply: ${anticipatedReplyStr}\n`;
  logString += `Score: ${score}\n`;
  logString += `Components: ${componentsStr}\n`;
  logString += `Weights: ${weightsStr}\n`;
  if (otherMovesConsideredLog) {
    logString += `Other moves considered (max 12, sorted by score):\n${otherMovesConsideredLog}`;
  }

  return {
    move: bestMove,
    aiDecisionInfo: logString 
  };
};

// Phase 3: Minimax Algorithm
const minimax = (boardState, miniGridWinInfo, depth, isMaximizingPlayer, currentActiveMegaCellIndex, playerForMinimax) => {
  const opponentPlayer = playerForMinimax === 'O' ? 'X' : 'O';

  const megaGridCellsForWinCheck = miniGridWinInfo.map(info => info ? info.winner : null);
  const globalWinCheck = checkWinAndCombination(megaGridCellsForWinCheck);

  // Initialize with a move property for tracking anticipated reply
  let terminalEvalObject = { score: 0, components: {}, weightedScores: {}, anticipatedReply: null };

  if (globalWinCheck) {
    if (globalWinCheck.winner === playerForMinimax) terminalEvalObject.score = Infinity;
    else if (globalWinCheck.winner === opponentPlayer) terminalEvalObject.score = -Infinity;
    // else, score is 0 for a draw (already initialized)
    return terminalEvalObject; 
  }

  const currentPlayerForNode = isMaximizingPlayer ? playerForMinimax : opponentPlayer;
  const eligibleMoves = getEligibleMoves(boardState, currentActiveMegaCellIndex, miniGridWinInfo);

  if (eligibleMoves.length === 0) {
    return terminalEvalObject; // Draw or stalemate, score 0
  }

  if (depth === 2) { 
    const heuristicResult = calculate_heuristic_v3(boardState, miniGridWinInfo, playerForMinimax);
    // console.log(`MINIMAX_HEURISTIC_V3_LEAF_EVAL: Player=${playerForMinimax}, boardState[2]=${JSON.stringify(boardState[2])}, HeuristicOutput=${JSON.stringify(heuristicResult)}`);
    return { ...heuristicResult, anticipatedReply: null }; // No further reply at leaf node
  }

  if (isMaximizingPlayer) {
    let maxEvalObject = { score: -Infinity, anticipatedReply: null };
    for (const move of eligibleMoves) {
      const simState = simulateMove(boardState, miniGridWinInfo, move.megaCellIdx, move.miniCellIdx, playerForMinimax);
      const nextActiveMegaCell = determineNextActiveMegaCell(move.miniCellIdx, simState.tempMiniGridWinInfo, simState.tempBoardState);
      
      const evalResultObject = minimax(simState.tempBoardState, simState.tempMiniGridWinInfo, depth + 1, false, nextActiveMegaCell, playerForMinimax);
      if (evalResultObject.score > maxEvalObject.score) {
        maxEvalObject = { ...evalResultObject, move: move }; // Store the bot's move that led to this eval
      }
    }
    // If maxEvalObject still has -Infinity, it means all moves lead to immediate loss or bad states.
    // The 'move' property on maxEvalObject is the bot's move.
    // The 'anticipatedReply' on evalResultObject (if we were one level deeper) would be the opponent's move.
    // For the purpose of logging what *opponent* does, we capture it when isMaximizingPlayer is false.
    return maxEvalObject;
  } else { // Minimizing player (opponent)
    let minEvalObject = { score: +Infinity, anticipatedReply: null }; 
    for (const move of eligibleMoves) {
      const simState = simulateMove(boardState, miniGridWinInfo, move.megaCellIdx, move.miniCellIdx, opponentPlayer);
      const nextActiveMegaCell = determineNextActiveMegaCell(move.miniCellIdx, simState.tempMiniGridWinInfo, simState.tempBoardState);

      const evalResultObject = minimax(simState.tempBoardState, simState.tempMiniGridWinInfo, depth + 1, true, nextActiveMegaCell, playerForMinimax);
      if (evalResultObject.score < minEvalObject.score) {
        minEvalObject = { ...evalResultObject, anticipatedReply: move }; // This 'move' is the opponent's reply
      }
    }
    return minEvalObject;
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