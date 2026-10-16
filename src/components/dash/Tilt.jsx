import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

export const ITEM = {
  oculto: { opacity: 0, y: 34, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 110, damping: 15 } },
};
export const GRUPO = { oculto: {}, visible: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } } };

/** Tarjeta que se inclina en 3D siguiendo el mouse y brilla al pasar. */
export default function Tilt({ children, className = '', max = 7, ...resto }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rx = useSpring(useTransform(y, [-0.5, 0.5], [max, -max]), { stiffness: 180, damping: 18 });
  const ry = useSpring(useTransform(x, [-0.5, 0.5], [-max, max]), { stiffness: 180, damping: 18 });
  const brillo = useTransform([x, y], ([a, b]) => `radial-gradient(260px circle at ${(a + 0.5) * 100}% ${(b + 0.5) * 100}%, rgba(255,255,255,.55), transparent 60%)`);
  function mover(e) {
    const r = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - r.left) / r.width - 0.5);
    y.set((e.clientY - r.top) / r.height - 0.5);
  }
  function salir() { x.set(0); y.set(0); }
  return (
    <motion.div variants={ITEM} className={`card-d ${className}`} style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      whileHover={{ y: -6, boxShadow: '0 24px 44px rgba(120,6,20,.22)' }} onMouseMove={mover} onMouseLeave={salir} {...resto}>
      <motion.span className="brillo" style={{ background: brillo }} />
      {children}
    </motion.div>
  );
}
