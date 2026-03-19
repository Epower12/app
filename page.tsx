'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import LandingPage from './landing/page';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    if (session) {
      if ((session.user as any).role === 'premium' || (session.user as any).role === 'admin') {
        router.push('/premium');
      } else {
        router.push('/tournaments');
      }
    }
    // If no session, we stay here and show the landing page
  }, [session, status, router]);

  // Show loading spinner while session is being determined
  if (status === 'loading') {
    return (
      <div className="container" style={{ paddingTop: '4rem', textAlign: 'center' }}>
        <div className="loading" style={{ height: '200px', borderRadius: 'var(--radius-lg)' }}></div>
      </div>
    );
  }

  // Unauthenticated → show landing page
  if (!session) {
    return <LandingPage />;
  }

  // Authenticated users will be redirected, show blank while redirect happens
  return (
    <div className="container" style={{ paddingTop: '4rem', textAlign: 'center' }}>
      <div className="loading" style={{ height: '200px', borderRadius: 'var(--radius-lg)' }}></div>
    </div>
  );
}
