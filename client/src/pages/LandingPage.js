import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function LandingPage() {
  const [screenName, setScreenName] = useState('');
  const [avatarSeed, setAvatarSeed] = useState('default');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!screenName.trim()) {
      alert('Please enter a screen name');
      return;
    }

    const lobbyCode = Math.random().toString(36).substring(2, 8);
    navigate(`/lobby/${lobbyCode}?name=${encodeURIComponent(screenName)}&avatar=${encodeURIComponent(avatarSeed)}&style=${encodeURIComponent(avatarStyle)}`);
  };

  const [avatarStyle, setAvatarStyle] = useState('pixelArtNeutral');
  const avatarUrl = `http://localhost:3001/7.x/pixel-art-neutral/svg?seed=${encodeURIComponent(avatarSeed)}`;

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

        <label>Select Avatar Style</label><br />
        <select
          value={avatarStyle}
          onChange={(e) => setAvatarStyle(e.target.value)}
          style={{ padding: '10px', fontSize: '16px' }}
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
        <br /><br />

        <label>Customize Your Avatar Seed</label><br />
        <input
          type="text"
          placeholder="Avatar seed (e.g. name123)"
          value={avatarSeed}
          onChange={(e) => setAvatarSeed(e.target.value)}
          style={{ padding: '10px', fontSize: '16px' }}
        />
        <br /><br />

        <img
           src={`http://localhost:3001/avatar?seed=${encodeURIComponent(avatarSeed)}&style=${encodeURIComponent(avatarStyle)}`}
          alt="Your Avatar"
          style={{ width: '100px', height: '100px' }}
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
