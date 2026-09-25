import type { VisitorRegion } from '../region';

/** Bright orange sports band that scrolls on a CSS loop. */
export default function Ticker({ region }: { region: VisitorRegion }) {
    // Regional copy: US visitors see "Soccer", everyone else "Football".
    const items = [region === 'us' ? 'Soccer' : 'Football', 'Predict', 'Ice hockey', 'Compete', 'Basketball', 'Climb the table', 'Formula 1', 'Brag', 'Tennis'];
    const row = [...items, ...items];
    return (
        <div className="ld-ticker" aria-hidden="true">
            <div className="ld-ticker-track">
                {row.map((item, i) => (
                    <span key={i}>{item}<i>★</i></span>
                ))}
            </div>
        </div>
    );
}
