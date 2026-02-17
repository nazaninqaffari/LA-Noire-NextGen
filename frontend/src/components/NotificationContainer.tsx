/**
 * Notification Container
 * Renders all active notifications
 */
import React from 'react';
import { useNotification } from '../contexts/NotificationContext';
import Notification from './Notification';
import './Notification.css';

const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotification();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          notification={notification}
          onDismiss={removeNotification}
        />
      ))}
    </div>
  );
};

export default NotificationContainer;
