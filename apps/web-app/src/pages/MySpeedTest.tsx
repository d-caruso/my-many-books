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

    login('speedtest@mymanybooks.com', 'SpeedTest2026!')
      .then(() => navigate('/', { replace: true }))
      .catch(() => navigate('/auth', { replace: true }));
  }, []);

  return <NativeLoading />;
};

export default MySpeedTest;
