/** Faro de La Serena (original, vectorial): torre a franjas rojas, linterna y haz de luz animado. */
export default function FaroMini({ className = '', animado = true, tam = 64 }) {
  return (
    <svg className={`faro-mini ${animado ? 'on' : ''} ${className}`} width={tam} height={tam * 1.5} viewBox="0 0 64 96" aria-hidden="true">
      <defs>
        <linearGradient id="fmHaz" x1="0" x2="1"><stop offset="0" stopColor="#ffe9a3" stopOpacity=".95" /><stop offset="1" stopColor="#ffe9a3" stopOpacity="0" /></linearGradient>
      </defs>
      <g className="fm-haz"><path d="M32 25L-60 6V44Z" fill="url(#fmHaz)" /><path d="M32 25L124 6V44Z" fill="url(#fmHaz)" /></g>
      <path d="M22 90L26 34H38L42 90Z" fill="#fff" />
      <path d="M24.4 60H39.6L40.6 72H23.4ZM22.8 80H41.2L42 90H22Z M25.2 44H38.8L39.4 50H24.6Z" fill="#c4182c" />
      <rect x="23" y="30" width="18" height="5" rx="1.5" fill="#3a1424" />
      <rect x="26" y="19" width="12" height="11" rx="2" fill="#ffd966" className="fm-luz" />
      <path d="M24 19L32 9L40 19Z" fill="#c4182c" />
      <circle cx="32" cy="7" r="1.8" fill="#3a1424" />
      <path className="fm-ola" d="M2 92Q10 88 18 92T34 92T50 92T66 92V96H2Z" fill="currentColor" opacity=".55" />
    </svg>
  );
}
