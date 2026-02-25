import React, { createContext, useContext } from 'react';

interface ViewTransitionContextValue {
  fadeOutMainContent: () => void;
  runMainContentTransition: (action: () => void) => void;
}

const noop = () => {};

const ViewTransitionContext = createContext<ViewTransitionContextValue>({
  fadeOutMainContent: noop,
  runMainContentTransition: (action) => action(),
});

export const ViewTransitionProvider = ViewTransitionContext.Provider;

export const useProtectedViewTransition = () => useContext(ViewTransitionContext);
