import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { Meme } from '../lib/memes';
import { CartoonButton } from './ui/cartoon-button';

interface ResultPageProps {
  photos: string[];
  memes: Meme[];
  onRestart: () => void;
}

const CARD_W = 1080;
const CARD_H = 1920;

export function ResultPage({ photos, memes, onRestart }: ResultPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [compositeUrl, setCompositeUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = CARD_W;
    canvas.height = CARD_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const count = Math.min(memes.length, photos.length);
    const slotH = (CARD_H - 80) / count;
    const halfW = CARD_W / 2;

    const loadImage = (src: string): Promise<HTMLImageElement> =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });

    const c: CanvasRenderingContext2D = ctx;

    async function draw() {
      c.fillStyle = '#0a0a0a';
      c.fillRect(0, 0, CARD_W, CARD_H);

      c.strokeStyle = '#333';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(halfW, 0);
      c.lineTo(halfW, CARD_H - 80);
      c.stroke();

      for (let i = 0; i < count; i++) {
        const y = i * slotH;

        try {
          const memeImg = await loadImage(memes[i].imageUrl);
          c.save();
          c.beginPath();
          c.rect(0, y, halfW - 1, slotH);
          c.clip();
          const scale = Math.max(halfW / memeImg.width, slotH / memeImg.height);
          const dw = memeImg.width * scale;
          const dh = memeImg.height * scale;
          c.drawImage(memeImg, (halfW - dw) / 2, y + (slotH - dh) / 2, dw, dh);
          c.restore();
        } catch {
          c.fillStyle = '#1a1a1a';
          c.fillRect(0, y, halfW - 1, slotH);
        }

        try {
          const userImg = await loadImage(photos[i]);
          c.save();
          c.beginPath();
          c.rect(halfW + 1, y, halfW - 1, slotH);
          c.clip();
          const scale = Math.max((halfW - 1) / userImg.width, slotH / userImg.height);
          const dw = userImg.width * scale;
          const dh = userImg.height * scale;
          c.drawImage(userImg, halfW + 1 + ((halfW - 1) - dw) / 2, y + (slotH - dh) / 2, dw, dh);
          c.restore();
        } catch {
          c.fillStyle = '#111';
          c.fillRect(halfW + 1, y, halfW - 1, slotH);
        }

        if (i < count - 1) {
          c.strokeStyle = '#333';
          c.lineWidth = 2;
          c.beginPath();
          c.moveTo(0, y + slotH);
          c.lineTo(CARD_W, y + slotH);
          c.stroke();
        }
      }

      // Watermark bar
      c.fillStyle = '#0a0a0a';
      c.fillRect(0, CARD_H - 80, CARD_W, 80);
      c.fillStyle = '#444';
      c.font = '32px Impact, "Arial Narrow Bold", sans-serif';
      c.textAlign = 'center';
      c.fillText('MEMEBOOTH BY @NATASHANARIINE', CARD_W / 2, CARD_H - 26);

      setCompositeUrl(canvas!.toDataURL('image/jpeg', 0.92));
    }

    draw();
  }, [memes, photos]);

  const handleDownload = () => {
    if (!compositeUrl) return;
    setDownloading(true);
    const a = document.createElement('a');
    a.href = compositeUrl;
    a.download = 'memebooth.jpg';
    a.click();
    setTimeout(() => setDownloading(false), 1000);
  };

  return (
    <motion.div
      className="min-h-screen flex flex-col items-center py-8 px-4"
      style={{ background: '#0a0a0a', fontFamily: "'Space Grotesk', sans-serif" }}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h1
        className="text-white mb-2 uppercase"
        style={{
          fontFamily: 'Impact, "Arial Narrow Bold", sans-serif',
          fontSize: 'clamp(1.5rem, 5vw, 2.5rem)',
          letterSpacing: '0.05em',
        }}
      >
        AW SO CUTE!
      </h1>
      <p
        className="text-gray-500 text-sm uppercase tracking-widest mb-8"
        style={{ fontFamily: 'Impact, "Arial Narrow Bold", sans-serif' }}
      >
        DON'T FORGET TO POST IT ON YOUR STORY
      </p>

      <canvas ref={canvasRef} className="hidden" />

      <motion.div
        className="relative rounded-2xl overflow-hidden mb-8"
        style={{
          width: 'min(320px, calc(100vw - 32px))',
          aspectRatio: '9 / 16',
          border: '1px solid #222',
          background: '#111',
        }}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        {compositeUrl ? (
          <img src={compositeUrl} alt="Meme booth strip" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-white border-t-transparent animate-spin" />
          </div>
        )}
      </motion.div>

      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        <CartoonButton
          label={downloading ? 'downloading...' : '↓ download'}
          color="bg-white"
          disabled={!compositeUrl || downloading}
          onClick={handleDownload}
        />
        <CartoonButton
          label="↺ start over"
          color="bg-zinc-300"
          onClick={onRestart}
        />
      </div>
    </motion.div>
  );
}
