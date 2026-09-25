const ITEMS = ['Football', 'Predict', 'Ice hockey', 'Compete', 'Basketball', 'Climb the table', 'Formula 1', 'Brag', 'Tennis'];

/** Bright orange sports band that scrolls on a CSS loop. */
export default function Ticker() {
    const row = [...ITEMS, ...ITEMS];
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
