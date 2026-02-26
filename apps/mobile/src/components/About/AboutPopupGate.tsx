import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AboutDialog } from './AboutDialog';

const ABOUT_POPUP_HIDDEN_KEY = 'aboutPopupHidden';

export const AboutPopupGate: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const didCheckStorage = useRef(false);

  useEffect(() => {
    let isMounted = true;

    if (didCheckStorage.current) {
      return () => {
        isMounted = false;
      };
    }

    didCheckStorage.current = true;

    const loadPreference = async () => {
      try {
        const stored = await AsyncStorage.getItem(ABOUT_POPUP_HIDDEN_KEY);
        if (isMounted && stored !== 'true') {
          setVisible(true);
        }
      } catch {
        if (isMounted) {
          setVisible(true);
        }
      }
    };

    void loadPreference();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleClose = async () => {
    if (dontShowAgain) {
      try {
        await AsyncStorage.setItem(ABOUT_POPUP_HIDDEN_KEY, 'true');
      } catch {
        // Ignore storage failures; the dialog is informational only.
      }
    }

    setVisible(false);
    setDontShowAgain(false);
  };

  return (
    <AboutDialog
      visible={visible}
      onClose={() => {
        void handleClose();
      }}
      showDontShowAgain
      dontShowAgain={dontShowAgain}
      onDontShowAgainChange={setDontShowAgain}
    />
  );
};

export default AboutPopupGate;
