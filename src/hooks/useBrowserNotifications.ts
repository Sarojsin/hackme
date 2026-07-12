import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseBrowserNotificationsReturn {
  permission: NotificationPermission | 'unsupported';
  notify: (title: string, options?: NotificationOptions) => void;
  requestPermission: () => Promise<NotificationPermission | 'unsupported'>;
}

/**
 * Hook for managing browser Notification API permissions and displaying
 * desktop notifications. Gracefully degrades if the API is unavailable.
 */
export function useBrowserNotifications(): UseBrowserNotificationsReturn {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });

  const permissionRef = useRef(permission);
  permissionRef.current = permission;

  // On mount, request permission if not yet decided (auto-triggers after user gesture)
  useEffect(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().then((p) => setPermission(p));
    }
  }, []);

  /** Display a desktop notification (no-op if permission denied / unsupported) */
  const notify = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (permissionRef.current === 'granted' && 'Notification' in window) {
        try {
          new Notification(title, {
            icon: '/nativelyai.svg',
            badge: '/nativelyai.svg',
            ...options,
          });
        } catch {
          // Silently fail — notification may have been blocked at runtime
        }
      }
    },
    []
  );

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return 'unsupported' as const;
    const p = await Notification.requestPermission();
    setPermission(p);
    return p;
  }, []);

  return { permission, notify, requestPermission };
}