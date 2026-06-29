/** VitalAir mission — Lahore air + health + safer routes (inline SVG). */
export default function VitalAirPurposeIllustration({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 400 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="VitalAir helps Lahore residents check air quality, get health guidance, and choose safer routes"
    >
      <defs>
        <linearGradient id="va-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0d1117" />
          <stop offset="100%" stopColor="#161b22" />
        </linearGradient>
        <linearGradient id="va-smog" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#00c896" stopOpacity="0.15" />
          <stop offset="50%" stopColor="#ffa500" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ff4545" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      <rect width="400" height="320" rx="16" fill="url(#va-sky)" />
      <rect y="180" width="400" height="140" fill="#0d1117" />
      {/* Smog band */}
      <ellipse cx="200" cy="120" rx="180" ry="50" fill="url(#va-smog)" />
      {/* Lahore skyline */}
      <rect x="40" y="155" width="28" height="65" rx="2" fill="#30363d" />
      <rect x="75" y="130" width="35" height="90" rx="2" fill="#3d444d" />
      <rect x="120" y="145" width="22" height="75" rx="2" fill="#30363d" />
      <rect x="155" y="110" width="40" height="110" rx="2" fill="#484f58" />
      <polygon points="175,110 195,85 215,110" fill="#484f58" />
      <rect x="210" y="140" width="30" height="80" rx="2" fill="#30363d" />
      <rect x="255" y="125" width="38" height="95" rx="2" fill="#3d444d" />
      <rect x="305" y="150" width="25" height="70" rx="2" fill="#30363d" />
      <rect x="340" y="135" width="32" height="85" rx="2" fill="#484f58" />
      {/* Minar-e-Pakistan hint */}
      <rect x="188" y="95" width="14" height="85" rx="1" fill="#00c896" opacity="0.7" />
      <ellipse cx="195" cy="92" rx="12" ry="6" fill="#00c896" opacity="0.5" />
      {/* AQI gauge */}
      <circle cx="320" cy="55" r="38" stroke="#30363d" strokeWidth="6" fill="#161b22" />
      <path
        d="M 320 55 L 320 25 A 30 30 0 0 1 345 45 Z"
        fill="#ffa500"
        opacity="0.9"
      />
      <text x="320" y="60" textAnchor="middle" fill="#e6edf3" fontSize="18" fontWeight="bold">
        124
      </text>
      <text x="320" y="78" textAnchor="middle" fill="#8b949e" fontSize="9">
        AQI
      </text>
      {/* Person with mask */}
      <circle cx="95" cy="215" r="14" fill="#e6edf3" />
      <rect x="78" y="228" width="34" height="8" rx="4" fill="#00c896" opacity="0.8" />
      <path d="M 95 228 Q 95 238 85 245" stroke="#e6edf3" strokeWidth="3" fill="none" />
      <path d="M 95 228 Q 95 238 105 245" stroke="#e6edf3" strokeWidth="3" fill="none" />
      <rect x="82" y="245" width="26" height="35" rx="6" fill="#00c896" opacity="0.35" />
      {/* Route lines */}
      <path
        d="M 140 260 Q 200 230 260 260"
        stroke="#00c896"
        strokeWidth="3"
        strokeDasharray="6 4"
        fill="none"
      />
      <path
        d="M 140 275 Q 200 250 260 275"
        stroke="#ff4545"
        strokeWidth="2"
        opacity="0.5"
        fill="none"
      />
      <circle cx="140" cy="260" r="5" fill="#00c896" />
      <circle cx="260" cy="260" r="5" fill="#00c896" />
      {/* Food / health icons */}
      <circle cx="330" cy="220" r="22" fill="#161b22" stroke="#30363d" strokeWidth="2" />
      <text x="330" y="226" textAnchor="middle" fontSize="20">
        🍊
      </text>
      <circle cx="330" cy="270" r="22" fill="#161b22" stroke="#30363d" strokeWidth="2" />
      <text x="330" y="276" textAnchor="middle" fontSize="20">
        🫁
      </text>
      <text x="200" y="305" textAnchor="middle" fill="#8b949e" fontSize="11">
        Lahore · Live AQI · Health · Safer routes
      </text>
    </svg>
  );
}
