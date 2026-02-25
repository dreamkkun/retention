import { useEffect, useRef } from 'react';

const SessionTimeout = ({ onTimeout, timeout = 30 * 60 * 1000 }) => {
  const timeoutRef = useRef(null);
  const warningRef = useRef(null);

  const resetTimer = () => {
    // 기존 타이머 제거
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);

    // 5분 전 경고
    warningRef.current = setTimeout(() => {
      const remaining = Math.floor((timeout - (timeout - 5 * 60 * 1000)) / 1000 / 60);
      if (window.confirm(`세션이 ${remaining}분 후 만료됩니다. 계속 사용하시겠습니까?`)) {
        resetTimer();
      }
    }, timeout - 5 * 60 * 1000);

    // 세션 만료
    timeoutRef.current = setTimeout(() => {
      onTimeout();
    }, timeout);
  };

  useEffect(() => {
    // 사용자 활동 감지
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      resetTimer();
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    resetTimer();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
    };
  }, [timeout, onTimeout]);

  return null;
};

export default SessionTimeout;
