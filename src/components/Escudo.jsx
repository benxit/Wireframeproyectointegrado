/** Escudo y marca de La Serena (versión vectorial simple, reemplazable por el logo oficial). */
export function Escudo() {
  return (
    <svg viewBox="0 0 64 78" aria-hidden="true">
      <path d="M3 3h58v36c0 18-14 30-29 36C17 69 3 57 3 39z" fill="#b30d1e" />
      <path d="M9 9h46v30c0 13-10 23-23 28C19 62 9 52 9 39z" fill="none" stroke="#fff" strokeWidth="2" />
      <path d="M20 44V28h4v-4h3v4h4v-6h2v6h4v-4h3v4h4v16z" fill="#fff" />
      <rect x="29" y="35" width="6" height="9" rx="3" fill="#b30d1e" />
      <path d="M32 12l1.8 3.6 4 .6-2.9 2.8.7 4L32 21l-3.6 1.9.7-4-2.9-2.8 4-.6z" fill="#fff" />
      <path d="M32 50l1.5 3 3.3.5-2.4 2.3.6 3.3-3-1.6-3 1.6.6-3.3-2.4-2.3 3.3-.5z" fill="#fff" />
    </svg>
  );
}

export function Marca() {
  return (
    <div className="lg-logo">
      <Escudo />
      <div>
        <b>La Serena</b>
        <span>Ilustre Municipalidad</span>
      </div>
    </div>
  );
}
