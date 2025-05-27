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
  
  let localScore = 0;
  let globalScore = 0;
  let threatsPlayerScore = 0;
  let threatsOpponentScore = 0;

  // 1. Local board scoring (from v1/v2 logic)
  let playerLocalWins = 0;
  let opponentLocalWins = 0;
  for (const winInfo of currentMiniGridWinInfo) {
    if (winInfo && winInfo.winner === playerToEvaluateFor) {
      playerLocalWins++;
    } else if (winInfo && winInfo.winner === opponent) {
      opponentLocalWins++;
    }
  }
  localScore = 10 * (playerLocalWins - opponentLocalWins);

  // 2. Global board scoring (from v2 logic)
  const megaGridCellsForWinCheck = currentMiniGridWinInfo.map(info => info ? info.winner : null);
  const globalWinCheck = checkWinAndCombination(megaGridCellsForWinCheck);

  if (globalWinCheck) {
    if (globalWinCheck.winner === playerToEvaluateFor) {
      globalScore = 100;
    } else if (globalWinCheck.winner === opponent) {
      globalScore = -100;
    }
    // If there's a global win, threats on the global board might be irrelevant or could be zeroed out.
    // For now, we calculate them, but a global win state itself is dominant.
  }

  // 3. Threat Scoring
  let totalPlayerThreats = 0;
  let totalOpponentThreats = 0;

  // 3.1 Local Threats
  for (let i = 0; i < 9; i++) {
    // Only count threats in mini-grids that are not yet won
    if (!currentMiniGridWinInfo[i] || !currentMiniGridWinInfo[i].winner) {
      totalPlayerThreats += countThreats(boardState[i], playerToEvaluateFor);
      totalOpponentThreats += countThreats(boardState[i], opponent);
    }
  }

  // 3.2 Global Threats
  // Only count global threats if there isn't a global win yet
  if (!globalWinCheck) {
    totalPlayerThreats += countThreats(megaGridCellsForWinCheck, playerToEvaluateFor);
    totalOpponentThreats += countThreats(megaGridCellsForWinCheck, opponent);
  }
  
  threatsPlayerScore = 5 * totalPlayerThreats;
  threatsOpponentScore = -5 * totalOpponentThreats; // Penalty for opponent's threats

  const totalScore = localScore + globalScore + threatsPlayerScore + threatsOpponentScore;

  // <<< DEBUG LOGGING START >>>
  if (true) { // Easy toggle for debugging
    // console.log(`--- Heuristic v3 Calc for Player: ${playerToEvaluateFor} ---`);\n    // console.log(`  Board State (simplified for mega 3 if action is there): `,\n    //   boardState && boardState[2] ? JSON.stringify(boardState[2]) : 'N/A or other focus');\n    // console.log(`  MiniGridWinInfo (winners): `, currentMiniGridWinInfo.map(info => info ? info.winner : null));\n    // console.log(`  Scores: Total=${totalScore}, Local=${localScore}, Global=${globalScore}, ThreatsPlayer=${threatsPlayerScore}, RawOpponentThreats=${totalOpponentThreats} (penalty: ${threatsOpponentScore})`);\n    // console.log(`--- End Heuristic v3 Calc ---\`);\n  }\n  // <<< DEBUG LOGGING END >>>\n\n  return {\n    score: totalScore,\n    local: localScore,\n    global: globalScore,\n    threatsPlayer: threatsPlayerScore,\n    threatsOpponent: totalOpponentThreats // Storing raw count for opponent, score applies the -5
  }
  // <<< DEBUG LOGGING END >>>

  return {
    score: totalScore,
    local: localScore,
    global: globalScore,
    threatsPlayer: threatsPlayerScore,
    threatsOpponent: totalOpponentThreats // Storing raw count for opponent, score applies the -5
  };
  // Note: The returned object contains components. Minimax will use `score`.
  // Logging in App.js would need to be adapted if it were to show the full breakdown from getBotMove.
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

