import React, { createContext, useContext } from 'react';

interface ViewTransitionContextValue {
  fadeOutMainContent: () => void;
}

const noop = () => {};

const ViewTransitionContext = createContext<ViewTransitionContextValue>({
  fadeOutMainContent: noop,
});

export const ViewTransitionProvider = ViewTransitionContext.Provider;

export const useProtectedViewTransition = () => useContext(ViewTransitionContext);

