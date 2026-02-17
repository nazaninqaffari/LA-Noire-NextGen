/**
 * Notification Component
 * Displays alert messages with Film Noir styling
 */
import React from 'react';
import type { Notification as NotificationType } from '../types/notification';
import './Notification.css';

interface NotificationProps {
  notification: NotificationType;
  onDismiss: (id: string) => void;
}

const Notification: React.FC<NotificationProps> = ({ notification, onDismiss }) => {
  const { id, type, title, message, dismissible } = notification;

  // Icon mappings for different notification types
  const iconMap = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  return (
    <div className={`notification notification-${type}`} role="alert">
      <div className="notification-icon">{iconMap[type]}</div>
      <div className="notification-content">
        <div className="notification-title">{title}</div>
        <div className="notification-message">{message}</div>
      </div>
      {dismissible && (
        <button
          className="notification-close"
          onClick={() => onDismiss(id)}
          aria-label="Dismiss notification"
        >
          ✕
        </button>
      )}
    </div>
  );
};

export default Notification;
