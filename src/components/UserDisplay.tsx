import React from 'react';
import type { User } from '../services/authService';

interface UserDisplayProps {
  user: User;
}

import './UserDisplay.css';

export function UserDisplay({ user }: UserDisplayProps) {
  return (
    <div className="user-display" data-testid="user-display">
      <img
        className="user-avatar"
        src={user.profile_picture}
        alt={user.name}
        title={user.name}
      />
      <span className="user-name">{user.name}</span>
    </div>
  );
}
