import { useLocation, useParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import socket from '../socket';

function LobbyPage() {
  const { lobbyCode } = useParams();
  const location = useLocation();

  const [screenName, setScreenName] = useState('');
  const [users, setUsers] = useState([]);
  const [hasJoined, setHasJoined] = useState(false);
  const [hostId, setHostId] = useState('');
  const [currentWord, setCurrentWord] = useState('');
  const [userGuess, setUserGuess] = useState('');
  const [timeLeft, setTimeLeft] = useState(20);
  const [round, setRound] = useState(0);
  const [maxRounds, setMaxRounds] = useState(10);
  const [roundTime, setRoundTime] = useState(20);
  const [correctGuesser, setCorrectGuesser] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [isRoundActive, setIsRoundActive] = useState(false);
  const [revealedLetters, setRevealedLetters] = useState([]);
  const [roundsInput, setRoundsInput] = useState('10');
  const [customWordsInput, setCustomWordsInput] = useState('');

  const inputRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const revealIntervalRef = useRef(null);
  const roundEndTimeoutRef = useRef(null);

  const [difficulty, setDifficulty] = useState('All');

  const [revealedWord, setRevealedWord] = useState('');
  const [wordDefinition, setWordDefinition] = useState('');


  useEffect(() => {
    if (location.state?.screenName) {
      setScreenName(location.state.screenName);
      setHasJoined(true);
    }
  }, [location]);

  useEffect(() => {
    if (screenName && hasJoined) {
      socket.emit('join_lobby', { lobbyCode, screenName });
    }
  }, [screenName, lobbyCode, hasJoined]);

  useEffect(() => {
    socket.on('lobby_users', ({ users, hostId, maxRounds }) => {
      setUsers(users);
      setHostId(hostId);
      setMaxRounds(maxRounds || 10);
    });

    socket.on('game_started', ({ word, round, roundTime }) => {
      startNewRound(word, round, roundTime);
    });

    socket.on('correct_guess', ({ name }) => {
      setCorrectGuesser(name);
    });

    socket.on('game_ended', ({ correctGuesser, word, definition }) => {
      setCorrectGuesser(correctGuesser);
      setRevealedWord(word);
      setWordDefinition(definition || 'Definition not found.');
      setIsRoundActive(false);
      setRevealedLetters(new Array(word.length).fill(true));
    });


    socket.on('game_over', () => {
      cleanupTimers();
      setIsGameStarted(false);
      setIsRoundActive(false);
      setCurrentWord('');
      setUserGuess('');
      setTimeLeft(20);
      setCorrectGuesser(null);
      setGameOver(true);
      setRevealedLetters([]);
    });

    return () => {
      socket.off('lobby_users');
      socket.off('game_started');
      socket.off('correct_guess');
      socket.off('game_ended');
      socket.off('game_over');
      cleanupTimers();
    };
  }, [hostId]);

  const startNewRound = (word, roundNumber, serverRoundTime = 20) => {
    cleanupTimers();
    setIsGameStarted(true);
    setIsRoundActive(true);
    setCurrentWord(word);
    setUserGuess('');
    setTimeLeft(serverRoundTime); //  use dynamic time
    setRound(roundNumber);
    setCorrectGuesser(null);
    setRevealedLetters(new Array(word.length).fill(false));

    const delay = socket.id === hostId ? 1000 : 0;

    setTimeout(() => {
      playWordPronunciation(word);
      inputRef.current?.focus();
    }, delay);

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    revealIntervalRef.current = setInterval(() => {
      setRevealedLetters(prev => {
        const unrevealed = prev.map((val, idx) => !val ? idx : null).filter(i => i !== null);
        if (unrevealed.length === 0) {
          clearInterval(revealIntervalRef.current);
          return prev;
        }
        const randomIndex = unrevealed[Math.floor(Math.random() * unrevealed.length)];
        const updated = [...prev];
        updated[randomIndex] = true;
        return updated;
      });
    }, 4000);
  };

  const endCurrentRound = (word, correctName) => {
    setIsRoundActive(false);
    clearInterval(timerIntervalRef.current);
    clearInterval(revealIntervalRef.current);
    setCorrectGuesser(correctName || null);
    setCurrentWord(word);
    setRevealedLetters(new Array(word.length).fill(true));

    roundEndTimeoutRef.current = setTimeout(() => {
      setCurrentWord('');
      setRevealedLetters([]);
    }, 5000);
  };

  const cleanupTimers = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (revealIntervalRef.current) clearInterval(revealIntervalRef.current);
    if (roundEndTimeoutRef.current) clearTimeout(roundEndTimeoutRef.current);
  };

  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (!screenName.trim()) return;
    setHasJoined(true);
  };

  const playWordPronunciation = async (word) => {
    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
      const data = await res.json();
      const audioObj = data[0]?.phonetics.find(p => p.audio);
      if (audioObj?.audio) new Audio(audioObj.audio).play();
      else speakWord(word);
    } catch {
      speakWord(word);
    }
  };

  const speakWord = (word) => {
    const utterance = new SpeechSynthesisUtterance(word);
    speechSynthesis.speak(utterance);
  };

  const handleStartGame = () => {
    socket.emit('start_game', { lobbyCode });
    setGameOver(false);
  };

  const handleSubmitGuess = () => {
    if (!userGuess.trim()) return;
    socket.emit('submit_guess', { lobbyCode, guess: userGuess.trim().toLowerCase() });
    setUserGuess('');
  };

  const renderWordOutline = () => {
    if (!currentWord) return null;
    return (
      <div style={{ fontSize: '24px', letterSpacing: '8px', marginTop: '20px' }}>
        {currentWord.split('').map((letter, idx) =>
          revealedLetters[idx] ? letter : '_'
        ).join(' ')}
      </div>
    );
  };

  const isHost = socket.id === hostId;

  return (
  <div style={{ textAlign: 'center', marginTop: '50px' }}>
    {!hasJoined ? (
      <div>
        <h1>Lobby: {lobbyCode}</h1>
        <form onSubmit={handleNameSubmit}>
          <input
            type="text"
            placeholder="Enter your screen name"
            value={screenName}
            onChange={(e) => setScreenName(e.target.value)}
            style={{ padding: '10px', fontSize: '16px' }}
          />
          <br /><br />
          <button type="submit" style={{ padding: '10px 20px' }}>Join Lobby</button>
        </form>
      </div>
    ) : !isGameStarted ? (
      <>
        <h1>Lobby: {lobbyCode}</h1>
        <h2>Welcome, {screenName}</h2>
        <p>Invite friends to join:</p>
        <input
          type="text"
          readOnly
          value={`${window.location.origin}/lobby/${lobbyCode}`}
          style={{ width: '300px', padding: '10px' }}
        />
        <br /><br />

        {isHost && (
          <>
            <div style={{ marginTop: '20px' }}>
              <label>
                Custom Words (comma separated) up to 100 words ONLY:<br />
                <textarea
                  value={customWordsInput}
                  onChange={(e) => {
                    const input = e.target.value;
                      setCustomWordsInput(input);

                      const words = input.split(',').map(w => w.trim()).filter(Boolean);

                      // Always emit — even if input is empty — to ensure reset
                      socket.emit('set_custom_words', { lobbyCode, words });

                      if (input.trim().length === 0) {
                      socket.emit('set_rounds', { lobbyCode, maxRounds: parseInt(roundsInput || '10') });
                      setRoundsInput('10');
                      setMaxRounds(10);
                    }
                  }}
                  rows="4"
                  cols="30"
                  placeholder="e.g. apple, banana, orange"
                />
              </label>
            </div>

            <div style={{ marginTop: '20px', opacity: customWordsInput.trim() ? 0.5 : 1 }}>
            <label>
              Difficulty:&nbsp;
              <select
                value={difficulty}
                disabled={!!customWordsInput.trim()}
                onChange={(e) => {
                  setDifficulty(e.target.value);
                  socket.emit('set_difficulty', { lobbyCode, difficulty: e.target.value });
                }}
                style={{ padding: '5px' }}
              >
                <option value="All">All Words</option>
                <option value="Easy">Easy (3-4 letters)</option>
                <option value="Medium">Medium (5-7 letters)</option>
                <option value="Hard">Hard (8+ letters)</option>
              </select>
            </label>
          </div>

            <div style={{ marginTop: '20px' }}>
              <label>
                Number of Rounds:&nbsp;
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={roundsInput}
                  onChange={(e) => {
                    const num = parseInt(e.target.value);
                    setRoundsInput(e.target.value);
                    if (num >= 1 && num <= 100) {
                      socket.emit('set_rounds', { lobbyCode, maxRounds: num });
                    }
                  }}
                  style={{ width: '60px', padding: '5px' }}
                  disabled={customWordsInput.trim().length > 0}
                />
              </label>
            </div>

            <div style={{ marginTop: '20px' }}>
            <label>
              Time per round (seconds):&nbsp;
              <input
                type="number"
                min="5"
                max="300"
                value={roundTime}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setRoundTime(val);
                  if (val >= 5 && val <= 300) {
                    socket.emit('set_round_time', { lobbyCode, seconds: val });
                  }
                }}
                style={{ width: '60px', padding: '5px' }}
              />
            </label>
          </div>

            {customWordsInput.trim().length > 0 && (
              <p style={{ color: 'gray', marginTop: '5px' }}>
                To set rounds for randomly picked words, please clear the custom words box.
              </p>
            )}

            <br />
            <button onClick={handleStartGame} style={{ padding: '10px 20px' }}>
              {gameOver ? 'Play Again' : 'Start Game'}
            </button>
          </>
        )}

        <h3>Rounds: {maxRounds}</h3>
        {gameOver && <h3>Game Over! Thanks for playing.</h3>}
      </>
    ) : (
      <>
        <h3>Round {round} of {maxRounds}</h3>
        {isRoundActive ? (
          <>
            <h3>Time Remaining: {timeLeft} seconds</h3>
            {correctGuesser && (
              <h4 style={{ color: 'green' }}>{correctGuesser} spelled the word correctly!</h4>
            )}
            <img src="https://cdn-icons-png.flaticon.com/512/727/727269.png" alt="Audio" width="100" />
            <br />
            <button onClick={() => playWordPronunciation(currentWord)}>Repeat</button>
            {renderWordOutline()}
            <br /><br />
            <form onSubmit={(e) => { e.preventDefault(); handleSubmitGuess(); }}>
              <input
                type="text"
                placeholder="Type the word"
                value={userGuess}
                onChange={(e) => setUserGuess(e.target.value)}
                ref={inputRef}
                style={{ padding: '10px', width: '200px' }}
              />
              <button type="button" onClick={handleSubmitGuess} style={{ marginLeft: '10px', padding: '10px' }}>
                Submit
              </button>
            </form>
          </>
        ) : (
          <>
            <h4>Word: {revealedWord}</h4>
            <p><strong>Definition:</strong> {wordDefinition}</p>
            {renderWordOutline()}
          </>
        )}

        <br /><br />
        {isHost && (
          <button onClick={() => socket.emit('end_game', { lobbyCode })}>
            End Game
          </button>
        )}
      </>
    )}

    <hr style={{ margin: '40px 0' }} />
    <h3>Users in Lobby:</h3>
    <ul style={{ listStyleType: 'none', padding: 0 }}>
      {users.map(user => (
        <li key={user.id}>
          {user.name} {user.id === socket.id ? '(You)' : ''} - {user.score || 0} pts
          {user.correctThisRound && <span style={{ color: 'green', marginLeft: '8px' }}>✅</span>}
        </li>
      ))}
    </ul>
  </div>
  );
}

export default LobbyPage;
