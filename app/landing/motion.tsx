'use client';

import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { Media } from './media';

interface FadeInProps {
    children: ReactNode;
    delay?: number;
    duration?: number;
    x?: number;
    y?: number;
    className?: string;
    role?: string;
    'aria-label'?: string;
}

export function FadeIn({ children, delay = 0, duration = 0.7, x = 0, y = 30, className, role, 'aria-label': ariaLabel }: FadeInProps) {
    return (
        <motion.div
            className={className}
            role={role}
            aria-label={ariaLabel}
            initial={{ opacity: 0, x, y }}
            whileInView={{ opacity: 1, x: 0, y: 0 }}
            viewport={{ once: true, margin: '50px', amount: 0 }}
            transition={{ delay, duration, ease: [0.25, 0.1, 0.25, 1] }}
        >
            {children}
        </motion.div>
    );
}

/** Gentle idle bob for the floating UI cards in the hero. */
export function Float({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
    return (
        <motion.div
            className={className}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1, y: [0, -10, 0] }}
            transition={{
                opacity: { delay, duration: 0.5 },
                scale: { delay, duration: 0.5 },
                y: { delay: delay + 0.5, duration: 4, repeat: Infinity, ease: 'easeInOut' },
            }}
        >
            {children}
        </motion.div>
    );
}

/**
 * Photo or looping video, filling its parent. Videos only download and play
 * while on screen, and stay on the poster when the visitor prefers reduced motion.
 */
export function MediaFill({ media, className }: { media: Media; className?: string }) {
    const ref = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const io = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) el.play().catch(() => {});
                else el.pause();
            },
            { threshold: 0.2 },
        );
        io.observe(el);
        return () => io.disconnect();
    }, []);

    if (!media.video) {
        // eslint-disable-next-line @next/next/no-img-element
        return <img src={media.img} alt="" loading="lazy" className={className} />;
    }
    return (
        <video
            ref={ref}
            src={media.video}
            poster={media.img}
            muted
            loop
            playsInline
            preload="none"
            className={className}
        />
    );
}
