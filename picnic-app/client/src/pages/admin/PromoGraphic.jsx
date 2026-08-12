import { useRef, useState } from 'react';

const WIDTH = 1080;
const HEIGHT = 1350;

export default function PromoGraphic() {
  const svgRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

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
      <h1 style={{ fontSize: '1.6rem', marginBottom: 4 }}>Promo Graphic</h1>
      <p style={{ marginBottom: 20, maxWidth: 520 }}>
        Ready to post on WhatsApp status, Instagram, or group chats right now. Date, time, and venue are
        intentionally shown as "Coming Soon" until those details are ready to announce — once they're
        locked in, this can be updated to show them.
      </p>

      <div className="card" style={{ padding: 20, maxWidth: 420, marginBottom: 20 }}>
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

          {/* Decorative blobs */}
          <circle cx="120" cy="180" r="150" fill="#E8A93D" opacity="0.12" />
          <circle cx="960" cy="1100" r="220" fill="#E8A93D" opacity="0.1" />
          <circle cx="920" cy="220" r="70" fill="#FBEBCE" opacity="0.1" />

          {/* Top eyebrow */}
          <text x="540" y="230" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="34"
                letterSpacing="8" fill="#FBEBCE" opacity="0.9">
            YOU'RE INVITED
          </text>

          {/* Headline */}
          <text x="540" y="360" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="98"
                fontWeight="700" fill="#FFFFFF">
            ANB PICNIC
          </text>
          <text x="540" y="450" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="64"
                fontWeight="700" fill="#E8A93D">
            2026
          </text>

          {/* Basket icon */}
          <text x="540" y="600" textAnchor="middle" fontSize="140">🧺</text>

          {/* Tagline */}
          <text x="540" y="700" textAnchor="middle" fontFamily="Georgia, serif" fontSize="36" fill="#FBEBCE">
            One long green afternoon
          </text>

          {/* Details card */}
          <rect x="120" y="800" width="840" height="300" rx="28" fill="#FFFFFF" opacity="0.08" />
          <rect x="120" y="800" width="840" height="300" rx="28" fill="none" stroke="#FBEBCE" strokeOpacity="0.35" strokeWidth="2" />

          <text x="540" y="880" textAnchor="middle" fontFamily="Georgia, serif" fontSize="30" letterSpacing="4" fill="#E8A93D">
            DATE · TIME · VENUE
          </text>
          <text x="540" y="960" textAnchor="middle" fontFamily="Georgia, serif" fontSize="52" fontWeight="700" fill="#FFFFFF">
            Coming Soon
          </text>
          <text x="540" y="1030" textAnchor="middle" fontFamily="Georgia, serif" fontSize="26" fill="#EAF3EC" opacity="0.85">
            Watch this space for the official announcement
          </text>

          {/* Footer */}
          <text x="540" y="1170" textAnchor="middle" fontFamily="Georgia, serif" fontSize="30" fontWeight="700" fill="#FFFFFF">
            Registration opens soon
          </text>
          <text x="540" y="1230" textAnchor="middle" fontFamily="Georgia, serif" fontSize="22" fill="#EAF3EC" opacity="0.75">
            Follow the ANB page for updates
          </text>

          <line x1="440" y1="1280" x2="640" y2="1280" stroke="#E8A93D" strokeWidth="2" opacity="0.6" />
        </svg>
      </div>

      <button className="btn btn-primary" onClick={downloadPng} disabled={downloading}>
        {downloading ? 'Preparing…' : 'Download PNG'}
      </button>
      {error && <p className="error" style={{ marginTop: 12 }}>{error}</p>}
    </div>
  );
}
