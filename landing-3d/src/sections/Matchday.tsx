import { useRef } from 'react';
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import FadeIn from '../components/FadeIn';
import { GhostButton } from '../components/Buttons';

const SPORTS = [
  {
    number: '01',
    name: 'Football',
    format: 'Exact score',
    video: '/video/football.mp4',
    poster: '/img/sport-football.png',
  },
  {
    number: '02',
    name: 'Ice hockey',
    format: 'Exact score',
    video: '/video/hockey.mp4',
    poster: '/img/sport-hockey.png',
  },
  {
    number: '03',
    name: 'Basketball',
    format: 'Exact score',
    video: '/video/basketball.mp4',
    poster: '/img/sport-basketball.png',
  },
  {
    number: '04',
    name: 'Racing',
    format: 'Podium picks · P1 P2 P3',
    video: '/video/racing.mp4',
    poster: '/img/sport-racing.png',
  },
];

function Card({
  sport,
  index,
  total,
  progress,
}: {
  sport: (typeof SPORTS)[number];
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const targetScale = 1 - (total - 1 - index) * 0.03;
  const scale = useTransform(progress, [index / total, 1], [1, targetScale]);

  return (
    <div className="sticky top-24 h-[85vh] md:top-32" style={{ top: `calc(6rem + ${index * 28}px)` }}>
      <motion.div
        style={{ scale }}
        className="rounded-[40px] border-2 border-frost/70 bg-ink p-4 sm:rounded-[50px] sm:p-6 md:rounded-[60px] md:p-8"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4 px-2 sm:mb-6 sm:px-4">
          <div className="flex items-center gap-5 sm:gap-8">
            <span
              className="hero-heading font-display leading-none"
              style={{ fontSize: 'clamp(2.6rem, 7vw, 96px)' }}
            >
              {sport.number}
            </span>
            <div className="flex flex-col">
              <h3
                className="font-display uppercase tracking-wide text-frost"
                style={{ fontSize: 'clamp(1.2rem, 3vw, 2.4rem)' }}
              >
                {sport.name}
              </h3>
              <span className="text-xs font-light uppercase tracking-widest text-steel sm:text-sm">
                {sport.format}
              </span>
            </div>
          </div>
          <GhostButton href="https://app.yourfriendleague.com/signup">Predict now</GhostButton>
        </div>

        <video
          src={sport.video}
          poster={sport.poster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="aspect-video max-h-[56vh] w-full rounded-[28px] object-cover sm:rounded-[36px] md:rounded-[44px]"
        />
      </motion.div>
    </div>
  );
}

export default function Matchday() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });

  return (
    <section
      id="matchday"
      ref={ref}
      className="relative z-10 -mt-10 rounded-t-[40px] bg-ink px-4 pb-24 pt-20 sm:-mt-12 sm:rounded-t-[50px] sm:px-6 md:-mt-14 md:rounded-t-[60px] md:px-10 md:pt-28"
    >
      <FadeIn y={40}>
        <h2
          className="hero-heading mb-10 text-center font-display uppercase leading-none tracking-tight sm:mb-14 md:mb-20"
          style={{ fontSize: 'clamp(3rem, 12vw, 160px)' }}
        >
          Matchday
        </h2>
      </FadeIn>

      {SPORTS.map((sport, i) => (
        <Card key={sport.name} sport={sport} index={i} total={SPORTS.length} progress={scrollYProgress} />
      ))}
    </section>
  );
}
