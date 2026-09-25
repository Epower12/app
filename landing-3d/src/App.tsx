import Hero from './sections/Hero';
import Marquee from './sections/Marquee';
import Game from './sections/Game';
import Scoring from './sections/Scoring';
import Matchday from './sections/Matchday';
import Footer from './sections/Footer';

export default function App() {
  return (
    <main className="bg-ink" style={{ overflowX: 'clip' }}>
      <Hero />
      <Marquee />
      <Game />
      <Scoring />
      <Matchday />
      <Footer />
    </main>
  );
}
