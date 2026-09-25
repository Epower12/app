/**
 * Every photo and video on the landing page comes from this file.
 *
 * To swap in new footage (e.g. Pixabay downloads — free for commercial use,
 * no attribution required), drop the file into /public/img or /public/video
 * and change the path here. Keep videos short (5–15 s), muted-friendly,
 * ideally ≤ 4 MB and 1280 px wide; always pair a video with a poster image
 * so the page looks right before the video loads or when motion is reduced.
 */

import whyDebate from './img/why-debate.webp';
import whyMatter from './img/why-matter.webp';
import whyFriends from './img/why-friends.webp';
import finale from './img/finale.webp';

export interface Credit {
    author: string;
    /** Source page of the clip (Pexels asks for a link back). */
    href: string;
}

export interface Media {
    /** Still image (also used as the video poster). */
    img: string;
    /** Optional looping background video. */
    video?: string;
    /** Required for third-party stock footage; rendered in the footer. */
    credit?: Credit;
}

/** Stock clips from Pexels (free to use), streamed from the Pexels CDN.
 *  For faster loads, download them into /public/video and point `video` at the local copy. */
const PEXELS = 'https://videos.pexels.com/video-files';

export const MEDIA = {
    hero: {
        img: '/img/sport-crowd.png',
        video: `${PEXELS}/6104279/6104279-hd_1920_1080_25fps.mp4`,
        credit: { author: 'Kampus Production', href: 'https://www.pexels.com/video/sports-fans-cheering-on-the-couch-6104279/' },
    },
    heroSide: {
        img: '/img/sport-hockey.png',
        video: `${PEXELS}/6338170/6338170-hd_1280_720_25fps.mp4`,
        credit: { author: 'Tony Schnagl', href: 'https://www.pexels.com/video/people-playing-hockey-6338170/' },
    },

    football: {
        img: '/img/sport-football.png',
        video: `${PEXELS}/15367835/15367835-hd_1280_720_30fps.mp4`,
        credit: { author: 'Oscar Arce', href: 'https://www.pexels.com/video/futbol-soccer-polideportivo-chilpancingo-15367835/' },
    },
    hockey: {
        img: '/img/sport-hockey.png',
        video: `${PEXELS}/6338172/6338172-hd_1280_720_25fps.mp4`,
        credit: { author: 'Tony Schnagl', href: 'https://www.pexels.com/video/people-playing-ice-hockey-6338172/' },
    },
    basketball: {
        img: '/img/sport-basketball.png',
        video: `${PEXELS}/8979081/8979081-hd_1920_1080_30fps.mp4`,
        credit: { author: 'PNW Production', href: 'https://www.pexels.com/video/man-dunking-the-basketball-8979081/' },
    },
    racing: {
        img: '/img/sport-racing.png',
        video: `${PEXELS}/18447536/18447536-hd_1920_1080_60fps.mp4`,
        credit: { author: 'Jaxon Matthew Willis', href: 'https://www.pexels.com/video/a-race-car-speeding-on-the-track-18447536/' },
    },
    tennis: {
        img: '/img/sport-tennis.png',
        video: `${PEXELS}/4902773/4902773-hd_1280_720_25fps.mp4`,
        credit: { author: 'Antoni Shkraba', href: 'https://www.pexels.com/video/a-tennis-player-serving-the-ball-4902773/' },
    },

    // Generated with Ideogram (docs/scripts/generate-landing-images.sh) and bundled from ./img.
    whyDebate: { img: whyDebate.src },
    whyMatter: { img: whyMatter.src },
    whyFriends: { img: whyFriends.src },

    finale: { img: finale.src },
} satisfies Record<string, Media>;

/** Unique credits for every clip on the page, for the footer. */
export const CREDITS: Credit[] = Object.values(MEDIA as Record<string, Media>)
    .flatMap(m => (m.credit ? [m.credit] : []))
    .filter((c, i, all) => all.findIndex(o => o.author === c.author) === i);
