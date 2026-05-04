import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ALL_MEMES, type Meme } from '../lib/memes';
import { CartoonButton } from './ui/cartoon-button';

const TOTAL = ALL_MEMES.length;
const PICK = Math.min(4, TOTAL);

interface MemeSelectionProps {
  onConfirm: (selected: Meme[]) => void;
  onBack: () => void;
}

const IMPACT: React.CSSProperties = {
  fontFamily: 'Impact, "Arial Narrow Bold", sans-serif',
};

export function MemeSelection({ onConfirm, onBack }: MemeSelectionProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < PICK) {
        next.add(id);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    if (selected.size !== PICK) return;
    const chosen = ALL_MEMES.filter(m => selected.has(m.id));
    onConfirm(chosen);
  };

  return (
    <motion.div
      className="min-h-screen w-full flex flex-col"
      style={{ background: '#0a0a0a' }}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -40 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-8 pb-4">
        <CartoonButton label="← back" color="bg-zinc-200" onClick={onBack} />
        <div className="text-center">
          <h1
            className="tracking-tight leading-none text-white"
            style={{ ...IMPACT, fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}
          >
            choose your memes
          </h1>
          <p className="text-sm tracking-widest uppercase mt-1" style={{ ...IMPACT, color: '#555' }}>
            pick exactly {PICK}
          </p>
        </div>
        <div
          className="text-lg tabular-nums"
          style={{ ...IMPACT, color: selected.size === PICK ? '#00ff88' : '#555', minWidth: '4ch', textAlign: 'right' }}
        >
          {selected.size} / {PICK}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-32">
        <div
          className="grid gap-4 mx-auto"
          style={{
            gridTemplateColumns: 'repeat(5, 1fr)',
            maxWidth: 1400,
          }}
        >
          {ALL_MEMES.map(meme => {
            const isSelected = selected.has(meme.id);
            const isDisabled = !isSelected && selected.size === PICK;
            return (
              <motion.button
                key={meme.id}
                onClick={() => toggle(meme.id)}
                disabled={isDisabled}
                className="relative rounded-2xl overflow-hidden text-left focus:outline-none"
                style={{
                  aspectRatio: '1 / 1',
                  border: `2px solid ${isSelected ? '#00ff88' : '#222'}`,
                  boxShadow: isSelected ? '0 0 20px #00ff8855' : 'none',
                  opacity: isDisabled ? 0.3 : 1,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  transition: 'border-color 0.2s, box-shadow 0.2s, opacity 0.2s',
                }}
                whileHover={isDisabled ? {} : { scale: 1.03 }}
                whileTap={isDisabled ? {} : { scale: 0.97 }}
              >
                {/* Always square, cover-fit image */}
                <img
                  src={meme.imageUrl}
                  alt={meme.name}
                  className="absolute inset-0 w-full h-full"
                  style={{ objectFit: 'cover', objectPosition: 'center top' }}
                />
                {/* Gradient overlay */}
                <div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)' }}
                />
                {/* Labels */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <div className="text-white leading-tight" style={{ ...IMPACT, fontSize: '1rem' }}>
                    {meme.name}
                  </div>
                  <div className="text-xs mt-0.5 leading-tight" style={{ color: '#aaa', fontFamily: "'Space Grotesk', sans-serif" }}>
                    {meme.pose}
                  </div>
                </div>
                {/* Checkmark */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-black text-sm font-black"
                      style={{ background: '#00ff88' }}
                    >
                      ✓
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Bottom CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 flex justify-center pb-8 pt-6"
        style={{ background: 'linear-gradient(to top, #0a0a0a 70%, transparent)' }}
      >
        <CartoonButton
          label="let's go →"
          color="bg-emerald-400"
          disabled={selected.size !== PICK}
          onClick={handleConfirm}
        />
      </div>
    </motion.div>
  );
}
