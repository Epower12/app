import FadeIn from '../components/FadeIn';
import Magnet from '../components/Magnet';
import { GradientButton } from '../components/Buttons';

const NAV = [
  { label: 'The game', href: '#game' },
  { label: 'Scoring', href: '#scoring' },
  { label: 'Matchday', href: '#matchday' },
  { label: 'Sign in', href: 'https://app.yourfriendleague.com/login' },
];

export default function Hero() {
  return (
    <section className="flex h-screen flex-col" style={{ overflowX: 'clip' }}>
      {/* Navbar */}
      <FadeIn delay={0} y={-20}>
        <nav className="flex items-center justify-between px-6 pt-6 md:px-10 md:pt-8">
          {NAV.map(link => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium uppercase tracking-wider text-frost transition-opacity duration-200 hover:opacity-70 md:text-lg lg:text-[1.15rem]"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </FadeIn>

      {/* Headline */}
      <div className="overflow-hidden px-1">
        <FadeIn delay={0.15} y={40}>
          <h1 className="hero-heading w-full whitespace-nowrap pb-2 pt-1 text-center font-display text-[10.2vw] uppercase leading-none tracking-tight">
            Call the score
          </h1>
        </FadeIn>
      </div>

      {/* Hero video — magnetic, in normal flow so nothing overlaps */}
      <div className="flex min-h-0 flex-1 items-center justify-center px-6 py-3 md:py-4">
        <FadeIn delay={0.5} y={30} className="flex h-full max-h-full items-center justify-center">
          <Magnet padding={150} strength={12}>
            <div
              className="aspect-video h-auto max-h-[52vh] w-[min(88vw,860px)] overflow-hidden rounded-2xl border border-brand/25 md:rounded-3xl"
              style={{
                boxShadow: '0 0 60px rgba(56, 189, 248, 0.22), 0 30px 80px rgba(0,0,0,0.6)',
              }}
            >
              <video
                src="/video/basketball.mp4"
                poster="/img/sport-basketball.png"
                autoPlay
                muted
                loop
                playsInline
                className="block h-full w-full object-cover"
              />
            </div>
          </Magnet>
        </FadeIn>
      </div>

      {/* Bottom bar */}
      <div className="flex items-end justify-between px-6 pb-7 sm:pb-8 md:px-10 md:pb-10">
        <FadeIn delay={0.35} y={20}>
          <p
            className="max-w-[180px] font-light uppercase leading-snug tracking-wide text-frost sm:max-w-[260px] md:max-w-[320px]"
            style={{ fontSize: 'clamp(0.75rem, 1.2vw, 1.15rem)' }}
          >
            Free score predictions. Private leagues. Friends only.
          </p>
        </FadeIn>
        <FadeIn delay={0.5} y={20}>
          <GradientButton href="https://app.yourfriendleague.com/signup">
            Start free
          </GradientButton>
        </FadeIn>
      </div>
    </section>
  );
}
