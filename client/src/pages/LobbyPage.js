import { useLocation, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';

function LobbyPage() {
  const { lobbyCode } = useParams();
  const location = useLocation();

  const [screenName, setScreenName] = useState('');

  useEffect(() => {
    if (location.state && location.state.screenName) {
      setScreenName(location.state.screenName);
    } else {
      // If user came here directly without going through LandingPage
      setScreenName('Unknown User');
    }
  }, [location]);

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
        <li>{screenName} (You)</li>
        {/* We'll replace this with a real user list later */}
      </ul>
    </div>
  );
}

export default LobbyPage;