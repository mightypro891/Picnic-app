import { useRef, useState } from 'react';

const WIDTH = 1080;
const HEIGHT = 1350;

const DEFAULTS = {
  eyebrow: "YOU'RE INVITED",
  headline: 'ANB PICNIC',
  year: '2026',
  tagline: 'One long green afternoon',
  detailsHeading: 'DATE · TIME · VENUE',
  detailsComingSoon: true,
  detailsValue: 'Coming Soon',
  detailsNote: 'Watch this space for the official announcement',
  footerLine1: 'Registration opens soon',
  footerLine2: 'Join the ANB picnic group for more updates',
};

export default function PromoGraphic() {
  const svgRef = useRef(null);
  const [fields, setFields] = useState(DEFAULTS);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  function update(key, value) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  function toggleComingSoon(comingSoon) {
    setFields((f) => ({
      ...f,
      detailsComingSoon: comingSoon,
      detailsValue: comingSoon ? 'Coming Soon' : f.detailsValue === 'Coming Soon' ? '' : f.detailsValue,
      detailsNote: comingSoon ? 'Watch this space for the official announcement' : f.detailsNote,
    }));
  }

  function resetToDefaults() {
    setFields(DEFAULTS);
  }

  async function downloadPng() {
    setError('');
    setDownloading(true);
    try {
      const svgEl = svgRef.current;
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgEl);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      const loaded = new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      img.src = url;
      await loaded;

      const canvas = document.createElement('canvas');
      const scale = 2; // export at 2x for a crisp, share-ready image
      canvas.width = WIDTH * scale;
      canvas.height = HEIGHT * scale;
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, WIDTH, HEIGHT);
      URL.revokeObjectURL(url);

      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = 'anb-picnic-2026-promo.png';
      a.click();
    } catch (err) {
      console.error(err);
      setError('Could not generate the download. You can also right-click the graphic and "Save image as".');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.6rem', marginBottom: 4 }}>Flyer</h1>
      <p style={{ marginBottom: 20, maxWidth: 520 }}>
        Edit the text below, then download a fresh, ready-to-post PNG — no code changes or redeploy needed.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 380px) 1fr', gap: 24, alignItems: 'start' }}>
        <form className="card" style={{ padding: 20 }} onSubmit={(e) => e.preventDefault()}>
          <h2 style={{ fontSize: '1rem', marginBottom: 14 }}>Edit text</h2>

          <div className="field">
            <label htmlFor="tagline">Tagline</label>
            <input id="tagline" className="input" value={fields.tagline} onChange={(e) => update('tagline', e.target.value)} />
          </div>

          <div className="field" style={{ marginTop: 14 }}>
            <label>
              <input
                type="checkbox"
                checked={fields.detailsComingSoon}
                onChange={(e) => toggleComingSoon(e.target.checked)}
                style={{ marginRight: 8 }}
              />
              Date / time / venue not announced yet
            </label>
          </div>

          {!fields.detailsComingSoon && (
            <div className="field" style={{ marginTop: 10 }}>
              <label htmlFor="detailsValue">Date, time & venue</label>
              <input
                id="detailsValue"
                className="input"
                placeholder="e.g. Sat, Sept 12 · 10am–6pm · Faculty Green"
                value={fields.detailsValue}
                onChange={(e) => update('detailsValue', e.target.value)}
              />
            </div>
          )}

          <div className="field" style={{ marginTop: 10 }}>
            <label htmlFor="detailsNote">Details note (small line under the details)</label>
            <input id="detailsNote" className="input" value={fields.detailsNote} onChange={(e) => update('detailsNote', e.target.value)} />
          </div>

          <div className="field" style={{ marginTop: 14 }}>
            <label htmlFor="footerLine1">Footer line 1</label>
            <input id="footerLine1" className="input" value={fields.footerLine1} onChange={(e) => update('footerLine1', e.target.value)} />
          </div>

          <div className="field" style={{ marginTop: 10 }}>
            <label htmlFor="footerLine2">Footer line 2</label>
            <input id="footerLine2" className="input" value={fields.footerLine2} onChange={(e) => update('footerLine2', e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button type="button" className="btn btn-primary" onClick={downloadPng} disabled={downloading}>
              {downloading ? 'Preparing…' : 'Download PNG'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={resetToDefaults}>
              Reset
            </button>
          </div>
          {error && <p className="error" style={{ marginTop: 12 }}>{error}</p>}
        </form>

        <div className="card" style={{ padding: 20, maxWidth: 420 }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            width="100%"
            xmlns="http://www.w3.org/2000/svg"
            style={{ borderRadius: 16, display: 'block' }}
          >
            <defs>
              <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#144D36" />
                <stop offset="100%" stopColor="#1F6F4E" />
              </linearGradient>
              <radialGradient id="glow" cx="50%" cy="0%" r="80%">
                <stop offset="0%" stopColor="#2f8f6b" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#2f8f6b" stopOpacity="0" />
              </radialGradient>
            </defs>

            <rect width={WIDTH} height={HEIGHT} fill="url(#bgGrad)" />
            <rect width={WIDTH} height={HEIGHT} fill="url(#glow)" />

            <circle cx="120" cy="180" r="150" fill="#E8A93D" opacity="0.12" />
            <circle cx="960" cy="1100" r="220" fill="#E8A93D" opacity="0.1" />
            <circle cx="920" cy="220" r="70" fill="#FBEBCE" opacity="0.1" />

            <text x="540" y="230" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="34"
                  letterSpacing="8" fill="#FBEBCE" opacity="0.9">
              {fields.eyebrow}
            </text>

            <text x="540" y="360" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="98"
                  fontWeight="700" fill="#FFFFFF">
              {fields.headline}
            </text>
            <text x="540" y="450" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="64"
                  fontWeight="700" fill="#E8A93D">
              {fields.year}
            </text>

            <text x="540" y="600" textAnchor="middle" fontSize="140">🧺</text>

            <text x="540" y="700" textAnchor="middle" fontFamily="Georgia, serif" fontSize="36" fill="#FBEBCE">
              {fields.tagline}
            </text>

            <rect x="120" y="800" width="840" height="300" rx="28" fill="#FFFFFF" opacity="0.08" />
            <rect x="120" y="800" width="840" height="300" rx="28" fill="none" stroke="#FBEBCE" strokeOpacity="0.35" strokeWidth="2" />

            <text x="540" y="880" textAnchor="middle" fontFamily="Georgia, serif" fontSize="30" letterSpacing="4" fill="#E8A93D">
              {fields.detailsHeading}
            </text>
            <text x="540" y="960" textAnchor="middle" fontFamily="Georgia, serif" fontSize="44" fontWeight="700" fill="#FFFFFF">
              {fields.detailsValue}
            </text>
            <text x="540" y="1030" textAnchor="middle" fontFamily="Georgia, serif" fontSize="26" fill="#EAF3EC" opacity="0.85">
              {fields.detailsNote}
            </text>

            <text x="540" y="1170" textAnchor="middle" fontFamily="Georgia, serif" fontSize="30" fontWeight="700" fill="#FFFFFF">
              {fields.footerLine1}
            </text>
            <text x="540" y="1230" textAnchor="middle" fontFamily="Georgia, serif" fontSize="22" fill="#EAF3EC" opacity="0.75">
              {fields.footerLine2}
            </text>

            <line x1="440" y1="1280" x2="640" y2="1280" stroke="#E8A93D" strokeWidth="2" opacity="0.6" />
          </svg>
        </div>
      </div>
    </div>
  );
}
