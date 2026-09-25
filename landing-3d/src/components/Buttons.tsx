import type { ReactNode } from 'react';

/** Primary pill — YFL brand gradient (cyan → indigo → ember) with inner glow. */
export function GradientButton({
  children,
  href,
}: {
  children: ReactNode;
  href: string;
}) {
  return (
    <a
      href={href}
      className="inline-block rounded-full px-8 py-3 text-xs font-medium uppercase tracking-widest text-white transition-transform duration-200 hover:scale-[1.04] sm:px-10 sm:py-3.5 sm:text-sm md:px-12 md:py-4 md:text-base"
      style={{
        background:
          'linear-gradient(123deg, #041322 5%, #0ea5e9 38%, #6366f1 70%, #f97316 100%)',
        boxShadow:
          '0px 4px 4px rgba(56, 189, 248, 0.25), 4px 4px 12px rgba(99, 102, 241, 0.8) inset',
        outline: '2px solid rgba(241, 245, 249, 0.9)',
        outlineOffset: '-3px',
      }}
    >
      {children}
    </a>
  );
}

/** Ghost pill — frost outline. */
export function GhostButton({
  children,
  href,
}: {
  children: ReactNode;
  href: string;
}) {
  return (
    <a
      href={href}
      className="inline-block rounded-full border-2 border-frost px-8 py-3 text-sm font-medium uppercase tracking-widest text-frost transition-colors duration-200 hover:bg-frost/10 sm:px-10 sm:py-3.5 sm:text-base"
    >
      {children}
    </a>
  );
}
