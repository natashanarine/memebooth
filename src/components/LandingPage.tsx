import { useRef } from 'react';
import { motion } from 'framer-motion';
import { ImageTrail } from './ui/image-trail';
import { TRAIL_IMAGES } from '../lib/memes';

interface LandingPageProps {
  onStart: () => void;
}

export function LandingPage({ onStart }: LandingPageProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      className="relative w-full min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ background: '#0a0a0a' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -40 }}
      transition={{ duration: 0.5 }}
    >
      {/* Full-screen trail canvas */}
      <div ref={containerRef} className="absolute inset-0 z-0">
        <ImageTrail containerRef={containerRef} interval={90} rotationRange={20}>
          {TRAIL_IMAGES.map((url, i) => (
            <div key={i} className="overflow-hidden rounded-xl" style={{ width: 110, height: 110 }}>
              <img
                src={url}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                draggable={false}
              />
            </div>
          ))}
        </ImageTrail>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 select-none pointer-events-none px-4 text-center">
        <motion.h1
          className="leading-none"
          style={{
            fontFamily: 'Impact, "Arial Narrow Bold", sans-serif',
            fontSize: 'clamp(4rem, 13vw, 10rem)',
            color: '#ffffff',
            WebkitTextStroke: '5px #000000',
          }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          MEME BOOTH
        </motion.h1>

        <motion.button
          className="pointer-events-auto px-12 py-4 rounded-full text-xl uppercase tracking-widest"
          style={{
            fontFamily: 'Impact, "Arial Narrow Bold", sans-serif',
            background: '#ffffff',
            color: '#000000',
            letterSpacing: '0.2em',
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          onClick={onStart}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.97 }}
        >
          START
        </motion.button>
      </div>

      <div
        className="absolute bottom-6 left-6 text-xs uppercase tracking-widest z-10"
        style={{ color: '#333', fontFamily: 'Impact, sans-serif' }}
      >
        move your mouse
      </div>
      <div
        className="absolute bottom-6 right-6 text-xs uppercase tracking-widest z-10"
        style={{ color: '#333', fontFamily: 'Impact, sans-serif' }}
      >
        2026
      </div>
    </motion.div>
  );
}
