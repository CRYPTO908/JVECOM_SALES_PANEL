import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { notificationsService } from '@/services/notifications.service';

export function useNotificationCount() {
  const { profile } = useAuth();
  const [count, setCount] = useState(2); // Demo initial unread count

  useEffect(() => {
    if (!profile?.id) return;

    notificationsService
      .getUnreadCount(profile.id)
      .then(cnt => {
        if (cnt !== undefined && cnt >= 0) setCount(cnt);
      })
      .catch(() => {});
  }, [profile?.id]);

  return { count, setCount };
}
