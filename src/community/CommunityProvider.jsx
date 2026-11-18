import { useLayoutEffect, useMemo } from 'react';
import { useAuth } from '../components/AuthContext.jsx';
import { SOCIAL_PROFILES_ALLOWLIST } from '../data/featureFlags.js';
import { canAccessCommunity } from './rules.js';
import { createCommunityClient } from './api.js';
import { CommunityContext } from './context.js';

export default function CommunityProvider({ children }) {
  const auth = useAuth();
  const { token, userId, reauthenticate } = auth;
  const enabled = canAccessCommunity(SOCIAL_PROFILES_ALLOWLIST, auth);
  const client = useMemo(() => createCommunityClient(token, () => { if (userId) void reauthenticate(); }), [token, userId, reauthenticate]);
  useLayoutEffect(() => {
    if (enabled) client.activate();
    return () => client.dispose();
  }, [client, enabled]);
  const value = useMemo(() => ({ enabled, request: client.request, userId: auth.userId, isAdmin: enabled && auth.userData?.is_admin === true }), [enabled, client, auth.userId, auth.userData?.is_admin]);
  return <CommunityContext.Provider value={value}><div key={`${auth.token}:${auth.userId}:${enabled}`}>{children}</div></CommunityContext.Provider>;
}
