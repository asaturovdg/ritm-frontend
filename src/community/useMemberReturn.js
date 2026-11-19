import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { safeMemberReturn } from './rules.js';
const KEY = 'community_return_path';
export function useMemberReturn({ isAuthReady, token, showInputCode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [preserveInitial] = useState(() => Boolean(safeMemberReturn(sessionStorage.getItem(KEY))));
  useEffect(() => {
    const current = `${location.pathname}${location.search}`;
    const target = safeMemberReturn(current);
    if (!isAuthReady || !token || showInputCode) {
      if (target) sessionStorage.setItem(KEY, target);
      return;
    }
    const stored = safeMemberReturn(sessionStorage.getItem(KEY));
    sessionStorage.removeItem(KEY);
    if (stored && stored !== current) navigate(stored, { replace: true });
  }, [isAuthReady, token, showInputCode, location.pathname, location.search, navigate]);
  return preserveInitial;
}
