'use client';

import type { ReactNode } from 'react';

/** Brand imagery for each sport (public/img, Ideogram-generated).
 *  Esports share the scoreboard shot; unknown sports get the arena. */
const SPORT_IMAGES: Record<string, string> = {
    Football: '/img/sport-football.png',
    'Ice Hockey': '/img/sport-hockey.png',
    Basketball: '/img/sport-basketball.png',
    Tennis: '/img/sport-tennis.png',
    'Formula 1': '/img/sport-racing.png',
    MotoGP: '/img/sport-racing.png',
    'League of Legends': '/img/sport-scoreboard.png',
    'Counter-Strike': '/img/sport-scoreboard.png',
    'Dota 2': '/img/sport-scoreboard.png',
    Valorant: '/img/sport-scoreboard.png',
};

export function sportImage(sport?: string): string {
    return (sport && SPORT_IMAGES[sport]) || '/img/hero-arena.png';
}

/** Page header with a sport image backdrop — shared by the in-app pages so
 *  they carry the same brand photography as the landing page. */
export default function SportHeader({
    title,
    subtitle,
    image,
    actions,
}: {
    title: string;
    subtitle?: ReactNode;
    image: string;
    actions?: ReactNode;
}) {
    return (
        <div className="sport-header">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="" className="sport-header-img" aria-hidden="true" />
            <div className="sport-header-scrim" aria-hidden="true" />
            <div className="sport-header-content">
                <h1 className="app-page-title">{title}</h1>
                {subtitle && <p className="sport-header-subtitle">{subtitle}</p>}
            </div>
            {actions && <div className="sport-header-actions">{actions}</div>}
        </div>
    );
}
