/**
 * Notification Component Tests
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Notification from '../src/components/Notification';
import type { Notification as NotificationType } from '../src/types/notification';

describe('Notification Component', () => {
  const mockOnDismiss = vi.fn();

  const createMockNotification = (type: NotificationType['type']): NotificationType => ({
    id: 'test-notification-1',
    type,
    title: 'Test Title',
    message: 'Test message',
    dismissible: true,
    duration: 5000,
  });

  it('renders success notification correctly', () => {
    const notification = createMockNotification('success');
    render(<Notification notification={notification} onDismiss={mockOnDismiss} />);

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test message')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders error notification correctly', () => {
    const notification = createMockNotification('error');
    render(<Notification notification={notification} onDismiss={mockOnDismiss} />);

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders warning notification correctly', () => {
    const notification = createMockNotification('warning');
    render(<Notification notification={notification} onDismiss={mockOnDismiss} />);

    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('renders info notification correctly', () => {
    const notification = createMockNotification('info');
    render(<Notification notification={notification} onDismiss={mockOnDismiss} />);

    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('shows dismiss button when dismissible is true', () => {
    const notification = createMockNotification('success');
    render(<Notification notification={notification} onDismiss={mockOnDismiss} />);

    const dismissButton = screen.getByLabelText('Dismiss notification');
    expect(dismissButton).toBeInTheDocument();
  });

  it('hides dismiss button when dismissible is false', () => {
    const notification = { ...createMockNotification('success'), dismissible: false };
    render(<Notification notification={notification} onDismiss={mockOnDismiss} />);

    const dismissButton = screen.queryByLabelText('Dismiss notification');
    expect(dismissButton).not.toBeInTheDocument();
  });

  it('calls onDismiss with correct id when dismiss button is clicked', () => {
    const notification = createMockNotification('success');
    render(<Notification notification={notification} onDismiss={mockOnDismiss} />);

    const dismissButton = screen.getByLabelText('Dismiss notification');
    fireEvent.click(dismissButton);

    expect(mockOnDismiss).toHaveBeenCalledWith('test-notification-1');
  });

  it('applies correct CSS class based on notification type', () => {
    const notification = createMockNotification('error');
    const { container } = render(<Notification notification={notification} onDismiss={mockOnDismiss} />);

    const notificationElement = container.querySelector('.notification-error');
    expect(notificationElement).toBeInTheDocument();
  });
});
