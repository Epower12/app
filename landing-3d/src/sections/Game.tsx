import FadeIn from '../components/FadeIn';
import { GradientButton } from '../components/Buttons';

const ABOUT_TEXT =
  'Every match starts the same way: someone swears they know the score. YourFriendsLeague settles it. Pick exact scorelines before kick-off, earn points for precision, and climb a table only your friends can see. Free forever — bragging rights not included.';

/** "About" section — the game explained over a quiet full-bleed stadium backdrop. */
export default function Game() {
  return (
    <section
      id="game"
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-24 sm:px-8 md:px-10"
    >
      {/* Atmosphere layer — fully behind the text, never beside it */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <img
          src="/img/sport-floodlight.png"
          alt=""
          loading="lazy"
          className="h-full w-full object-cover opacity-[0.16]"
        />
        {/* Vignette so the copy stays crisp over the image */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(5,10,20,0.55) 0%, rgba(5,10,20,0.92) 75%, #050a14 100%)',
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-10 sm:gap-12 md:gap-14">
        <FadeIn delay={0} y={40}>
          <h2
            className="hero-heading text-center font-display uppercase leading-none tracking-tight"
            style={{ fontSize: 'clamp(3rem, 12vw, 160px)' }}
          >
            The game
          </h2>
        </FadeIn>

        <FadeIn delay={0.15} y={24}>
          <p className="max-w-[600px] text-center text-[clamp(1rem,2vw,1.35rem)] font-medium leading-relaxed text-frost">
            {ABOUT_TEXT}
          </p>
        </FadeIn>

        <div className="mt-4 sm:mt-8">
          <FadeIn delay={0.25} y={20}>
            <GradientButton href="https://app.yourfriendleague.com/signup">
              Create your league
            </GradientButton>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
