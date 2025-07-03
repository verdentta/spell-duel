import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function LandingPage() {
  const [screenName, setScreenName] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!screenName.trim()) {
      alert('Please enter a screen name');
      return;
    }

    // Generate random lobby code (for now, done client-side)
    const lobbyCode = Math.random().toString(36).substring(2, 8);

    // Navigate to the lobby page with the code
    navigate(`/lobby/${lobbyCode}`, { state: { screenName } });
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '100px' }}>
      <h1>Welcome to Spell Duel</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Enter your screen name"
          value={screenName}
          onChange={(e) => setScreenName(e.target.value)}
          style={{ padding: '10px', fontSize: '16px' }}
        />
        <br /><br />
        <button type="submit" style={{ padding: '10px 20px', fontSize: '16px' }}>
          Create Lobby
        </button>
      </form>
    </div>
  );
}

export default LandingPage;