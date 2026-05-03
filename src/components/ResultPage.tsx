import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';
import type { Meme } from '../lib/memes';

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
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [qrError, setQrError] = useState(false);
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

    // Assign to non-null local so TS is satisfied inside async closure
    const c: CanvasRenderingContext2D = ctx;

    async function draw() {
      // Background
      c.fillStyle = '#0a0a0a';
      c.fillRect(0, 0, CARD_W, CARD_H);

      // Vertical divider
      c.strokeStyle = '#333';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(halfW, 0);
      c.lineTo(halfW, CARD_H - 80);
      c.stroke();

      for (let i = 0; i < count; i++) {
        const y = i * slotH;

        // Left: meme reference
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

        // Right: user photo
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

        // Horizontal slot divider
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
      c.font = 'bold 28px "Space Grotesk", sans-serif';
      c.textAlign = 'center';
      c.fillText('MEME BOOTH', CARD_W / 2, CARD_H - 26);

      setCompositeUrl(canvas!.toDataURL('image/jpeg', 0.92));
    }

    draw();
  }, [memes, photos]);

  const handleDownload = () => {
    if (!compositeUrl) return;
    setDownloading(true);
    const a = document.createElement('a');
    a.href = compositeUrl;
    a.download = 'meme-booth.jpg';
    a.click();
    setTimeout(() => setDownloading(false), 1000);
  };

  const handleQr = () => {
    if (!compositeUrl) return;
    if (compositeUrl.length > 2800) {
      setQrError(true);
      setShowQr(true);
    } else {
      setQrValue(compositeUrl);
      setQrError(false);
      setShowQr(true);
    }
  };

  const handleCopy = async () => {
    if (!compositeUrl) return;
    try { await navigator.clipboard.writeText(compositeUrl); } catch { /* ignore */ }
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
        className="font-black tracking-tight text-white mb-2"
        style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)' }}
      >
        your meme booth
      </h1>
      <p className="text-gray-500 text-sm uppercase tracking-widest mb-8">4 poses. 1 strip.</p>

      {/* Hidden canvas for composition */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Preview card — display-only, aspect ratio 9:16 */}
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

      {/* Buttons */}
      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        <motion.button
          onClick={handleDownload}
          disabled={!compositeUrl || downloading}
          className="w-full py-4 rounded-full font-black text-sm uppercase tracking-widest"
          style={{
            background: compositeUrl ? '#ffffff' : '#222',
            color: compositeUrl ? '#000' : '#555',
            cursor: compositeUrl ? 'pointer' : 'not-allowed',
          }}
          whileHover={compositeUrl ? { scale: 1.03 } : {}}
          whileTap={compositeUrl ? { scale: 0.97 } : {}}
        >
          {downloading ? 'downloading...' : '↓ download'}
        </motion.button>

        <motion.button
          onClick={handleQr}
          disabled={!compositeUrl}
          className="w-full py-4 rounded-full font-black text-sm uppercase tracking-widest"
          style={{
            background: '#111',
            color: compositeUrl ? '#fff' : '#333',
            border: '1px solid',
            borderColor: compositeUrl ? '#333' : '#1a1a1a',
            cursor: compositeUrl ? 'pointer' : 'not-allowed',
          }}
          whileHover={compositeUrl ? { scale: 1.03 } : {}}
          whileTap={compositeUrl ? { scale: 0.97 } : {}}
        >
          ⬡ generate QR code
        </motion.button>

        <motion.button
          onClick={onRestart}
          className="w-full py-4 rounded-full font-black text-sm uppercase tracking-widest"
          style={{ background: 'transparent', color: '#444', border: '1px solid #222' }}
          whileHover={{ color: '#888', borderColor: '#444' }}
          whileTap={{ scale: 0.97 }}
        >
          ↺ start over
        </motion.button>
      </div>

      {/* QR modal */}
      {showQr && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center z-50 px-4"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setShowQr(false)}
        >
          <motion.div
            className="rounded-2xl p-8 flex flex-col items-center gap-4 max-w-sm w-full"
            style={{ background: '#111', border: '1px solid #333' }}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={e => e.stopPropagation()}
          >
            {qrError ? (
              <>
                <div className="text-center text-yellow-400 font-bold text-sm">
                  Photo too large for a QR code
                </div>
                <p className="text-center text-gray-400 text-xs">
                  QR codes hold ~3 KB max. Use Download to save your strip, or copy the raw data URL below.
                </p>
                <button
                  onClick={handleCopy}
                  className="px-8 py-3 rounded-full font-bold text-sm uppercase tracking-widest bg-white text-black"
                >
                  Copy data URL
                </button>
              </>
            ) : (
              <>
                <div className="p-4 bg-white rounded-xl">
                  <QRCodeCanvas value={qrValue ?? ''} size={200} />
                </div>
                <p className="text-center text-gray-400 text-xs">
                  Scan to save on mobile — QR links to your photo data.
                </p>
              </>
            )}
            <button
              onClick={() => setShowQr(false)}
              className="text-xs uppercase tracking-widest text-gray-600 hover:text-white mt-2"
            >
              close
            </button>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
