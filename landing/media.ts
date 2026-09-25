/**
 * Every photo and video on the landing page comes from this file.
 *
 * To swap in new footage (e.g. Pixabay downloads — free for commercial use,
 * no attribution required), drop the file into /public/img or /public/video
 * and change the path here. Keep videos short (5–15 s), muted-friendly,
 * ideally ≤ 4 MB and 1280 px wide; always pair a video with a poster image
 * so the page looks right before the video loads or when motion is reduced.
 */

export interface Media {
    /** Still image (also used as the video poster). */
    img: string;
    /** Optional looping background video. */
    video?: string;
}

export const MEDIA = {
    hero: { img: '/img/sport-football.png', video: '/video/football.mp4' },
    heroSide: { img: '/img/sport-hockey.png', video: '/video/hockey.mp4' },

    football: { img: '/img/sport-football.png', video: '/video/football.mp4' },
    hockey: { img: '/img/sport-hockey.png', video: '/video/hockey.mp4' },
    basketball: { img: '/img/sport-basketball.png', video: '/video/basketball.mp4' },
    racing: { img: '/img/sport-racing.png', video: '/video/racing.mp4' },
    tennis: { img: '/img/sport-tennis.png' },

    whyDebate: { img: '/img/sport-crowd.png' },
    whyMatter: { img: '/img/sport-scoreboard.png' },
    whyFriends: { img: '/img/sport-floodlight.png' },

    finale: { img: '/img/cta-celebration.png' },
} satisfies Record<string, Media>;
