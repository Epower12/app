'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/login');
    } else if ((session.user as any).role === 'premium' || (session.user as any).role === 'admin') {
      router.push('/premium');
    } else {
      router.push('/tournaments');
    }
  }, [session, status, router]);

  return (
    <div className="container" style={{ paddingTop: '4rem', textAlign: 'center' }}>
      <div className="loading" style={{ height: '200px', borderRadius: 'var(--radius-lg)' }}></div>
    </div>
  );
}
