import { useLocation, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import socket from '../socket';

function LobbyPage() {
  const { lobbyCode } = useParams();
  const location = useLocation();

  const [screenName, setScreenName] = useState('');
  const [users, setUsers] = useState([]);
  const [hasJoined, setHasJoined] = useState(false);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [hostId, setHostId] = useState('');

  useEffect(() => {
    if (location.state && location.state.screenName) {
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
    socket.on('lobby_users', ({ users, hostId }) => {
      setUsers(users);
      setHostId(hostId);
    });

    socket.on('game_started', () => {
      setIsGameStarted(true);
    });

    socket.on('game_ended', () => {
      setIsGameStarted(false);
    });

    return () => {
      socket.off('lobby_users');
      socket.off('game_started');
      socket.off('game_ended');
    };
  }, []);

  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (!screenName.trim()) {
      alert('Please enter a screen name');
      return;
    }
    setHasJoined(true);
  };

  const isHost = socket.id === hostId;

  if (!hasJoined) {
    return (
      <div style={{ textAlign: 'center', marginTop: '100px' }}>
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
          <button type="submit" style={{ padding: '10px 20px', fontSize: '16px' }}>
            Join Lobby
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      {!isGameStarted && (
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

          <button
            onClick={() => navigator.clipboard.writeText(`${window.location.origin}/lobby/${lobbyCode}`)}
            style={{ padding: '10px 20px' }}
          >
            Copy Invite Link
          </button>
          <br /><br />

          {isHost && (
            <button onClick={() => socket.emit('start_game', { lobbyCode })}>
              Start Game
            </button>
          )}
        </>
      )}

      {isGameStarted && (
        <>
          <img src="https://cdn-icons-png.flaticon.com/512/727/727269.png" alt="Audio" width="100" />
          <br />
          <button>Repeat</button>
          <br /><br />
          <input type="text" placeholder="User input box" />
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
            {user.name} {user.id === socket.id ? '(You)' : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default LobbyPage;
