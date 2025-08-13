'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import useSound from 'use-sound';

export default function ThemeConverter() {
  // =============================================================================
  // STATE MANAGEMENT - UNIFIED AND SIMPLIFIED
  // =============================================================================
  
  // PUZZLE DATA
  const [puzzleData, setPuzzleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // GAME CONTROL
  const [currentLevel, setCurrentLevel] = useState(1); // Only 1 and 2 now

  // ✅ NEW CODE - REPLACE WITH THIS:
  const [soundEnabled, setSoundEnabled] = useState(true); // Simple default

  // Add this useEffect right after the useState (around line 24):
  useEffect(() => {
    // Only runs in browser, after component mounts
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem('panama-sound-enabled');
      if (saved !== null) {
        setSoundEnabled(JSON.parse(saved));
      }
    }
  }, []); // Empty array means run once on mount
  
  const [showHelp, setShowHelp] = useState(false);
  const [showFeedback, setShowFeedback] = useState(true);
  const [showResetConfirm, setShowResetConfirm] = useState(false);


  // Save sound preference whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('panama-sound-enabled', JSON.stringify(soundEnabled));
    }
  }, [soundEnabled]);
  
  // MESSAGE STATE
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [highlightedSlots, setHighlightedSlots] = useState([]);
  const processingSubmission = useRef(false);
  const submitGuard = useRef(false);
  
  // LEVEL-SPECIFIC STATES - MAINTAIN INDEPENDENCE
  const [levelStates, setLevelStates] = useState({
    1: null,
    2: null
  });

// UPDATED SOUND EFFECTS - With mobile support
const [playClick] = useSound('/click.mp3', {
  volume: 0.3,
  soundEnabled: soundEnabled,
  html5: true
});

const [playWordLock] = useSound('/word-correct.mp3', { 
  volume: 0.5,
  soundEnabled: soundEnabled,
  html5: true
});

const [playVictory] = useSound('/victory.mp3', { 
  volume: 0.6,
  soundEnabled: soundEnabled,
  html5: true
});

  // =============================================================================
  // DATA LOADING AND INITIALIZATION
  // =============================================================================
  
  // LOAD PUZZLE DATA
// REPLACE your current useEffect that loads puzzle data (around lines 60-80)
// with this improved version:

