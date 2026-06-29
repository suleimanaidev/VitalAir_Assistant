/** Health + lungs + Lahore context for dashboard empty states. */
export default function HealthGuidanceIllustration({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 280 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-hidden
    >
      <rect width="280" height="160" rx="12" fill="#161b22" />
      <ellipse cx="140" cy="55" rx="90" ry="35" fill="#ffa500" opacity="0.12" />
      {/* Lungs */}
      <path
        d="M 115 70 Q 100 90 105 115 Q 115 125 125 115 Q 130 95 125 75 Q 120 65 115 70 Z"
        fill="#00c896"
        opacity="0.35"
        stroke="#00c896"
        strokeWidth="1.5"
      />
      <path
        d="M 165 70 Q 180 90 175 115 Q 165 125 155 115 Q 150 95 155 75 Q 160 65 165 70 Z"
        fill="#00c896"
        opacity="0.35"
        stroke="#00c896"
        strokeWidth="1.5"
      />
      <rect x="133" y="68" width="14" height="45" rx="3" fill="#484f58" />
      {/* Mask */}
      <rect x="108" y="88" width="64" height="14" rx="7" fill="#00c896" opacity="0.6" />
      {/* AQI badge */}
      <rect x="195" y="24" width="58" height="32" rx="8" fill="#0d1117" stroke="#ffa500" strokeWidth="1.5" />
      <text x="224" y="45" textAnchor="middle" fill="#ffa500" fontSize="14" fontWeight="bold">
        AQI
      </text>
      {/* Punjab foods row */}
      <text x="45" y="140" fontSize="22">
        🍊
      </text>
      <text x="85" y="140" fontSize="22">
        🥛
      </text>
      <text x="125" y="140" fontSize="22">
        🍉
      </text>
      <text x="165" y="140" fontSize="22">
        😷
      </text>
      <text x="205" y="140" fontSize="22">
        🚗
      </text>
      <text x="140" y="28" textAnchor="middle" fill="#8b949e" fontSize="10">
        Aap ki sehat · Lahore hawa
      </text>
    </svg>
  );
}
