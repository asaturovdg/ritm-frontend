import { createContext, useContext } from 'react';

export const TransitionContext = createContext({ direction: 0, type: 'tab' });
export const useTransition = () => useContext(TransitionContext);
