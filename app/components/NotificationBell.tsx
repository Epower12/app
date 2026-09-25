'use client';

import { useEffect, useRef, useState } from 'react';

interface Notification {
    id: string;
    message: string;
    points_earned: number | null;
    is_read: boolean;
    created_at: number;
    tournament_id: string | null;
}

function timeAgo(ts: number): string {
    const diff = Math.floor(Date.now() / 1000) - ts;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationBell() {
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unread, setUnread] = useState(0);
    const ref = useRef<HTMLDivElement>(null);

    const fetchNotifications = async () => {
        try {
            const res = await fetch('/api/notifications');
            if (!res.ok) return;
            const data = await res.json();
            setNotifications(data.notifications || []);
            setUnread(data.unreadCount || 0);
        } catch { /* ignore */ }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30_000);
        return () => clearInterval(interval);
    }, []);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleOpen = async () => {
        const wasOpen = open;
        setOpen(o => !o);
        if (!wasOpen && unread > 0) {
            // Mark all read
            await fetch('/api/notifications', { method: 'PATCH' });
            setUnread(0);
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        }
    };

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            {/* Bell button */}
            <button
                onClick={handleOpen}
                aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
                style={{
                    position: 'relative',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.3rem',
                    borderRadius: 'var(--radius-sm)',
                    color: open ? 'var(--color-primary)' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 0.15s',
                }}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unread > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: -2, right: -2,
                        background: '#f5576c',
                        color: 'white',
                        borderRadius: '999px',
                        fontSize: '0.6rem',
                        fontWeight: 800,
                        minWidth: 16, height: 16,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '0 3px',
                        border: '2px solid var(--bg-nav, #0f172a)',
                        lineHeight: 1,
                        animation: 'pulse 1.5s infinite',
                    }}>
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: 320,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
                    zIndex: 200,
                    overflow: 'hidden',
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '0.75rem 1rem',
                        borderBottom: '1px solid var(--border-color)',
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}>
                        <span>🔔 Notifications</span>
                        {notifications.length > 0 && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                                {notifications.filter(n => !n.is_read).length === 0 ? 'All caught up' : `${notifications.filter(n => !n.is_read).length} unread`}
                            </span>
                        )}
                    </div>

                    {/* List */}
                    <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                        {notifications.length === 0 ? (
                            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔕</div>
                                No notifications yet
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div key={n.id} style={{
                                    padding: '0.75rem 1rem',
                                    borderBottom: '1px solid var(--border-color)',
                                    background: n.is_read ? 'transparent' : 'rgba(56,189,248,0.05)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.2rem',
                                    transition: 'background 0.15s',
                                }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>{n.message}</span>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{timeAgo(n.created_at)}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
