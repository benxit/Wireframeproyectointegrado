import { motion } from 'framer-motion';

const ESTRELLAS = [[30, 24], [70, 52], [120, 18], [168, 44], [250, 30], [214, 70], [48, 96], [96, 70]];

/** Escena original del Faro Monumental al atardecer: haz giratorio, olas y estrellas titilando. */
export default function Faro() {
  return (
    <div className="faro-escena" aria-hidden="true">
      <svg viewBox="0 0 288 290" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2c1740" /><stop offset=".5" stopColor="#a8344f" /><stop offset=".82" stopColor="#f08a55" /><stop offset="1" stopColor="#ffc277" />
          </linearGradient>
        </defs>
        <rect width="288" height="290" fill="url(#cielo)" />
        {ESTRELLAS.map(([x, y], i) => (
          <motion.circle key={i} cx={x} cy={y} r="1.4" fill="#fff" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 2 + (i % 4) * 0.6, repeat: Infinity, delay: i * 0.3 }} />
        ))}
        <motion.circle cx="70" cy="214" r="26" fill="#ffd27a" animate={{ r: [26, 28, 26], opacity: [0.9, 1, 0.9] }} transition={{ duration: 5, repeat: Infinity }} />
        <motion.path d="M0 232 Q36 226 72 232 T144 232 T216 232 T288 232 V290 H0Z" fill="#7b2a45" animate={{ x: [0, -36, 0] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.path d="M-36 244 Q0 238 36 244 T108 244 T180 244 T252 244 T324 244 V290 H-36Z" fill="#4d1b38" animate={{ x: [0, 36, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} />
        <path d="M0 256 Q60 240 120 254 T240 250 T288 256 V290 H0Z" fill="#240d18" />
        <path d="M184 250 L192 120 L208 120 L216 250Z" fill="#fff" />
        <path d="M189.9 150 H210.1 L211.5 170 H188.5Z M186.7 195 H213.3 L214.7 215 H185.3Z" fill="#c4182c" />
        <rect x="186" y="114" width="28" height="6" fill="#3a1424" />
        <rect x="194" y="100" width="12" height="14" fill="#ffe08a" />
        <path d="M192 100 L200 88 L208 100Z" fill="#c4182c" />
      </svg>
      <div className="faro-haz" />
    </div>
  );
}
