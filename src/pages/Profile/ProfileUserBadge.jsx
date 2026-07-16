import { useState } from "react";
import { User } from "lucide-react";

function getDisplayName(userData) {
  const fullName = [userData?.first_name, userData?.last_name].filter(Boolean).join(" ");
  if (fullName) return fullName;
  if (userData?.username) return `@${userData.username}`;
  return null;
}

function getInitials(userData) {
  const fromName = [userData?.first_name?.[0], userData?.last_name?.[0]].filter(Boolean).join("");
  if (fromName) return fromName.toUpperCase();
  if (userData?.username) return userData.username[0].toUpperCase();
  return null;
}

export function ProfileUserBadge({ userData }) {
  const [photoFailed, setPhotoFailed] = useState(false);

  const displayName = getDisplayName(userData);
  const initials = getInitials(userData);
  const showPhoto = Boolean(userData?.photo_url) && !photoFailed;

  return (
    <div className="profile-user-badge">
      {displayName && <span className="profile-user-badge__name">{displayName}</span>}
      <span className="profile-user-badge__avatar" data-testid="profile-user-badge-avatar">
        {showPhoto ? (
          <img
            src={userData.photo_url}
            alt="Аватар пользователя"
            onError={() => setPhotoFailed(true)}
          />
        ) : initials ? (
          <span className="profile-user-badge__initials">{initials}</span>
        ) : (
          <User
            size={16}
            className="profile-user-badge__generic-icon"
            data-testid="profile-user-badge-generic-icon"
          />
        )}
      </span>
    </div>
  );
}
