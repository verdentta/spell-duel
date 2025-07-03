import { useLocation, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import socket from '../socket';

function LobbyPage() {
  const { lobbyCode } = useParams();
  const location = useLocation();

  const [screenName, setScreenName] = useState('');
  const [users, setUsers] = useState([]);
  const [hasJoined, setHasJoined] = useState(false); // Track if user has joined

  // Handle screen name from navigate() if available
  useEffect(() => {
    if (location.state && location.state.screenName) {
      setScreenName(location.state.screenName);
      setHasJoined(true); 
    }
  }, [location]);

  // Join lobby only when screenName is set and hasn't joined yet
  useEffect(() => {
    if (screenName && hasJoined) {
      socket.emit('join_lobby', { lobbyCode, screenName });
    }
  }, [screenName, lobbyCode, hasJoined]);

  // Listen for lobby user updates
  useEffect(() => {
    socket.on('lobby_users', (userList) => {
      setUsers(userList);
    });

    return () => {
      socket.off('lobby_users');
    };
  }, []);

  // Handle manual screen name submission
  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (!screenName.trim()) {
      alert('Please enter a screen name');
      return;
    }
    setHasJoined(true);
  };

  // If user hasn't joined yet, show name input form
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

  // Normal lobby view after joining
  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
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
