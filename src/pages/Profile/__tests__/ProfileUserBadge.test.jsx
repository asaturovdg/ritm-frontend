import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProfileUserBadge } from '../ProfileUserBadge.jsx';

describe('ProfileUserBadge', () => {
  it('shows full name and photo when both are present', () => {
    render(
      <ProfileUserBadge
        userData={{
          first_name: 'Иван',
          last_name: 'Иванов',
          photo_url: 'https://t.me/i/userpic/ivan.jpg',
          username: 'ivan_petrov',
        }}
      />
    );

    expect(screen.getByText('Иван Иванов')).toBeInTheDocument();
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://t.me/i/userpic/ivan.jpg');
  });

  it('falls back to @username when first_name and last_name are both null', () => {
    render(
      <ProfileUserBadge
        userData={{ first_name: null, last_name: null, photo_url: null, username: 'ivan_petrov' }}
      />
    );

    expect(screen.getByText('@ivan_petrov')).toBeInTheDocument();
  });

  it('renders no name text when first_name, last_name and username are all null', () => {
    render(
      <ProfileUserBadge userData={{ first_name: null, last_name: null, photo_url: null, username: null }} />
    );

    expect(screen.queryByText(/^@/)).not.toBeInTheDocument();
    expect(screen.getByTestId('profile-user-badge-avatar')).toBeInTheDocument();
  });

  it('shows initials from first_name/last_name when photo_url is null', () => {
    render(
      <ProfileUserBadge
        userData={{ first_name: 'Иван', last_name: 'Иванов', photo_url: null, username: 'ivan_petrov' }}
      />
    );

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('ИИ')).toBeInTheDocument();
  });

  it('shows initial from username when there is no first_name/last_name', () => {
    render(
      <ProfileUserBadge
        userData={{ first_name: null, last_name: null, photo_url: null, username: 'ivan_petrov' }}
      />
    );

    expect(screen.getByText('I')).toBeInTheDocument();
  });

  it('falls back to initials when the photo fails to load', () => {
    render(
      <ProfileUserBadge
        userData={{
          first_name: 'Иван',
          last_name: 'Иванов',
          photo_url: 'https://t.me/i/userpic/broken.jpg',
          username: 'ivan_petrov',
        }}
      />
    );

    const img = screen.getByRole('img');
    fireEvent.error(img);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('ИИ')).toBeInTheDocument();
  });

  it('shows a generic icon when there is nothing to build initials from and no photo', () => {
    render(
      <ProfileUserBadge userData={{ first_name: null, last_name: null, photo_url: null, username: null }} />
    );

    expect(screen.getByTestId('profile-user-badge-generic-icon')).toBeInTheDocument();
  });

  it('renders the generic icon when userData is null', () => {
    render(<ProfileUserBadge userData={null} />);

    expect(screen.getByTestId('profile-user-badge-generic-icon')).toBeInTheDocument();
  });
});
