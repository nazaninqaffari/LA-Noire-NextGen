/**
 * Notification Context
 * Global notification system for alerts, errors, and success messages
 */
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { Notification, NotificationContextType } from '../types/notification';

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: Notification = {
      id,
      ...notification,
      duration: notification.duration ?? 5000, // Default 5 seconds
      dismissible: notification.dismissible ?? true,
    };

    setNotifications((prev) => [...prev, newNotification]);

    // Auto-dismiss if duration is set and not 0
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const showNotification = useCallback(
    (message: string, type: 'success' | 'error' | 'warning' | 'info', title?: string) => {
      addNotification({
        type,
        title: title || type.charAt(0).toUpperCase() + type.slice(1),
        message,
      });
    },
    [addNotification]
  );

  return (
    <NotificationContext.Provider
      value={{ notifications, addNotification, removeNotification, clearAll, showNotification }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

/**
 * Hook to access notification system
 * @example
 * const { addNotification } = useNotification();
 * addNotification({ type: 'success', title: 'Success!', message: 'Operation completed' });
 */
export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
