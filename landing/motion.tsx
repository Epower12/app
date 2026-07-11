'use client';

import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

interface FadeInProps {
    children: ReactNode;
    delay?: number;
    duration?: number;
    x?: number;
    y?: number;
    className?: string;
}

export function FadeIn({ children, delay = 0, duration = 0.7, x = 0, y = 30, className }: FadeInProps) {
    return (
        <motion.div
            className={className}
            initial={{ opacity: 0, x, y }}
            whileInView={{ opacity: 1, x: 0, y: 0 }}
            viewport={{ once: true, margin: '50px', amount: 0 }}
            transition={{ delay, duration, ease: [0.25, 0.1, 0.25, 1] }}
        >
            {children}
        </motion.div>
    );
}

interface MagnetProps {
    children: ReactNode;
    padding?: number;
    strength?: number;
    className?: string;
}

/** Mouse-following magnetic hover: the element drifts toward the cursor
 *  when it comes within `padding` px, divided by `strength`. */
export function Magnet({ children, padding = 150, strength = 3, className }: MagnetProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [active, setActive] = useState(false);

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            const el = ref.current;
            if (!el) return;
            const r = el.getBoundingClientRect();
            const cx = r.left + r.width / 2;
            const cy = r.top + r.height / 2;
            const dx = e.clientX - cx;
            const dy = e.clientY - cy;
            const within = Math.abs(dx) < r.width / 2 + padding && Math.abs(dy) < r.height / 2 + padding;
            if (within) {
                setActive(true);
                setOffset({ x: dx / strength, y: dy / strength });
            } else {
                setActive(false);
                setOffset({ x: 0, y: 0 });
            }
        };
        window.addEventListener('mousemove', onMove, { passive: true });
        return () => window.removeEventListener('mousemove', onMove);
    }, [padding, strength]);

    return (
        <div
            ref={ref}
            className={className}
            style={{
                transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
                transition: active ? 'transform 0.3s ease-out' : 'transform 0.6s ease-in-out',
                willChange: 'transform',
            }}
        >
            {children}
        </div>
    );
}
