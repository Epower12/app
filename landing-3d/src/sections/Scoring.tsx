import FadeIn from '../components/FadeIn';

/** The numbers here aren't decoration — they're the actual points you earn. */
const TIERS = [
  {
    points: '+5',
    name: 'Exact score',
    desc: 'You called 3–1 and it ended 3–1. Maximum points, maximum bragging rights.',
  },
  {
    points: '+3',
    name: 'Correct margin',
    desc: 'Right winner, right goal difference. Close enough to sting your rivals.',
  },
  {
    points: '+2',
    name: 'Right winner',
    desc: 'You picked the side that won. The safest points on the board.',
  },
  {
    points: '0',
    name: 'Wrong call',
    desc: 'It happens to everyone. There is always the next fixture.',
  },
];

export default function Scoring() {
  return (
    <section
      id="scoring"
      className="rounded-t-[40px] bg-white px-5 py-20 sm:rounded-t-[50px] sm:px-8 sm:py-24 md:rounded-t-[60px] md:px-10 md:py-32"
    >
      <FadeIn y={40}>
        <h2
          className="mb-16 text-center font-display uppercase leading-none tracking-tight text-ink sm:mb-20 md:mb-28"
          style={{ fontSize: 'clamp(3rem, 12vw, 160px)' }}
        >
          Scoring
        </h2>
      </FadeIn>

      <div className="mx-auto max-w-5xl">
        {TIERS.map((tier, i) => (
          <FadeIn key={tier.name} delay={i * 0.1}>
            <div
              className="flex items-center gap-6 py-8 sm:gap-10 sm:py-10 md:gap-14 md:py-12"
              style={{ borderBottom: i < TIERS.length - 1 ? '1px solid rgba(5, 10, 20, 0.15)' : 'none' }}
            >
              <span
                className="w-[1.9em] flex-shrink-0 font-display leading-none text-ink"
                style={{ fontSize: 'clamp(3rem, 10vw, 140px)' }}
              >
                {tier.points}
              </span>
              <div className="flex flex-col gap-2">
                <h3
                  className="font-medium uppercase tracking-wide text-ink"
                  style={{ fontSize: 'clamp(1rem, 2.2vw, 2.1rem)' }}
                >
                  {tier.name}
                </h3>
                <p
                  className="max-w-2xl font-light leading-relaxed text-ink opacity-60"
                  style={{ fontSize: 'clamp(0.85rem, 1.6vw, 1.25rem)' }}
                >
                  {tier.desc}
                </p>
              </div>
            </div>
          </FadeIn>
        ))}

        <FadeIn delay={0.2}>
          <p className="pt-10 text-center text-sm font-light uppercase tracking-widest text-ink opacity-50 sm:text-base">
            Racing scores by podium picks · Tennis &amp; esports by series
          </p>
        </FadeIn>

        {/* Premium — organizer tools, paid via Stripe. Never a scoring advantage. */}
        <FadeIn delay={0.1}>
          <div className="mt-16 flex flex-col justify-between gap-8 rounded-[32px] bg-ink p-8 sm:mt-20 md:flex-row md:items-center md:p-12">
            <div className="max-w-xl">
              <h3
                className="mb-3 font-display uppercase tracking-wide text-frost"
                style={{ fontSize: 'clamp(1.4rem, 2.6vw, 2.2rem)' }}
              >
                Premium
              </h3>
              <p className="font-light leading-relaxed text-steel" style={{ fontSize: 'clamp(0.9rem, 1.4vw, 1.1rem)' }}>
                Unlocks league-organizer tools — bigger private leagues, community stats, and
                more. Scoring stays exactly the same for everyone: premium buys convenience,
                never an advantage.
              </p>
            </div>
            <div className="flex flex-col items-start gap-4 md:items-end">
              <div className="flex items-baseline gap-3">
                <span className="font-display text-frost" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.6rem)' }}>
                  €4.99<span className="text-base text-steel">/mo</span>
                </span>
                <span className="text-steel">·</span>
                <span className="font-display text-frost" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.6rem)' }}>
                  €49.99<span className="text-base text-steel">/yr</span>
                </span>
              </div>
              <span className="text-xs font-light uppercase tracking-widest text-steel">
                2 months free yearly · Secure checkout via Stripe · Cancel anytime
              </span>
              <a
                href="https://app.yourfriendleague.com/premium"
                className="mt-1 inline-block rounded-full border-2 border-frost px-8 py-3 text-sm font-medium uppercase tracking-widest text-frost transition-colors duration-200 hover:bg-frost/10"
              >
                Go premium
              </a>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
