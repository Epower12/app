import FadeIn from '../components/FadeIn';
import { GradientButton } from '../components/Buttons';

export default function Footer() {
  return (
    <footer className="relative overflow-hidden px-5 pb-10 pt-28 sm:px-8 md:px-10 md:pt-36">
      {/* Confetti atmosphere behind the closing line */}
      <img
        src="/img/cta-celebration.png"
        alt=""
        loading="lazy"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25"
      />
      <div className="relative flex flex-col items-center gap-10 md:gap-14">
        <FadeIn y={40}>
          <h2
            className="hero-heading text-center font-display uppercase leading-none tracking-tight"
            style={{ fontSize: 'clamp(2.6rem, 10vw, 140px)' }}
          >
            Your move
          </h2>
        </FadeIn>
        <FadeIn delay={0.15} y={20}>
          <GradientButton href="https://app.yourfriendleague.com/signup">
            Start free — takes a minute
          </GradientButton>
        </FadeIn>

        <div className="mt-16 flex w-full flex-col items-center justify-between gap-3 border-t border-frost/10 pt-6 text-xs font-light uppercase tracking-widest text-steel sm:flex-row md:mt-24">
          <span>© SIA EGATRI · yourfriendleague.com</span>
          <div className="flex gap-6">
            <a href="https://yourfriendleague.com/terms" className="transition-opacity hover:opacity-70">
              Terms
            </a>
            <a href="https://yourfriendleague.com/privacy" className="transition-opacity hover:opacity-70">
              Privacy
            </a>
            <a href="https://yourfriendleague.com/legal" className="transition-opacity hover:opacity-70">
              Legal
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
