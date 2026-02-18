import Profile from './Profile';
import './SettingsPage.css';

function SettingsPage({ user, onBack }) {
  return (
    <div className="settings-page">
      <button type="button" className="back-link" onClick={onBack}>
        ← Back to library
      </button>
      <Profile user={user} />
    </div>
  );
}

export default SettingsPage;
