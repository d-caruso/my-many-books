import React, { useEffect, useRef, useState } from 'react';
import { useLocalStorage } from '@my-many-books/shared-ui-hooks';
import { AboutDialog } from './AboutDialog';

const ABOUT_POPUP_HIDDEN_KEY = 'about-popup-hidden';

export const AboutPopupGate: React.FC = () => {
  const [isHidden, setIsHidden] = useLocalStorage<boolean>(ABOUT_POPUP_HIDDEN_KEY, false);
  const [open, setOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) {
      return;
    }

    hasInitialized.current = true;
    if (!isHidden) {
      if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      setOpen(true);
    }
  }, [isHidden]);

  const handleClose = () => {
    if (dontShowAgain) {
      setIsHidden(true);
    }

    setOpen(false);
    setDontShowAgain(false);
  };

  return (
    <AboutDialog
      open={open}
      onClose={handleClose}
      showDontShowAgain
      dontShowAgain={dontShowAgain}
      onDontShowAgainChange={setDontShowAgain}
    />
  );
};

export default AboutPopupGate;
