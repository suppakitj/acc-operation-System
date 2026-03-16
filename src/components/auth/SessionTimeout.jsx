import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function SessionTimeout() {
  const timerRef = useRef(null);
  const warningRef = useRef(null);

  // Fetch session timeout setting from AppConfig
  const { data: configs = [] } = useQuery({
    queryKey: ['appConfig'],
    queryFn: () => base44.entities.AppConfig.filter({ key: 'session_timeout_minutes' }),
    refetchInterval: 300000, // refresh every 5 min
  });

  const timeoutMinutes = (() => {
    const cfg = configs.find(c => c.key === 'session_timeout_minutes');
    const val = cfg ? parseInt(cfg.value) : 30;
    return val > 0 ? val : 30;
  })();

  useEffect(() => {
    const timeoutMs = timeoutMinutes * 60 * 1000;
    const warningMs = Math.max(timeoutMs - 60000, timeoutMs * 0.9); // warn 1 min before

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);

      warningRef.current = setTimeout(() => {
        // Could show a warning toast here in the future
      }, warningMs);

      timerRef.current = setTimeout(() => {
        // Log the timeout event
        base44.entities.AuditLog.create({
          action: 'session_timeout',
          entity_type: 'User',
          details: 'Session timed out due to inactivity',
          user_email: 'system',
          user_name: 'System',
        }).catch(() => {});
        base44.auth.logout();
      }, timeoutMs);
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => window.addEventListener(event, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      events.forEach(event => window.removeEventListener(event, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
    };
  }, [timeoutMinutes]);

  return null; // invisible component
}