import '../css/LobbyPage.css';
import { useLocation, useParams } from 'react-router-dom';
import { useState, useMemo, useEffect, useRef } from 'react';
import socket from '../socket';

const tickAudio = new Audio('/sounds/tick.mp3');  //ticking sound of a clock
tickAudio.loop = true; // manually control when it starts/stops

const ringAudio = new Audio('/sounds/ring.mp3');  //alarm bell sound

function LobbyPage() {
  const { lobbyCode } = useParams();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const [screenName, setScreenName] = useState(searchParams.get('name') || '');
  const [avatarSeed, setAvatarSeed] = useState(searchParams.get('avatar') || 'default');


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

  const [wordHistory, setWordHistory] = useState([]);
  const [showSummary, setShowSummary] = useState(false);

  const [wordReveal, setWordReveal] = useState(true);

  const [avatarStyle, setAvatarStyle] = useState(searchParams.get('style') || 'pixelArtNeutral');
  
  useEffect(() => {
    if (searchParams.get('name')) {
      setHasJoined(true);
    }
  }, []);

  useEffect(() => {
    if (screenName && hasJoined) {
      socket.emit('join_lobby', { lobbyCode, screenName, avatarSeed, avatarStyle });
    }
  }, [screenName, lobbyCode, hasJoined]);

  useEffect(() => {
    socket.on('lobby_users', ({ users, hostId, maxRounds }) => {
      setUsers(users);
      setHostId(hostId);
      setMaxRounds(maxRounds || 10);
    });

    socket.on('game_started', ({ word, round, roundTime, wordReveal }) => {
      startNewRound(word, round, roundTime, wordReveal);
    });

    socket.on('correct_guess', ({ name }) => {
      setCorrectGuesser(name);
    });

    socket.on('game_ended', ({ correctGuesser, word, definition, isCustom }) => {
      setCorrectGuesser(correctGuesser);
      setRevealedWord(word);
      setWordDefinition(isCustom ? '' : (definition || 'Definition not found.'));
      setIsRoundActive(false);
      setRevealedLetters(new Array(word.length).fill(true));
    });



    socket.on('game_over', ({ testedWords = [], isCustomMode = false }) => {
      cleanupTimers();
      setIsGameStarted(false);
      setIsRoundActive(false);
      setCurrentWord('');
      setUserGuess('');
      setTimeLeft(20);
      setCorrectGuesser(null);
      setGameOver(true);
      setRevealedLetters([]);
      setWordHistory(isCustomMode ? [] : testedWords); // Only store if not custom
      setShowSummary(!isCustomMode);
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

  useEffect(() => {
  // Play ticking when timeLeft is between 5 and 1 seconds (inclusive)
  if (isRoundActive && timeLeft <= 4 && timeLeft >= 1) {
    if (tickAudio.paused) {
      tickAudio.currentTime = 0;
      tickAudio.play();
    }
  } else {
    tickAudio.pause();
    tickAudio.currentTime = 0;
  }

  // Play alarm at 1 second left, but only once
  if (isRoundActive && timeLeft === 1) {
    tickAudio.pause();
    tickAudio.currentTime = 0;
    ringAudio.currentTime = 0;
    ringAudio.play();
  }

  // Clean up on round end
  if (!isRoundActive) {
    tickAudio.pause();
    tickAudio.currentTime = 0;
    ringAudio.pause();
    ringAudio.currentTime = 0;
  }
}, [isRoundActive, timeLeft]);



    const startNewRound = (word, roundNumber, serverRoundTime = 20, serverWordReveal = true) => {
    cleanupTimers();
    setIsGameStarted(true);
    setIsRoundActive(true);
    setCurrentWord(word);
    setUserGuess('');
    setTimeLeft(serverRoundTime); //  use dynamic time
    setRound(roundNumber);
    setCorrectGuesser(null);
    setRevealedLetters(
        word.split('').map(char => !/[a-zA-Z]/.test(char))  // this will reveal non-alphabetic characters 
      );

    const delay = socket.id === hostId ? 1000 : 0;

    setTimeout(() => {
      playWordPronunciation(word);
      inputRef.current?.focus();
    }, delay);

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    const totalToReveal = Math.max(1, Math.floor(word.length * 0.75));
    const revealSpacing = Math.floor((serverRoundTime * 1000) / totalToReveal); // in ms
    const unrevealedIndices = word.split('').map((_, i) => i); // [0,1,2,...]

    let revealsSoFar = 0;

    if (serverWordReveal) {
          revealIntervalRef.current = setInterval(() => {
            setRevealedLetters(prev => {
              if (revealsSoFar >= totalToReveal || unrevealedIndices.length === 0) {
                clearInterval(revealIntervalRef.current);
                return prev;
              }

              const updated = [...prev];
              const idx = unrevealedIndices.splice(
                Math.floor(Math.random() * unrevealedIndices.length),
                1
              )[0];
              updated[idx] = true;

              revealsSoFar++;
              return updated;
            });
          }, revealSpacing);
        }
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

  const fallingEmojis = useMemo(() => {
    const emojis = ['🌈', '🍭', '✨', '💖', '🍬', '🟢', '🌟', '🎈', '🎉', '🐣'];
    return (
      <div className="falling-stream">
        {Array.from({ length: 60 }).map((_, i) => {
          const emoji = emojis[Math.floor(Math.random() * emojis.length)];
          return (
            <span
              key={i}
              className="falling-emoji"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 15}s`,
                animationDuration: `${8 + Math.random() * 5}s`,
              }}
            >
              {emoji}
            </span>
          );
        })}
      </div>
    );
  }, []);

  const sortedUsers = [...users].sort((a, b) => (b.score || 0) - (a.score || 0));
  const topThree = sortedUsers.slice(0, 3);
  const others = sortedUsers.slice(3);

  return (
    <div className="lobby-container">
    {fallingEmojis}
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

            <label>Select Avatar Style</label><br />
            <select
              value={avatarStyle}
              onChange={(e) => setAvatarStyle(e.target.value)}
              style={{ padding: '10px', fontSize: '16px', marginBottom: '10px' }}
            >
              <option value="pixelArtNeutral">Pixel Art Neutral</option>
              <option value="botttsNeutral">Bottts Neutral</option>
              <option value="adventurer">Adventurer</option>
              <option value="avataaars">Avataaars</option>
              <option value="loreleiNeutral">Lorelei Neutral</option>
              <option value="funEmoji">Fun Emoji</option>
              <option value="croodles">Croodles</option>
              <option value="micah">Micah</option>
              <option value="lorelei">Lorelei</option>
              <option value="bottts">Bottts</option>
              <option value="dylan">Dylan</option>
              <option value="glass">Glass</option>
              <option value="icons">Icons</option>
              <option value="notionists">Notionists</option>
              <option value="personas">Personas</option>
              <option value="rings">Rings</option>
              <option value="shapes">Shapes</option>
              <option value="thumbs">Thumbs</option>
            </select>
            <br />

            <input
              type="text"
              placeholder="Customize your avatar (e.g. cool-cat)"
              value={avatarSeed}
              onChange={(e) => setAvatarSeed(e.target.value)}
              style={{ padding: '10px', fontSize: '16px' }}
            />
            <br />
            <img
              src={`http://localhost:3001/avatar?seed=${avatarSeed}&style=${avatarStyle}`}
              alt="avatar preview"
              style={{ width: '80px', height: '80px', marginBottom: '10px' }}
            />
            <br />
            <button type="submit" style={{ padding: '10px 20px' }}>Join Lobby</button>
          </form>
        </div>
      ) : !isGameStarted ? (
        showSummary ? (
          <>
            <h2>Review Words from Last Game</h2>
            <ul style={{ textAlign: 'left', maxWidth: '600px', margin: 'auto' }}>
            {wordHistory.map((entry, idx) => (
              typeof entry === 'object' && entry.word ? (
                <li key={idx}>
                  <strong>{entry.word}</strong>: {entry.definition || 'No definition.'}
                </li>
              ) : (
                <li key={idx}>
                  <strong>{entry}</strong>
                </li>
              )
            ))}
          </ul>

          <br></br>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', marginBottom: '30px', gap: '40px' }}>
          {/* Second place - left */}
          {topThree[1] && (
            <div style={{ textAlign: 'center', transform: 'translateY(30px)' }}>
              <img
                src={`http://localhost:3001/avatar?seed=${topThree[1].avatarSeed}&style=${topThree[1].avatarStyle || 'pixelArtNeutral'}`}
                alt="avatar"
                style={{ width: '60px', height: '60px', borderRadius: '50%' }}
              />
              <div style={{ fontWeight: 'bold' }}>{topThree[1].name}{topThree[1].id === socket.id && ' (You)'}</div>
              <div style={{ color: 'silver' }}>{topThree[1].score || 0} pts</div>
              <div style={{ fontSize: '24px' }}>🥈</div>
            </div>
          )}

          {/* First place - center */}
          {topThree[0] && (
            <div style={{ textAlign: 'center', transform: 'translateY(0px)' }}>
              <img
                src={`http://localhost:3001/avatar?seed=${topThree[0].avatarSeed}&style=${topThree[0].avatarStyle || 'pixelArtNeutral'}`}
                alt="avatar"
                style={{ width: '70px', height: '70px', borderRadius: '50%', border: '4px solid gold', background: 'white' }}
              />
              <div style={{ fontWeight: 'bold' }}>{topThree[0].name}{topThree[0].id === socket.id && ' (You)'}</div>
              <div style={{ color: 'gold' }}>{topThree[0].score || 0} pts</div>
              <div style={{ fontSize: '28px' }}>🥇</div>
            </div>
          )}

          {/* Third place - right */}
          {topThree[2] && (
            <div style={{ textAlign: 'center', transform: 'translateY(50px)' }}>
              <img
                src={`http://localhost:3001/avatar?seed=${topThree[2].avatarSeed}&style=${topThree[2].avatarStyle || 'pixelArtNeutral'}`}
                alt="avatar"
                style={{ width: '60px', height: '60px', borderRadius: '50%' }}
              />
              <div style={{ fontWeight: 'bold' }}>{topThree[2].name}{topThree[2].id === socket.id && ' (You)'}</div>
              <div style={{ color: 'orange' }}>{topThree[2].score || 0} pts</div>
              <div style={{ fontSize: '24px' }}>🥉</div>
            </div>
          )}
          </div>
          
            <br></br>
            <button onClick={() => setShowSummary(false)} style={{ padding: '10px 20px' }}>
              Play Again
            </button>
          </>
        ) : (
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
                  {customWordsInput.trim().length > 0 && (
                    <p style={{ color: 'gray', marginTop: '5px' }}>
                      Custom words will not display definitions.
                    </p>
                  )}
                </div>

                <div
                  className="inline-settings"
                  style={{ marginTop: '20px', opacity: customWordsInput.trim() ? 0.5 : 1 }}
                >
                  <label htmlFor="difficulty">Difficulty:</label>
                  <select
                    id="difficulty"
                    className="difficulty-select"
                    value={difficulty}
                    disabled={!!customWordsInput.trim()}
                    onChange={(e) => {
                      setDifficulty(e.target.value);
                      socket.emit('set_difficulty', { lobbyCode, difficulty: e.target.value });
                    }}
                  >
                    <option value="All">All Words</option>
                    <option value="Easy">Easy (3-4 letters)</option>
                    <option value="Medium">Medium (5-7 letters)</option>
                    <option value="Hard">Hard (8+ letters)</option>
                  </select>
                </div>

                <div className="settings-row">
                <label>
                  Number of Rounds:
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
                    disabled={customWordsInput.trim().length > 0}
                  />
                </label>

                <label>
                  Time per round (seconds):
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
                  />
                </label>
              </div>

                <div className="inline-setting">
                <label htmlFor="wordReveal">Word Reveal:</label>
                <select
                  id="wordReveal"
                  className="word-reveal-select"
                  value={wordReveal ? 'On' : 'Off'}
                  onChange={(e) => {
                    const revealOn = e.target.value === 'On';
                    setWordReveal(revealOn);
                    socket.emit('set_word_reveal', { lobbyCode, wordReveal: revealOn });
                  }}
                >
                  <option value="On">On</option>
                  <option value="Off">Off</option>
                </select>
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

            {gameOver && <h3>Game Over! Thanks for playing.</h3>}
          </>
        )
      ) : (
        <>
          <h3>Round {round} of {maxRounds}</h3>
          {isRoundActive ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
                <h3 style={{ margin: 0 }}>
                  Time Remaining: {timeLeft} seconds
                </h3>
                <div className="animated-clock">
                  <svg width="36" height="36" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="16" stroke="#333" strokeWidth="3" fill="#fffbe7" />
                    <line
                      x1="18" y1="18"
                      x2={18 + 12 * Math.sin((60 * timeLeft) * Math.PI / 30)}
                      y2={18 - 12 * Math.cos((60 * timeLeft) * Math.PI / 30)}
                      stroke="#f52" strokeWidth="3" strokeLinecap="round"
                    />
                    <circle cx="18" cy="18" r="2" fill="#f52" />
                  </svg>
                  {timeLeft <= 5 && timeLeft > 0 && (
                    <div className="clock-tick" style={{
                      animation: 'clock-tick-anim 0.5s infinite alternate',
                      width: 10, height: 10, background: '#f52', borderRadius: '50%',
                      marginLeft: 8
                    }}></div>
                  )}
                </div>
              </div>
              {correctGuesser && (
                <h4 style={{ color: 'green' }}>{correctGuesser} spelled the word correctly!</h4>
              )}
              <img src="https://cdn-icons-png.flaticon.com/512/727/727269.png" alt="Audio" width="100" />
              <br />
              <button onClick={() => playWordPronunciation(currentWord)} className="slim-button">Repeat</button>
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
                <button type="button" onClick={handleSubmitGuess} className="slim-button">
                  Submit
                </button>
              </form>
            </>
          ) : (
            <>
              <h4>Word: {revealedWord}</h4>
              {wordDefinition && (
                <p><strong>Definition:</strong> {wordDefinition}</p>
              )}
              {renderWordOutline()}
            </>
          )}

          <br /><br />
          {isHost && (
            <button className="slim-button" onClick={() => socket.emit('end_game', { lobbyCode })}>
              End Game
            </button>
          )}
        </>
      )}
      

      <h3 style={{ textAlign: 'center' }}>Users in Lobby:</h3>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '20px',
          padding: '10px',
        }}
      >
        {users.map(user => (
          <div
            key={user.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#15f30aff',
              borderRadius: '10px',
              padding: '10px 15px',
              boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
              fontSize: '14px',
              minWidth: '160px',
              maxWidth: '220px',
            }}
          >
            <img
              src={`http://localhost:3001/avatar?seed=${user.avatarSeed}&style=${user.avatarStyle || 'pixelArtNeutral'}`}
              alt="avatar"
              style={{ width: '40px', height: '40px', marginRight: '10px' }}
            />
            <span>
              {user.name}
              {user.id === socket.id && ' (You)'}
              {' - '}
              {user.score || 0} pts
              {user.correctThisRound && (
                <span style={{ color: 'green', marginLeft: '8px' }}>✅</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
    </div>
  );
}

export default LobbyPage;