useEffect(() => {
  const loadPuzzleData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/PUZZLE_QUEUE.json');
      if (!response.ok) {
        throw new Error('Failed to load puzzle data');
      }
      const jsonData = await response.json();
      
      // NEW: Flexible puzzle selection
      let selectedPuzzle;
      
      // Check URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const puzzleParam = urlParams.get('puzzle');
      
      if (puzzleParam === 'random') {
        // Random puzzle for testing
        const randomIndex = Math.floor(Math.random() * jsonData.puzzles.length);
        selectedPuzzle = jsonData.puzzles[randomIndex];
        console.log(`Loading random puzzle #${randomIndex + 1}`);
        
      } else if (puzzleParam && !isNaN(puzzleParam)) {
        // Specific puzzle number (1-based for user friendliness)
        const puzzleIndex = parseInt(puzzleParam) - 1;
        if (puzzleIndex >= 0 && puzzleIndex < jsonData.puzzles.length) {
          selectedPuzzle = jsonData.puzzles[puzzleIndex];
          console.log(`Loading requested puzzle #${puzzleParam}`);
        } else {
          console.warn(`Puzzle #${puzzleParam} not found, loading default`);
          selectedPuzzle = jsonData.puzzles[0];
        }
        
      } else {
        // Default to first puzzle if no parameter
        selectedPuzzle = jsonData.puzzles[0];
        console.log('Loading default puzzle #1');
      }
      
      if (!selectedPuzzle) {
        throw new Error('No puzzle found');
      }
      
      setPuzzleData(selectedPuzzle);
      
    } catch (err) {
      setError(err.message);
      console.error('Error loading puzzle:', err);
    } finally {
      setLoading(false);
    }
  };
  loadPuzzleData();
}, []); // Empty dependency array means this runs once on mount

  // CREATE LETTER TILES
  // OPTION 1: Modify the createLetterTiles function to sort initially
  const createLetterTiles = useCallback((letterPool) => {
    const tiles = [];
    Object.entries(letterPool).forEach(([letter, count]) => {
      for (let i = 0; i < count; i++) {
        tiles.push({ letter, id: `${letter}-${i}`, used: false });
      }
    });
    // Sort alphabetically by letter
    return tiles.sort((a, b) => a.letter.localeCompare(b.letter));
  }, []);

  // INITIALIZE LEVEL STATES WHEN PUZZLE LOADS
  useEffect(() => {
    if (puzzleData) {
      setLevelStates({
        1: {
          availableLetters: createLetterTiles(puzzleData.letterPool),
          currentWord: '',
          slotsFilled: new Array(puzzleData.level1Solution.length).fill(''),
          submissionCount: 0,
          completed: false
        },
        2: {
          availableLetters: createLetterTiles(puzzleData.letterPool),
          currentWord: '',
          slotsFilled: new Array(puzzleData.level2Solution.length).fill(''),
          submissionCount: 0,
          completed: false
        }
      });
      setFeedbackMessage('');
    }
  }, [puzzleData, createLetterTiles]);

  // GET CURRENT LEVEL'S GAME STATE
  const getCurrentGameState = useCallback(() => {
    return levelStates[currentLevel] || {
      availableLetters: [],
      currentWord: '',
      slotsFilled: [],
      submissionCount: 0,
      completed: false
    };
  }, [levelStates, currentLevel]);

  // UPDATE CURRENT LEVEL'S STATE
  const updateCurrentLevelState = useCallback((updates) => {
    setLevelStates(prev => ({
      ...prev,
      [currentLevel]: {
        ...prev[currentLevel],
        ...updates
      }
    }));
  }, [currentLevel]);

  // =============================================================================
  // UNIFIED HELPER FUNCTIONS - NO MORE LEVEL-SPECIFIC LOGIC
  // =============================================================================

  const getCurrentSolution = useCallback(() => {
    if (!puzzleData) return [];
    return currentLevel === 1 ? puzzleData.level1Solution : puzzleData.level2Solution;
  }, [puzzleData, currentLevel]);

  const getCurrentDisplay = useCallback(() => {
    if (!puzzleData) return '';
    return currentLevel === 1 ? puzzleData.level1Display : puzzleData.level2Display;
  }, [puzzleData, currentLevel]);

  const getCurrentClue = useCallback(() => {
    if (!puzzleData) return '';
    return currentLevel === 1 ? puzzleData.disguiseClue : puzzleData.themeClue;
  }, [puzzleData, currentLevel]);


  // 1. ADD THIS SHUFFLE FUNCTION - Place this near your other helper functions (around line 200-300)
  const shuffleArray = useCallback((array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  const shuffleLetters = useCallback(() => {
    const currentGameState = getCurrentGameState();
    const shuffledLetters = shuffleArray(currentGameState.availableLetters);

    updateCurrentLevelState({
      availableLetters: shuffledLetters
    });

    playClick();
  }, [getCurrentGameState, updateCurrentLevelState, shuffleArray, playClick]);

  // SMART LINE BREAKING FUNCTION WITH PUNCTUATION AWARENESS
  const distributeIntoLines = useCallback((wordUnits, maxCharsPerLine = 15) => {
    // Calculate total character count including spaces between units
    const getTotalChars = (units) => {
      return units.reduce((total, unit) => total + unit.totalChars, 0) + (units.length - 1);
    };

    const totalChars = getTotalChars(wordUnits);
    if (totalChars <= maxCharsPerLine) {
      return [wordUnits];
    }

    // For 2 lines: find split point closest to balanced character distribution
    const targetPerLine = totalChars / 2;
    let bestSplit = 1;
    let bestBalance = Infinity;
    
    for (let i = 1; i < wordUnits.length; i++) {
      const firstLineChars = getTotalChars(wordUnits.slice(0, i));
      const secondLineChars = getTotalChars(wordUnits.slice(i));
      
      const balance = Math.abs(firstLineChars - targetPerLine) + Math.abs(secondLineChars - targetPerLine);
      
      if (balance < bestBalance) {
        bestBalance = balance;
        bestSplit = i;
      }
    }
    
    const firstLine = wordUnits.slice(0, bestSplit);
    const secondLine = wordUnits.slice(bestSplit);
    
    const firstLineChars = getTotalChars(firstLine);
    const secondLineChars = getTotalChars(secondLine);
    
    if (firstLineChars <= maxCharsPerLine && secondLineChars <= maxCharsPerLine) {
      return [firstLine, secondLine];
    }
    
    // Fall back to three lines
    const third = Math.ceil(wordUnits.length / 3);
    const twoThirds = Math.ceil(wordUnits.length * 2 / 3);
    
    return [
      wordUnits.slice(0, third),
      wordUnits.slice(third, twoThirds), 
      wordUnits.slice(twoThirds)
    ];
  }, []);

// PARSE DISPLAY STRING WITH PUNCTUATION GROUPING
const parseDisplayString = useCallback((displayString, solutionWords) => {
  const wordUnits = [];
  let wordIndex = 0;
  let i = 0;
  
  while (i < displayString.length) {
    const char = displayString[i];
    
    if (char.match(/[A-Za-z]/)) {
      // Start of a word unit - collect letters, embedded punctuation, and trailing punctuation
      let wordWithPunctuation = '';
      let trailingPunctuation = '';
      let letterCount = 0;
      
      // Collect letters, hyphens, and apostrophes as part of the word
      while (i < displayString.length && displayString[i].match(/[A-Za-z'-]/)) {
        const currentChar = displayString[i];
        wordWithPunctuation += currentChar;
        if (currentChar.match(/[A-Za-z]/)) {
          letterCount++;
        }
        i++;
      }
      
      // Collect any trailing punctuation (but not spaces, hyphens, or apostrophes)
      while (i < displayString.length && displayString[i].match(/[^\w\s'-]/)) {
        trailingPunctuation += displayString[i];
        i++;
      }
      
      wordUnits.push({
        type: 'word-unit',
        word: wordWithPunctuation,
        trailingPunctuation: trailingPunctuation,
        wordIndex: wordIndex,
        length: letterCount,
        totalChars: wordWithPunctuation.length + trailingPunctuation.length
      });
      wordIndex++;
    } else if (char === ' ') {
      // Skip spaces - they'll be handled as gaps between word units
      i++;
    } else {
      // Standalone punctuation (shouldn't happen with our grouping, but just in case)
      i++;
    }
  }
  
  return wordUnits;
}, []);

  const isValidWord = useCallback((word) => {
    const solution = getCurrentSolution();
    return solution.includes(word);
  }, [getCurrentSolution]);

  const findMatchingSlot = useCallback((word, currentSlotsFilled) => {
    const solution = getCurrentSolution();
    for (let i = 0; i < solution.length; i++) {
      if (solution[i] === word && currentSlotsFilled[i] === '') {
        return i;
      }
    }
    return -1;
  }, [getCurrentSolution]);

  const checkSlotAvailability = useCallback((wordLength, currentSlotsFilled) => {
    const solution = getCurrentSolution();
    const slotsOfThisLength = solution.map((word, index) => ({ word, index, length: word.length }))
      .filter(slot => slot.length === wordLength);
    
    if (slotsOfThisLength.length === 0) {
      return { exists: false, available: false, message: `There are no ${wordLength}-letter slots` };
    }
    
    const availableSlots = slotsOfThisLength.filter(slot => currentSlotsFilled[slot.index] === '');
    
    if (availableSlots.length === 0) {
      return { exists: true, available: false, message: `There are no more ${wordLength}-letter slots open` };
    }
    
    return { exists: true, available: true, availableSlots };
  }, [getCurrentSolution]);

  const calculateLetterOverlap = useCallback((submittedWord, targetWord) => {
    let overlap = 0;
    const submitted = [...submittedWord];
    const target = [...targetWord];
    
    submitted.forEach(letter => {
      const index = target.indexOf(letter);
      if (index !== -1) {
        overlap++;
        target.splice(index, 1);
      }
    });
    
    return overlap;
  }, []);

  const getOrdinal = (num) => {
    const mod10 = num % 10;
    const mod100 = num % 100;

    // Handle 11th, 12th, 13th (special cases)
    if (mod100 >= 11 && mod100 <= 13) return `${num}th`;

    // Handle 1st, 2nd, 3rd
    if (mod10 === 1) return `${num}st`;
    if (mod10 === 2) return `${num}nd`;
    if (mod10 === 3) return `${num}rd`;

    // Everything else is "th"
    return `${num}th`;
  };

  const getSlotPositionForLength = useCallback((targetSlotIndex, wordLength) => {
    const solution = getCurrentSolution();
    let positionCount = 0;
    
    for (let i = 0; i <= targetSlotIndex; i++) {
      if (solution[i].length === wordLength) {
        positionCount++;
      }
    }
    
    return positionCount;
  }, [getCurrentSolution]);

  const countSlotsOfLength = useCallback((wordLength) => {
    const solution = getCurrentSolution();
    return solution.filter(word => word.length === wordLength).length;
  }, [getCurrentSolution]);

  const highlightSlot = (slotIndex) => {
    setHighlightedSlots([slotIndex]);
    setTimeout(() => {
      setHighlightedSlots([]);
    }, 5000);
  };

  // SIMPLIFIED VICTORY SYSTEM
  const showVictoryMessages = useCallback((submissionCount) => {
    playVictory();
    setFeedbackMessage(`Congratulations! You solved the puzzle in ${submissionCount} attempts (words placed).`);
  }, [playVictory]);

  // =============================================================================
  // GAME ACTIONS
  // =============================================================================

  const handleLetterClick = useCallback((tileId) => {
    const currentGameState = getCurrentGameState();
    const tile = currentGameState.availableLetters.find(t => t.id === tileId);
    if (!tile || tile.used) return;
    
    playClick();
    updateCurrentLevelState({
      currentWord: currentGameState.currentWord + tile.letter
    });
  }, [getCurrentGameState, updateCurrentLevelState, playClick]);

  const handleTyping = useCallback((newWord) => {
    if (showFeedback) {
      setFeedbackMessage('');
    }
    updateCurrentLevelState({
      currentWord: newWord.toUpperCase()
    });
  }, [showFeedback, updateCurrentLevelState]);

  const clearWord = useCallback(() => {
    updateCurrentLevelState({
      currentWord: ''
    });
  }, [updateCurrentLevelState]);

  const submitMultipleWords = useCallback((words) => {
    if (processingSubmission.current) return;
    processingSubmission.current = true;

    const currentGameState = getCurrentGameState();
    setFeedbackMessage('Feedback only provided when individual words are entered');

    let validAttempts = 0;
    let newSlotsFilled = [...currentGameState.slotsFilled];
    let newAvailableLetters = [...currentGameState.availableLetters.map(tile => ({ ...tile }))];

    // Count valid attempts first
    for (const word of words) {
      const slotCheck = checkSlotAvailability(word.length, newSlotsFilled);
      if (slotCheck.available) {
        validAttempts++;
      }
    }

    // Process word placements
    for (const word of words) {
      const matchingSlot = findMatchingSlot(word, newSlotsFilled);
      if (matchingSlot !== -1 && isValidWord(word)) {
        newSlotsFilled[matchingSlot] = word;

        // Remove letters from pool
        const lettersNeeded = {};
        for (let letter of word) {
          lettersNeeded[letter] = (lettersNeeded[letter] || 0) + 1;
        }

        Object.entries(lettersNeeded).forEach(([letter, count]) => {
          let removed = 0;
          for (let i = 0; i < newAvailableLetters.length && removed < count; i++) {
            if (newAvailableLetters[i].letter === letter && !newAvailableLetters[i].used) {
              newAvailableLetters[i].used = true;
              removed++;
            }
          }
        });
      }
    }

    const isComplete = newSlotsFilled.every(slot => slot !== '');
    const updatedSubmissionCount = currentGameState.submissionCount + validAttempts;

    updateCurrentLevelState({
      slotsFilled: newSlotsFilled,
      availableLetters: newAvailableLetters,
      currentWord: '',
      submissionCount: updatedSubmissionCount,
      completed: isComplete
    });

    if (isComplete) {
      setTimeout(() => showVictoryMessages(updatedSubmissionCount), 500);
    }

    setTimeout(() => processingSubmission.current = false, 0);
  }, [getCurrentGameState, updateCurrentLevelState, checkSlotAvailability, findMatchingSlot, isValidWord, showVictoryMessages, currentLevel]);

  const submitSingleWord = useCallback((word) => {
    if (!word || word.length === 0) {
      setFeedbackMessage('Please enter a word!');
      return;
    }

    const currentGameState = getCurrentGameState();
    const slotCheck = checkSlotAvailability(word.length, currentGameState.slotsFilled);
    if (!slotCheck.available) {
      setFeedbackMessage(slotCheck.message);
      if (!slotCheck.exists) {
        setTimeout(() => {
          updateCurrentLevelState({ currentWord: '' });
        }, 2000);
      }
      return;
    }

    const matchingSlot = findMatchingSlot(word, currentGameState.slotsFilled);
    if (matchingSlot === -1) {
      // Generate feedback
      const solution = getCurrentSolution();
      const availableSlotOfLength = slotCheck.availableSlots[0].index;
      const targetWord = solution[availableSlotOfLength];
      const overlap = calculateLetterOverlap(word, targetWord);
      const slotPosition = getSlotPositionForLength(availableSlotOfLength, word.length);
      const totalSlotsOfLength = countSlotsOfLength(word.length);

      highlightSlot(availableSlotOfLength);

      let feedback = '';
      if (overlap === 0) {
        feedback = totalSlotsOfLength === 1 
          ? `Incorrect, and none of the letters from "${word}" are in the ${word.length}-letter word`
          : `Incorrect, and none of the letters from "${word}" are in the ${getOrdinal(slotPosition)} ${word.length}-letter word`;
      } else if (overlap === 1) {
        feedback = totalSlotsOfLength === 1
          ? `Incorrect, but 1 of the letters from "${word}" is in the ${word.length}-letter word`
          : `Incorrect, but 1 of the letters from "${word}" is in the ${getOrdinal(slotPosition)} ${word.length}-letter word`;
      } else {
        feedback = totalSlotsOfLength === 1
          ? `Incorrect, but ${overlap} of the letters from "${word}" are in the ${word.length}-letter word`
          : `Incorrect, but ${overlap} of the letters from "${word}" are in the ${getOrdinal(slotPosition)} ${word.length}-letter word`;
      }

      setFeedbackMessage(feedback);
      updateCurrentLevelState({
        submissionCount: currentGameState.submissionCount + 1,
        currentWord: ''
      });
      return;
    }

    // Valid word - place it
    if (processingSubmission.current) return;
    processingSubmission.current = true;

    let newSlotsFilled = [...currentGameState.slotsFilled];
    newSlotsFilled[matchingSlot] = word;

    // Check if puzzle will be completed
    const willComplete = newSlotsFilled.every(slot => slot !== '');

    // Only play word-correct sound if puzzle is NOT completed
    if (!willComplete) {
      playWordLock();
    }

    let newAvailableLetters = currentGameState.availableLetters.map(tile => ({ ...tile }));
    const lettersNeeded = {};
    for (let letter of word) {
      lettersNeeded[letter] = (lettersNeeded[letter] || 0) + 1;
    }

    Object.entries(lettersNeeded).forEach(([letter, count]) => {
      let removed = 0;
      for (let i = 0; i < newAvailableLetters.length && removed < count; i++) {
        if (newAvailableLetters[i].letter === letter && !newAvailableLetters[i].used) {
          newAvailableLetters[i].used = true;
          removed++;
        }
      }
    });

    const isComplete = newSlotsFilled.every(slot => slot !== '');
    const updatedSubmissionCount = currentGameState.submissionCount + 1;

    updateCurrentLevelState({
      slotsFilled: newSlotsFilled,
      availableLetters: newAvailableLetters,
      currentWord: '',
      submissionCount: updatedSubmissionCount,
      completed: isComplete
    });

    if (isComplete) {
      setTimeout(() => showVictoryMessages(updatedSubmissionCount), 500);
    } else {
      setFeedbackMessage(`Correct! "${word}" placed in slot ${matchingSlot + 1}`);
    }

    setTimeout(() => processingSubmission.current = false, 0);
  }, [getCurrentGameState, updateCurrentLevelState, checkSlotAvailability, findMatchingSlot, getCurrentSolution, calculateLetterOverlap, getSlotPositionForLength, countSlotsOfLength, playWordLock, showVictoryMessages, currentLevel]);

  // SUBMIT WORD - UNIFIED FOR BOTH SINGLE AND MULTIPLE
  const submitWord = useCallback(() => {
    if (submitGuard.current) return;
    submitGuard.current = true;

    const currentGameState = getCurrentGameState();
    const input = currentGameState.currentWord.trim().toUpperCase();
    if (!input) {
      setFeedbackMessage('Please enter a word!');
      setTimeout(() => submitGuard.current = false, 500);
      return;
    }

    const words = input.split(/\s+/).filter(word => word.length > 0);
    
    if (words.length > 1) {
      submitMultipleWords(words);
    } else {
      submitSingleWord(words[0]);
    }
    
    setTimeout(() => submitGuard.current = false, 500);
  }, [getCurrentGameState, submitMultipleWords, submitSingleWord]);

  const resetLevel = useCallback(() => {
  setShowResetConfirm(true);
}, []);

const confirmReset = useCallback(() => {
  if (!puzzleData) return;
  
  const solution = getCurrentSolution();
  updateCurrentLevelState({
    availableLetters: createLetterTiles(puzzleData.letterPool),
    currentWord: '',
    slotsFilled: new Array(solution.length).fill(''),
    submissionCount: 0,
    completed: false
  });
  
  setFeedbackMessage('');
  setShowResetConfirm(false);
}, [puzzleData, getCurrentSolution, createLetterTiles, updateCurrentLevelState]);

  // =============================================================================
  // LOADING AND ERROR STATES
  // =============================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-11 w-11 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-lg font-medium">Loading puzzle...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center bg-red-50 p-8 rounded-lg border border-red-200">
          <h2 className="text-xl font-bold text-red-800 mb-2">Error Loading Puzzle</h2>
          <p className="text-red-600">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!puzzleData) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-lg font-medium">No puzzle data available</p>
      </div>
    );
  }

  // =============================================================================
  // RENDER FUNCTIONS - UNIFIED AND SIMPLIFIED
  // =============================================================================

  const renderChallengeDescription = () => {
    const clue = getCurrentClue();
    return (
      <span className="italic">
        {clue}
      </span>
    );
  };

  const renderSlots = () => {
    const solution = getCurrentSolution();
    const displayString = getCurrentDisplay();
    const currentGameState = getCurrentGameState();
    const wordUnits = parseDisplayString(displayString, solution);
    const lines = distributeIntoLines(wordUnits);
    
    return (
      <div className="text-center -mb-1 mt-0 p-4">
        <div className="flex flex-col gap-2 items-center">
          {lines.map((lineUnits, lineIndex) => (
            <div key={lineIndex} className="flex gap-3 justify-center items-center">
              {lineUnits.map((unit, unitIndex) => {
                const wordIndex = unit.wordIndex;
                const filledWord = currentGameState.slotsFilled[wordIndex];
                const isHighlighted = highlightedSlots.includes(wordIndex);
                
                return (
                  <div key={unitIndex} className="flex items-center gap-0">
                    {/* Letter boxes for the word */}
                    <div className="flex gap-0.5">
                      {Array.from(unit.word).map((char, charIndex) => {
                        const isLetter = char.match(/[A-Za-z]/);
                        
                        if (!isLetter) {
                          // Display embedded punctuation (hyphen, apostrophe) in black
                          return (
                            <span key={charIndex} className="text-xl font-bold text-black flex items-center">
                              {char}
                            </span>
                          );
                        }
                        
                        // This is a letter slot
                        let letterSlotIndex = 0;
                        for (let i = 0; i < charIndex; i++) {
                          if (unit.word[i].match(/[A-Za-z]/)) {
                            letterSlotIndex++;
                          }
                        }
                        
                        const letter = filledWord?.[letterSlotIndex];
                        
                        return (
                          <div 
                            key={charIndex} 
                            className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-lg transition-all duration-300 ${
                              letter 
                                ? 'bg-white border border-blue-400 text-black shadow-sm' 
                                : isHighlighted 
                                  ? 'bg-yellow-200 border border-yellow-400 shadow-md' 
                                  : 'bg-gray-50 border border-gray-400 shadow-inner'
                            }`}
                          >
                            {letter || (
                              <span className="text-sm text-gray-500 font-medium">
                                {unit.length}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Trailing punctuation tied to this word */}
                    {unit.trailingPunctuation && (
                      <span className="text-xl font-bold text-black ml-0.5">
                        {unit.trailingPunctuation}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };


// REPLACE the renderLetterTiles function with this fixed version:
const renderLetterTiles = () => {
  const currentGameState = getCurrentGameState();
  const availableLetters = currentGameState.availableLetters.filter(tile => !tile.used);
  
  return (
    <div className="flex gap-2 justify-center mb-2 flex-wrap">
      {/* Render tiles in their current order (preserves shuffle) */}
      {availableLetters.map(tile => (
        <button
          key={tile.id}
          onClick={() => handleLetterClick(tile.id)}
          className="w-10 h-10 border border-gray-300 rounded-xl font-bold cursor-pointer transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center bg-gradient-to-br from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 transform hover:scale-105 active:scale-95"
        >
          <span className="text-2xl font-black text-black drop-shadow-sm">{tile.letter}</span>
        </button>
      ))}
      
        {/* Shuffle tile - always last */}
      <button
        onClick={shuffleLetters}
        className="w-10 h-10 border border-gray-300 rounded-xl font-bold cursor-pointer transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center bg-gradient-to-br from-orange-100 to-red-200 hover:from-orange-200 hover:to-red-300 transform hover:scale-105 active:scale-95"
      >
        <span className="text-lg">🔀</span>
      </button>
    </div>
  );
};

  // =============================================================================
  // MAIN RENDER
  // =============================================================================

  const currentGameState = getCurrentGameState();

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto">
        
        {/* LOGO WITH FLANKING BUTTONS */}
        <div className="flex items-center justify-between mb-1">
          {/* LEFT: Sound button */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`px-3 py-2 rounded-lg text-lg font-medium relative transition-colors ${soundEnabled ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
          >
            🔊
            {!soundEnabled && (
              <span className="absolute inset-0 flex items-center justify-center text-red-600 text-2xl font-bold opacity-40">
                ❌
              </span>
            )}
          </button>

          {/* CENTER: Logo */}
          <img 
            src="/logo1.jpg" 
            alt="Panama Guzzler" 
            className="h-12"
          />

          {/* RIGHT: Help button (question mark) */}
          <button
            onClick={() => setShowHelp(true)}
            className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-lg font-bold text-gray-700 transition-colors"
          >
            ?
          </button>
        </div>

        {/* LEVEL NAVIGATION - WIDER BUTTONS */}
        <div className="text-center mb-1">
          <div className="flex rounded-lg p-2 gap-2 mx-auto">
            
            <button
              onClick={() => setCurrentLevel(1)}
              className={`flex-1 px-4 py-2 rounded-md text-base font-bold transition-colors ${currentLevel === 1
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
            >
              The Disguise
            </button>
            
            <button
              onClick={() => setCurrentLevel(2)}
              className={`flex-1 px-4 py-2 rounded-md text-base font-bold transition-colors ${currentLevel === 2
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
            >
              The Reveal
            </button>
          </div>
        </div>

        {/* CHALLENGE DESCRIPTION - ENHANCED FOR READABILITY */}
        <div className="text-center mb-3 p-2 bg-amber-100 rounded-lg border border-amber-300 shadow-sm">
          <p className="text-sm font-semibold text-gray-800 leading-relaxed">
            {renderChallengeDescription()}
          </p>
        </div>

        {/* LETTER TILES */}
        {renderLetterTiles()}

        {/* FEEDBACK AREA */}
        <div className="mb-2 p-2 bg-blue-50 rounded-lg border border-blue-200 text-center min-h-[50px] flex items-center justify-between shadow-sm">
          <div className="flex-1 flex items-center justify-center">
            {showFeedback ? (
              feedbackMessage ? (
                <p className="text-sm font-medium text-blue-800">{feedbackMessage}</p>
              ) : (
                <p className="text-sm text-gray-500 italic">Feedback to help solve appears here</p>
              )
            ) : (
              <p className="text-sm text-gray-500 italic">Feedback hidden</p>
            )}
          </div>
          
          <button
            onClick={() => setShowFeedback(!showFeedback)}
            className={`px-3 py-1.5 rounded text-sm font-medium ml-2 transition-colors ${showFeedback ? 'bg-blue-200 text-blue-800 hover:bg-blue-300' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            {showFeedback ? 'On' : 'Off'}
          </button>
        </div>

        {/* INPUT SECTION */}
        <div className="text-center mb-0">
          <form onSubmit={(e) => {
            e.preventDefault();
            submitWord();
          }}>
            <div className="mb-1">
              <input
                type="text"
                value={currentGameState.currentWord}
                onChange={(e) => handleTyping(e.target.value)}
                className="border-2 border-gray-300 rounded-lg px-4 py-2 text-center text-lg font-black w-full max-w-sm text-black focus:border-blue-400 focus:outline-none transition-colors placeholder-gray-400"
                placeholder="Type word or click letter tiles..."
              />
            </div>

            <div className="mt-2 flex items-center justify-between">
              <div className="w-4"></div>

              <div className="flex space-x-1">
                <button
                  type="submit"
                  disabled={currentGameState.currentWord.length === 0}
                  className={`px-2 py-2 rounded-lg font-semibold transition-all ${currentGameState.currentWord.length === 0
                    ? 'bg-blue-200 text-blue-400 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600 shadow-md hover:shadow-lg'}`}
                >
                  Submit
                </button>

                <button
                  type="button"
                  onClick={clearWord}
                  className={`px-2 py-2 rounded-lg font-semibold transition-all ${currentGameState.currentWord.length === 0
                    ? 'bg-red-200 text-red-400 cursor-not-allowed'
                    : 'bg-red-500 text-white hover:bg-red-600 shadow-md hover:shadow-lg'}`}
                  disabled={currentGameState.currentWord.length === 0}
                >
                  Clear
                </button>

                <div className="px-3 py-2 text-gray-600 font-medium">
                  Attempts: {currentGameState.submissionCount}
                </div>
              </div>

              <button
                onClick = {resetLevel}
                className="px-2 py-1 bg-red-100 hover:bg-red-200 rounded-lg text-sm font-semibold text-red-700 transition-colors shadow-sm"
              >
                Reset
              </button>
            </div>
          </form>
        </div>       

        {/* SLOT TEMPLATE AREA */}
        <div className="-mt-2">
          {renderSlots()}
        </div>
        

        {/* HELP MODAL */}
        {showHelp && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden shadow-2xl">

              <div className="flex justify-between items-center p-4 border-b bg-gray-50">
                <h2 className="text-xl font-black text-gray-800">Panama Guzzler - How to Play</h2>
                <button
                  onClick={() => setShowHelp(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl transition-colors"
                >
                  ×
                </button>
              </div>

              <div className="p-4 overflow-y-auto max-h-[60vh]">

                <h3 className="text-lg font-bold text-gray-800 mb-2">Game Overview</h3>
                <p className="text-gray-600 mb-4">
                  Solve two puzzles using the same set of letters: <strong>The Disguise</strong> (typically a nonsensical phrase) and <strong>The Reveal</strong> (the actual theme like a movie, song, or famous phrase).
                </p>

                <h3 className="text-lg font-bold text-gray-800 mb-2">How to Enter Words</h3>
                <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4 mb-4">
                  <li><strong>Click tiles</strong> or <strong>type on keyboard</strong> to form words</li>
                  <li>Only words matching empty slot lengths are accepted</li>
                  <li>Enter multiple words with spaces (no feedback) or single words (with helpful feedback)</li>
                </ul>

                <h3 className="text-lg font-bold text-gray-800 mb-2">Scoring</h3>
                <p className="text-gray-600 mb-4">
                  Your score = number of word placement attempts. Solve with fewer attempts for a better score!
                </p>

                <h3 className="text-lg font-bold text-gray-800 mb-2">Getting Help</h3>
                <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4 mb-4">
                  <li><strong>Clues</strong> at the top guide you toward the solution</li>
                  <li><strong>Feedback</strong> (single words only) tells you which letters match the target word</li>
                  <li><strong>Toggle feedback</strong> on/off with the button</li>
                </ul>

                <h3 className="text-lg font-bold text-gray-800 mb-2">Key Points</h3>
                <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4 mb-4">
                  <li>Both puzzles use identical letters, just arranged differently</li>
                  <li>Dictionary validity doesn't matter - only whether your word matches the puzzle</li>
                  <li>Solutions can have valid words as well as names/proper nouns</li>
                  <li>Each level tracks progress independently</li>
                  <li>Switch between levels anytime</li>
                </ul>

                <h3 className="text-lg font-bold text-gray-800 mb-2">Tips</h3>
                <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                  <li>Start with shorter words</li>
                  <li>Pay attention to the clues</li>
                  <li>Use single-word entry to get feedback</li>
                </ul>

              </div>
            </div>
          </div>
        )}

        {/* RESET CONFIRMATION MODAL */}
        {showResetConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-sm w-full shadow-2xl">
              <div className="p-6 text-center">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Reset Level?</h3>
                <p className="text-gray-600 mb-6">Are you sure you want to reset this level? All progress will be lost.</p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={confirmReset}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors"
                  >
                    Yes, Reset
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}


      </div>
    </div>
  );
}