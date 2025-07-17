'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

import { Notification } from './notification';
import { Button } from '@/components/ui/button';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { markNotificationAsRead } from '@/lib/notification-utils';

interface NotificationItem {
    id: string;
    title: string;
    message: string;
    severity: 'default' | 'success' | 'warning' | 'error' | 'info';
    icon: string;
    isRead: boolean;
    createdAt: Date;
}

interface NotificationCenterProps {
    userId: string;
}

export function NotificationCenter({ userId }: NotificationCenterProps) {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const { addToast } = useToast();

    // Fetch notifications
    const fetchNotifications = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/notification?limit=5&unreadOnly=true');
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to fetch notifications');
            }
            const data = await response.json();
            setNotifications(data.data);
            setUnreadCount(data.pagination.total);
        } catch (error) {
            console.error('Error fetching notifications:', error);
            addToast({
                title: 'Error',
                message: error instanceof Error ? error.message : 'Failed to load notifications',
                type: 'error',
                duration: 5000,
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Load notifications on component mount and periodically
    useEffect(() => {
        fetchNotifications();

        // Set up polling for new notifications every 60 seconds
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    // Handle marking a notification as read
    const handleMarkAsRead = async (notificationId: string) => {
        try {
            await markNotificationAsRead(notificationId, userId);

            // Update local state
            setNotifications(prev =>
                prev.map(notification =>
                    notification.id === notificationId
                        ? { ...notification, isRead: true }
                        : notification
                )
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking notification as read:', error);
            addToast({
                title: 'Error',
                message: error instanceof Error ? error.message : 'Failed to mark notification as read',
                type: 'error',
                duration: 3000,
            });
        }
    };

    // Handle marking all notifications as read
    const handleMarkAllAsRead = async () => {
        try {
            const response = await fetch('/api/notification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ action: 'markAllAsRead' }),
            });

            if (!response.ok) {
                throw new Error('Failed to mark notifications as read');
            }

            // Update local state
            setNotifications(prev => prev.map(notification => ({ ...notification, isRead: true })));
            setUnreadCount(0);

            addToast({
                title: 'Success',
                message: 'All notifications marked as read',
                type: 'success',
            });

            setIsOpen(false);
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            addToast({
                title: 'Error',
                message: 'Failed to mark notifications as read',
                type: 'error',
            });
        }
    };

    // Close notification panel when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (isOpen && !target.closest('[data-notification-panel]')) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <>
            <div className="relative">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(!isOpen)}
                    className="relative"
                    aria-label="Open notifications"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path>
                        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path>
                    </svg>
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 h-5 w-5 rounded-full bg-destructive text-xs text-white flex items-center justify-center">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>

                {isOpen && (
                    <div
                        data-notification-panel
                        className="absolute right-0 md:right-auto md:left-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 bg-background border border-border rounded-md shadow-lg z-50"
                        style={{ maxWidth: 'calc(100vw - 2rem)' }}
                    >
                        <div className="p-3 border-b border-border flex justify-between items-center">
                            <h3 className="font-medium">Notifications</h3>
                            {unreadCount > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleMarkAllAsRead}
                                    className="text-xs py-2 h-auto"
                                >
                                    Mark all as read
                                </Button>
                            )}
                        </div>
                        <div className="max-h-[60vh] md:max-h-96 overflow-y-auto">
                            {isLoading ? (
                                <div className="flex justify-center p-4">
                                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="p-4 text-center text-muted-foreground">
                                    No new notifications
                                </div>
                            ) : (
                                <div className="divide-y divide-border">
                                    {notifications.map((notification) => (
                                        <div
                                            key={notification.id}
                                            className={`p-4 hover:bg-muted/50 ${!notification.isRead ? 'bg-muted/20' : ''}`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-medium text-sm">{notification.title}</h4>
                                                <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
                                                    {format(new Date(notification.createdAt), 'MMM d, h:mm a')}
                                                </span>
                                            </div>
                                            <p className="text-sm mt-1 break-words">{notification.message}</p>
                                            {!notification.isRead && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleMarkAsRead(notification.id)}
                                                    className="text-xs mt-2 py-2 h-auto"
                                                >
                                                    Mark as read
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="p-3 border-t border-border">
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full py-2 h-auto"
                                onClick={() => {
                                    setIsOpen(false);
                                    setIsHistoryModalOpen(true);
                                }}
                            >
                                View all notifications
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Notification History Modal */}
            <NotificationHistoryModal
                isOpen={isHistoryModalOpen}
                onClose={() => setIsHistoryModalOpen(false)}
                userId={userId}
            />
        </>
    );
}

interface NotificationHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
}

function NotificationHistoryModal({ isOpen, onClose, userId }: NotificationHistoryModalProps) {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const { addToast } = useToast();

    // Fetch notification history
    const fetchNotificationHistory = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/notification?page=${page}&limit=10`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to fetch notification history');
            }
            const data = await response.json();
            setNotifications(data.data);
            setTotalPages(data.pagination.totalPages);
        } catch (error) {
            console.error('Error fetching notification history:', error);
            addToast({
                title: 'Error',
                message: error instanceof Error ? error.message : 'Failed to load notification history',
                type: 'error',
                duration: 5000,
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Load notification history when modal opens or page changes
    useEffect(() => {
        if (isOpen) {
            fetchNotificationHistory();
        }
    }, [isOpen, page]);

    // Handle marking a notification as read
    const handleMarkAsRead = async (notificationId: string) => {
        try {
            await markNotificationAsRead(notificationId, userId);

            // Update local state
            setNotifications(prev =>
                prev.map(notification =>
                    notification.id === notificationId
                        ? { ...notification, isRead: true }
                        : notification
                )
            );
        } catch (error) {
            console.error('Error marking notification as read:', error);
            addToast({
                title: 'Error',
                message: error instanceof Error ? error.message : 'Failed to mark notification as read',
                type: 'error',
                duration: 3000,
            });
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Notification History" size="lg">
            <ModalHeader>
                <h2 className="text-xl font-semibold">Notification History</h2>
            </ModalHeader>
            <ModalBody className="max-h-[60vh] overflow-y-auto">
                {isLoading ? (
                    <div className="flex justify-center p-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                        No notifications found
                    </div>
                ) : (
                    <div className="space-y-4">
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`p-4 border border-border rounded-md ${!notification.isRead ? 'bg-muted/20' : ''}`}
                            >
                                <div className="flex justify-between items-start">
                                    <h4 className="font-medium">{notification.title}</h4>
                                    <span className="text-xs text-muted-foreground">
                                        {format(new Date(notification.createdAt), 'MMM d, yyyy h:mm a')}
                                    </span>
                                </div>
                                <p className="mt-2">{notification.message}</p>
                                {!notification.isRead && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleMarkAsRead(notification.id)}
                                        className="mt-2 py-2 h-auto"
                                    >
                                        Mark as read
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </ModalBody>
            <ModalFooter>
                <div className="flex flex-col sm:flex-row justify-between items-center w-full gap-2">
                    <div className="flex space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page === 1}
                            onClick={() => setPage(prev => Math.max(1, prev - 1))}
                            className="py-2 h-auto"
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page === totalPages}
                            onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                            className="py-2 h-auto"
                        >
                            Next
                        </Button>
                    </div>
                    <div className="text-sm text-muted-foreground">
                        Page {page} of {totalPages}
                    </div>
                </div>
            </ModalFooter>
        </Modal>
    );
}