export const getBotMove = (boardState, miniGridWinInfo, activeMegaCellIndex, player = 'O') => {
  const eligibleMoves = getEligibleMoves(boardState, activeMegaCellIndex, miniGridWinInfo);

  if (eligibleMoves.length === 0) {
    console.log("AI Log: No eligible moves found for Bot 'O'.");
    return { move: null, aiDecisionInfo: "No eligible moves." }; 
  }

  let aiDecisionType = ""; // To be populated by win, block, minimax, or tie-breaker

  // --- Phase 2 Logic: Immediate Global Win/Loss Detection (Keep this check first) ---
  // 1. Check for Bot's ('O') immediate win
  for (const botMove of eligibleMoves) {
    const { globalWinDetails } = simulateMove(boardState, miniGridWinInfo, botMove.megaCellIdx, botMove.miniCellIdx, player);
    if (globalWinDetails && globalWinDetails.winner === player) {
      aiDecisionType = "Played immediate global win.";
      console.log(`AI Log: Action: ${aiDecisionType} at [${botMove.megaCellIdx + 1},${botMove.miniCellIdx + 1}].`);
      return { move: botMove, aiDecisionInfo: aiDecisionType };
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
        aiDecisionType = "Blocked User's potential global win.";
        console.log(`AI Log: Action: ${aiDecisionType} at [${blockMove.megaCellIdx + 1},${blockMove.miniCellIdx + 1}].`);
        return { move: blockMove, aiDecisionInfo: aiDecisionType };
      }
    }
  }
  // --- End of Phase 2 Immediate Win/Block Logic ---

  // --- Minimax Logic ---
  console.log("AI Log: Info: No immediate global win/block found. Proceeding to Minimax logic.");
  
  let allEvaluatedMoves = []; // Stores { move, evalObject } for each eligible move

  const eligibleMovesString = eligibleMoves.map(m => `[${m.megaCellIdx + 1},${m.miniCellIdx + 1}]`).join(', ');
  console.log(`AI Log: Eligible moves: [${eligibleMovesString}]`);

  for (const move of eligibleMoves) {
    const simStateAfterBotMove = simulateMove(boardState, miniGridWinInfo, move.megaCellIdx, move.miniCellIdx, player);
    const nextActiveMegaCellForOpponent = determineNextActiveMegaCell(move.miniCellIdx, simStateAfterBotMove.tempMiniGridWinInfo, simStateAfterBotMove.tempBoardState);
    const moveEvalObject = minimax(simStateAfterBotMove.tempBoardState, simStateAfterBotMove.tempMiniGridWinInfo, 1, false, nextActiveMegaCellForOpponent, player);
    
    allEvaluatedMoves.push({
        move: move,
        eval: moveEvalObject // Store the full object: { score, local, global, threatsPlayer, threatsOpponent }
    });
  }

  if (allEvaluatedMoves.length === 0 && eligibleMoves.length > 0) {
    // This case should ideally not be reached if minimax runs for all eligible moves
    // But as a fallback if something unexpected happens before tie-breaking.
    const randomFallbackMove = eligibleMoves[Math.floor(Math.random() * eligibleMoves.length)];
    aiDecisionType = "Random fallback (Minimax produced no evaluated moves).";
    console.log(`AI Log: ${aiDecisionType} Chosen: [${randomFallbackMove.megaCellIdx + 1},${randomFallbackMove.miniCellIdx + 1}]`);
    return { move: randomFallbackMove, aiDecisionInfo: aiDecisionType };
  }
  
  if (allEvaluatedMoves.length === 0 && eligibleMoves.length === 0) {
    // This should have been caught by the initial eligibleMoves.length === 0 check, but defensive coding.
     aiDecisionType = "No eligible moves were found at the start of Minimax phase.";
     console.log("AI Log: " + aiDecisionType);
     return { move: null, aiDecisionInfo: aiDecisionType };
  }

  // Sort all evaluated moves by score descending to easily get best score and for logging
  allEvaluatedMoves.sort((a, b) => b.eval.score - a.eval.score);

  const bestScore = allEvaluatedMoves[0].eval.score;
  const topScoringMoves = allEvaluatedMoves.filter(m => m.eval.score === bestScore);

  let bestMoveObject; // This will be { move, ruleApplied }
  let chosenMove;

  if (topScoringMoves.length === 1) {
    bestMoveObject = { move: topScoringMoves[0].move, ruleApplied: "Minimax (Heuristic_v3)" };
    aiDecisionType = bestMoveObject.ruleApplied;
  } else if (topScoringMoves.length > 1) {
    console.log(`AI Log: Tie-breaking initiated. Minimax Score: ${bestScore}. Tied Moves Count: ${topScoringMoves.length}`);
    // Pass all moves that tied for the best score to the tie-breaking logic
    // The 'move' property of each element in topScoringMoves is {megaCellIdx, miniCellIdx}
    // The 'eval' property is the full heuristic object.
    bestMoveObject = applyTieBreakingRules(topScoringMoves, boardState, miniGridWinInfo, player);
    aiDecisionType = `Tie-Breaker: ${bestMoveObject.ruleApplied}`;
  } else {
    // Should not happen if allEvaluatedMoves has items
    const randomFallbackMove = eligibleMoves[Math.floor(Math.random() * eligibleMoves.length)];
    aiDecisionType = "Random fallback (No top scoring moves identified after sort).";
    console.log(`AI Log: ${aiDecisionType} Chosen: [${randomFallbackMove.megaCellIdx + 1},${randomFallbackMove.miniCellIdx + 1}]`);
    return { move: randomFallbackMove, aiDecisionInfo: aiDecisionType };
  }
  
  chosenMove = bestMoveObject.move;

  if (chosenMove) {
    // Construct the detailed log string for all considered moves
    const allMovesSummary = allEvaluatedMoves.map(item => {
      const moveStr = `[${item.move.megaCellIdx + 1},${item.move.miniCellIdx + 1}]`;
      const evalObj = item.eval;
      // L: Local Score, G: Global Score, OT: O's Threat Score, XTc: X's Raw Threat Count
      return `${moveStr}:${evalObj.score} (L:${evalObj.local},G:${evalObj.global},OT:${evalObj.threatsPlayer},XTc:${evalObj.threatsOpponent})`;
    }).join(', '); // This will be formatted with newlines later as per user request

    const aiDecisionInfo = `${aiDecisionType}, Score: ${bestScore}, Considered:\n${allEvaluatedMoves.map(item => {
      const moveStr = `[${item.move.megaCellIdx + 1},${item.move.miniCellIdx + 1}]`;
      const evalObj = item.eval;
      return `  ${moveStr}:${evalObj.score} (L:${evalObj.local},G:${evalObj.global},OT:${evalObj.threatsPlayer},XTc:${evalObj.threatsOpponent})`;
    }).join('\n')}`;
    
    console.log(`AI Log: Chosen Move: [${chosenMove.megaCellIdx + 1},${chosenMove.miniCellIdx + 1}], Decision: ${aiDecisionType}, Minimax Score (v3): ${bestScore}. Full consideration details in UI Log.`);
    return { move: chosenMove, aiDecisionInfo };
  } else if (eligibleMoves.length > 0) {
    // Fallback if tie-breaking somehow fails to select a move (should be handled by applyTieBreakingRules returning a default)
    const randomFallbackMove = eligibleMoves[Math.floor(Math.random() * eligibleMoves.length)];
    aiDecisionType = "Random fallback (Tie-breaking did not yield a move).";
    console.log(`AI Log: ${aiDecisionType} Chosen: [${randomFallbackMove.megaCellIdx + 1},${randomFallbackMove.miniCellIdx + 1}]`);
    return { move: randomFallbackMove, aiDecisionInfo: aiDecisionType };
  }

  const finalAiDecisionInfo = "No move selected by any logic (end of getBotMove).";
  console.log("AI Log: " + finalAiDecisionInfo);
  return { move: null, aiDecisionInfo: finalAiDecisionInfo };
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
    const heuristicResult = calculate_heuristic_v3(boardState, miniGridWinInfo, playerForMinimax);
    // Simple log added here for heuristic output at leaf node
    console.log(`MINIMAX_HEURISTIC_V3_LEAF_EVAL: Player=${playerForMinimax}, boardState[2]=${JSON.stringify(boardState[2])}, HeuristicOutput=${JSON.stringify(heuristicResult)}`);
    // Return the full heuristic object instead of just the score
    return heuristicResult;
  }

  if (isMaximizingPlayer) { // Bot 'O' is maximizing
    let maxEvalObject = { score: -Infinity }; // Initialize with an object
    for (const move of eligibleMoves) {
      // Simulate the bot's move
      const simState = simulateMove(boardState, miniGridWinInfo, move.megaCellIdx, move.miniCellIdx, playerForMinimax);
      const nextActiveMegaCell = determineNextActiveMegaCell(move.miniCellIdx, simState.tempMiniGridWinInfo, simState.tempBoardState);
      
      const evalResultObject = minimax(simState.tempBoardState, simState.tempMiniGridWinInfo, depth + 1, false, nextActiveMegaCell, playerForMinimax);
      if (evalResultObject.score > maxEvalObject.score) {
        maxEvalObject = evalResultObject;
      }
    }
    return maxEvalObject;
  } else { // Opponent 'X' is minimizing
    let minEvalObject = { score: +Infinity }; // Initialize with an object
    for (const move of eligibleMoves) {
      // Simulate the opponent's move
      const simState = simulateMove(boardState, miniGridWinInfo, move.megaCellIdx, move.miniCellIdx, opponentPlayer);
      const nextActiveMegaCell = determineNextActiveMegaCell(move.miniCellIdx, simState.tempMiniGridWinInfo, simState.tempBoardState);

      const evalResultObject = minimax(simState.tempBoardState, simState.tempMiniGridWinInfo, depth + 1, true, nextActiveMegaCell, playerForMinimax);
      if (evalResultObject.score < minEvalObject.score) {
        minEvalObject = evalResultObject;
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