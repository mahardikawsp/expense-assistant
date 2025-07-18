'use client';

import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    className?: string;
    showCloseButton?: boolean;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export function Modal({
    isOpen,
    onClose,
    title,
    children,
    className,
    showCloseButton = true,
    size = 'md',
}: ModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);
    const [isMounted, setIsMounted] = React.useState(false);

    // Handle click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            // Prevent scrolling when modal is open
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    // Handle escape key to close
    useEffect(() => {
        const handleEscapeKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscapeKey);
        }

        return () => {
            document.removeEventListener('keydown', handleEscapeKey);
        };
    }, [isOpen, onClose]);

    // Client-side only
    useEffect(() => {
        setIsMounted(true);
        return () => setIsMounted(false);
    }, []);

    if (!isOpen || !isMounted) {
        return null;
    }

    // Simple size mapping
    const modalWidth = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        full: 'max-w-[90vw]',
    }[size];

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div
                ref={modalRef}
                style={{ width: 'auto', minWidth: '300px' }}
                className={cn(
                    'bg-background rounded-lg border border-border shadow-lg',
                    modalWidth,
                    className
                )}
            >
                {(title || showCloseButton) && (
                    <div className="flex items-center justify-between border-b border-border p-4">
                        {title && <h3 className="text-lg font-medium">{title}</h3>}
                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                className="rounded-full p-1 hover:bg-muted"
                                aria-label="Close modal"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        )}
                    </div>
                )}
                <div className="p-4">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
}

export function ModalHeader({ children, className }: { children: React.ReactNode; className?: string }) {
    return <div className={cn('mb-4', className)}>{children}</div>;
}

export function ModalBody({ children, className }: { children: React.ReactNode; className?: string }) {
    return <div className={cn('space-y-4', className)}>{children}</div>;
}

export function ModalFooter({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn('mt-6 flex flex-wrap items-center justify-end gap-2', className)}>
            {children}
        </div>
    );
}