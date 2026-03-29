import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@my-many-books/shared-auth';
import { NativeLoading } from '../components/NativeLoading';

const MySpeedTest: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const key = new URLSearchParams(window.location.search).get('key');

    if (key !== 'Bla_Bla_!') {
      void navigate('/auth', { replace: true });
      return;
    }

    console.log('[MySpeedTest] calling login...');
    login('speedtest@mymanybooks.com', 'SpeedTest2026!')
      .then(() => {
        console.log('[MySpeedTest] login succeeded, replacing location');
        window.location.replace('/');
      })
      .catch((err: unknown) => {
        console.error('[MySpeedTest] login failed:', err);
        void navigate('/auth', { replace: true });
      });
  }, []);

  return <NativeLoading />;
};

export default MySpeedTest;
