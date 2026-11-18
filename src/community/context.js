import { createContext, useContext } from 'react';
export const CommunityContext = createContext({ enabled: false, isAdmin: false });
export function useCommunity() { return useContext(CommunityContext); }
