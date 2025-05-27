import { useState, useEffect } from 'react';
import { LOCAL_STORAGE_KEY } from './constants';

// Initial state functions (could be co-located or passed as args if they become complex)
const initialBoardState = () => Array(9).fill(null).map(() => Array(9).fill(null));
const initialPlayer = 'X';
const initialMiniGridWinInfo = () => Array(9).fill(null);
const initialMegaGridWinInfo = null;
const initialActiveMegaCellIndex = null;
const initialHistory = () => [];
// RedoStack and GameStateLog are not part of persisted state by design

export const usePersistentGameState = () => {
  const [boardState, setBoardState] = useState(initialBoardState());
  const [currentPlayer, setCurrentPlayer] = useState(initialPlayer);
  const [miniGridWinInfo, setMiniGridWinInfo] = useState(initialMiniGridWinInfo());
  const [megaGridWinInfo, setMegaGridWinInfo] = useState(initialMegaGridWinInfo);
  const [activeMegaCellIndex, setActiveMegaCellIndex] = useState(initialActiveMegaCellIndex);
  const [history, setHistory] = useState(initialHistory());
  // Non-persisted states that App.js will manage separately
  // const [redoStack, setRedoStack] = useState(initialRedoStack());
  // const [gameStateLog, setGameStateLog] = useState(initialGameStateLog());
  // const [showLogsModal, setShowLogsModal] = useState(initialShowLogsModal);
  // const [hoveredCell, setHoveredCell] = useState({ mega: null, mini: null });

  // Load game state from local storage on initial mount
  useEffect(() => {
    try {
      const savedGame = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedGame) {
        const gameState = JSON.parse(savedGame);
        setBoardState(gameState.boardState || initialBoardState());
        setCurrentPlayer(gameState.currentPlayer || initialPlayer);
        setMiniGridWinInfo(gameState.miniGridWinInfo || initialMiniGridWinInfo());
        setMegaGridWinInfo(gameState.megaGridWinInfo === undefined ? initialMegaGridWinInfo : gameState.megaGridWinInfo);
        setActiveMegaCellIndex(gameState.activeMegaCellIndex === undefined ? initialActiveMegaCellIndex : gameState.activeMegaCellIndex);
        setHistory(gameState.history || initialHistory());
      }
    } catch (error) {
      console.error("Failed to load game state from local storage:", error);
    }
  }, []);

  // Save game state to local storage whenever it changes
  useEffect(() => {
    const gameStateToSave = {
      boardState,
      currentPlayer,
      miniGridWinInfo,
      megaGridWinInfo,
      activeMegaCellIndex,
      history
    };
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(gameStateToSave));
    } catch (error) {
      console.error("Failed to save game state to local storage:", error);
    }
  }, [boardState, currentPlayer, miniGridWinInfo, megaGridWinInfo, activeMegaCellIndex, history]);

  return {
    boardState, setBoardState,
    currentPlayer, setCurrentPlayer,
    miniGridWinInfo, setMiniGridWinInfo,
    megaGridWinInfo, setMegaGridWinInfo,
    activeMegaCellIndex, setActiveMegaCellIndex,
    history, setHistory,
    // Functions to reset these states if needed, can be passed to App.js or App.js can manage reset of its own non-persisted states
    resetPersistedState: () => {
        setBoardState(initialBoardState());
        setCurrentPlayer(initialPlayer);
        setMiniGridWinInfo(initialMiniGridWinInfo());
        setMegaGridWinInfo(initialMegaGridWinInfo);
        setActiveMegaCellIndex(initialActiveMegaCellIndex);
        setHistory(initialHistory());
         try {
            localStorage.removeItem(LOCAL_STORAGE_KEY);
        } catch (error) {
            console.error("Failed to remove game state from local storage during reset:", error);
        }
    }
  };
}; 