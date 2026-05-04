import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { scorePose } from '../lib/pose-matching';
import type { Meme } from '../lib/memes';
import { CartoonButton } from './ui/cartoon-button';

interface PhotoBoothProps {
  memes: Meme[];
  onComplete: (photos: string[], memes: Meme[]) => void;
  onBack: () => void;
}

const MATCH_THRESHOLD = 0.40;
const COUNTDOWN_SECS = 3;

type Phase = 'cam-loading' | 'ai-loading' | 'error' | 'posing' | 'countdown' | 'get-ready' | 'done';

interface PoseDetector {
  estimatePoses(image: HTMLVideoElement): Promise<Array<{
    keypoints: Array<{ x: number; y: number; score?: number; name?: string }>
  }>>;
  dispose(): void;
}

const IMPACT: React.CSSProperties = {
  fontFamily: 'Impact, "Arial Narrow Bold", sans-serif',
};

const SKELETON_CONNECTIONS: [string, string][] = [
  ['left_shoulder', 'right_shoulder'],
  ['left_shoulder', 'left_elbow'],
  ['left_elbow', 'left_wrist'],
  ['right_shoulder', 'right_elbow'],
  ['right_elbow', 'right_wrist'],
  ['left_shoulder', 'left_hip'],
  ['right_shoulder', 'right_hip'],
  ['left_hip', 'right_hip'],
  ['nose', 'left_eye'],
  ['nose', 'right_eye'],
  ['left_eye', 'left_ear'],
  ['right_eye', 'right_ear'],
];

function drawSkeleton(
  keypoints: Array<{ x: number; y: number; score?: number; name?: string }>,
  canvas: HTMLCanvasElement,
  videoW: number,
  videoH: number,
) {
  if (canvas.width !== videoW || canvas.height !== videoH) {
    canvas.width = videoW;
    canvas.height = videoH;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, videoW, videoH);

  const kpMap = new Map(keypoints.map(k => [k.name, k]));
  const conf = (name: string) => (kpMap.get(name)?.score ?? 0);

  // Connections
  ctx.lineWidth = 3;
  for (const [a, b] of SKELETON_CONNECTIONS) {
    const ka = kpMap.get(a);
    const kb = kpMap.get(b);
    if (!ka || !kb || conf(a) < 0.25 || conf(b) < 0.25) continue;
    ctx.strokeStyle = '#00ff88';
    ctx.globalAlpha = Math.min(conf(a), conf(b));
    ctx.beginPath();
    ctx.moveTo(ka.x, ka.y);
    ctx.lineTo(kb.x, kb.y);
    ctx.stroke();
  }

  // Keypoints
  for (const kp of keypoints) {
    if ((kp.score ?? 0) < 0.25) continue;
    ctx.globalAlpha = kp.score ?? 1;
    // Wrists highlighted in red so users can see hand position clearly
    ctx.fillStyle = kp.name?.includes('wrist') ? '#ff2d55' : '#ffffff';
    ctx.beginPath();
    ctx.arc(kp.x, kp.y, kp.name?.includes('wrist') ? 7 : 4, 0, 2 * Math.PI);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function PhotoBooth({ memes, onComplete, onBack }: PhotoBoothProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const detectorRef = useRef<PoseDetector | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<Phase>('cam-loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [matchScore, setMatchScore] = useState(0);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECS);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [showFlash, setShowFlash] = useState(false);
  const [aiReady, setAiReady] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);

  const getReadyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const photosRef = useRef<string[]>([]);
  const poseHoldStartRef = useRef<number | null>(null);
  const showSkeletonRef = useRef(false);
  const phaseRef = useRef<Phase>('cam-loading');
  const matchRef = useRef(0);
  const countdownRef = useRef(COUNTDOWN_SECS);
  const countdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const captureInProgressRef = useRef(false);
  const currentIdxRef = useRef(0);

  const updatePhase = useCallback((p: Phase) => { phaseRef.current = p; setPhase(p); }, []);
  const updateMatch = useCallback((v: number) => { matchRef.current = v; setMatchScore(v); }, []);

  const toggleSkeleton = useCallback(() => {
    const next = !showSkeletonRef.current;
    showSkeletonRef.current = next;
    setShowSkeleton(next);
    if (!next && overlayCanvasRef.current) {
      const ctx = overlayCanvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
    }
  }, []);

  // Stage 1: Camera
  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;

        const video = videoRef.current!;
        video.srcObject = stream;
        try { await video.play(); } catch { /* autoplay policy */ }

        updatePhase('ai-loading');
      } catch (e: unknown) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        setErrorMsg(
          msg.includes('NotAllowed') || msg.includes('Permission') || msg.includes('NotFound')
            ? 'Camera access denied. Please allow camera access and try again.'
            : `Could not access camera: ${msg}`
        );
        updatePhase('error');
      }
    }

    startCamera();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [updatePhase]);

  // Stage 2: Load AI model
  useEffect(() => {
    if (phase !== 'ai-loading') return;
    let cancelled = false;

    async function loadAI() {
      try {
        const tf = await import('@tensorflow/tfjs');
        if (cancelled) return;
        await tf.ready();
        const poseDetection = await import('@tensorflow-models/pose-detection');
        if (cancelled) return;
        const detector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          { modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER }
        );
        if (cancelled) { detector.dispose(); return; }
        detectorRef.current = detector as PoseDetector;
        setAiReady(true);
        updatePhase('posing');
      } catch {
        if (!cancelled) {
          setAiReady(false);
          updatePhase('posing');
        }
      }
    }

    loadAI();
    return () => { cancelled = true; };
  }, [phase, updatePhase]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
      if (getReadyTimerRef.current) clearTimeout(getReadyTimerRef.current);
      detectorRef.current?.dispose();
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // Pose detection loop
  useEffect(() => {
    if (phase !== 'posing') return;
    let active = true;

    const loop = async () => {
      if (!active) return;
      const video = videoRef.current;
      const detector = detectorRef.current;

      if (video && detector && video.readyState >= 2) {
        try {
          const poses = await detector.estimatePoses(video);
          if (poses.length > 0 && active) {
            const kps = poses[0].keypoints;
            const meme = memes[currentIdxRef.current];
            const raw = scorePose(meme.id, kps);
            const prev = matchRef.current;
            const smoothed = raw > prev
              ? prev * 0.2 + raw * 0.8
              : prev * 0.6 + raw * 0.4;
            updateMatch(smoothed);

            // Draw skeleton overlay when toggled on
            if (showSkeletonRef.current && overlayCanvasRef.current) {
              drawSkeleton(kps, overlayCanvasRef.current, video.videoWidth || 640, video.videoHeight || 480);
            }

            if (smoothed >= MATCH_THRESHOLD && phaseRef.current === 'posing' && !captureInProgressRef.current) {
              if (poseHoldStartRef.current === null) poseHoldStartRef.current = Date.now();
              if (Date.now() - poseHoldStartRef.current >= 700) {
                poseHoldStartRef.current = null;
                captureInProgressRef.current = true;
                updatePhase('countdown');
                startCountdown();
              }
            } else {
              poseHoldStartRef.current = null;
            }
          }
        } catch { /* continue */ }
      }
      if (active) rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      active = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase, memes, updateMatch, updatePhase]); // eslint-disable-line react-hooks/exhaustive-deps

  const startCountdown = useCallback(() => {
    countdownRef.current = COUNTDOWN_SECS;
    setCountdown(COUNTDOWN_SECS);
    const tick = () => {
      countdownRef.current -= 1;
      setCountdown(countdownRef.current);
      if (countdownRef.current <= 0) {
        snapPhoto();
      } else {
        countdownTimerRef.current = setTimeout(tick, 1000);
      }
    };
    countdownTimerRef.current = setTimeout(tick, 1000);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const snapPhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 500);

    const nextPhotos = [...photosRef.current, dataUrl];
    photosRef.current = nextPhotos;
    setCapturedPhotos(nextPhotos);

    const nextIdx = currentIdxRef.current + 1;
    if (nextIdx >= memes.length) {
      phaseRef.current = 'done'; setPhase('done');
      setTimeout(() => onComplete(nextPhotos, memes), 800);
    } else {
      currentIdxRef.current = nextIdx;
      setCurrentIdx(nextIdx);
      updateMatch(0);
      captureInProgressRef.current = false;
      setCountdown(COUNTDOWN_SECS);
      phaseRef.current = 'get-ready'; setPhase('get-ready');
      getReadyTimerRef.current = setTimeout(() => {
        if (phaseRef.current === 'get-ready') {
          poseHoldStartRef.current = null;
          phaseRef.current = 'posing'; setPhase('posing');
        }
      }, 1500);
    }
  }, [memes, onComplete, updateMatch]);

  const handleManualSnap = useCallback(() => {
    if (captureInProgressRef.current) return;
    captureInProgressRef.current = true;
    snapPhoto();
    setTimeout(() => { captureInProgressRef.current = false; }, 1000);
  }, [snapPhoto]);

  const meme = memes[currentIdx] ?? memes[0];
  const matchPct = Math.round(matchScore * 100);
  const matchColor = matchScore >= MATCH_THRESHOLD ? '#00ff88' : matchScore > 0.20 ? '#ffcc00' : '#ff2d55';
  const isLoading = phase === 'cam-loading' || phase === 'ai-loading';

  return (
    <motion.div
      className="min-h-screen flex flex-col"
      style={{ background: '#0a0a0a' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Top bar */}
      {!isLoading && phase !== 'error' && (
        <div className="flex items-center justify-between px-6 py-4 shrink-0">
          <CartoonButton label="← exit" color="bg-zinc-200" onClick={onBack} />
          <div className="text-center">
            <span className="text-white text-sm uppercase tracking-widest" style={IMPACT}>
              photo {currentIdx + 1} of {memes.length}
            </span>
            <div className="flex gap-1 mt-1 justify-center">
              {memes.map((_, i) => (
                <div key={i} className="h-1 rounded-full"
                  style={{
                    width: i === currentIdx ? 24 : 8,
                    background: i < currentIdx ? '#00ff88' : i === currentIdx ? '#fff' : '#333',
                    transition: 'all 0.3s',
                  }} />
              ))}
            </div>
          </div>
          <div className="w-16" />
        </div>
      )}

      {/* Error */}
      {phase === 'error' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">
          <div className="text-5xl">📷</div>
          <p className="text-center text-red-400 text-base max-w-sm" style={IMPACT}>{errorMsg}</p>
          <CartoonButton label="Go Back" color="bg-white" onClick={onBack} />
        </div>
      )}

      {/* Main panels */}
      <div
        className="flex-1 flex flex-col md:flex-row gap-3 px-4 pb-4"
        style={{ minHeight: 0, display: phase === 'error' ? 'none' : undefined }}
      >
        {/* Meme reference */}
        <div className="w-full md:w-1/2 flex flex-col rounded-2xl overflow-hidden"
          style={{ border: '1px solid #222', minHeight: 200, visibility: isLoading ? 'hidden' : 'visible' }}>
          <div className="relative flex-1" style={{ minHeight: 200 }}>
            <AnimatePresence mode="wait">
              <motion.img key={meme.id} src={meme.imageUrl} alt={meme.name}
                className="absolute inset-0 w-full h-full"
                style={{ objectFit: 'cover', objectPosition: 'center top' }}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }} />
            </AnimatePresence>
            <div className="absolute inset-0"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 55%)' }} />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <div className="text-white text-xl" style={IMPACT}>{meme.name}</div>
              <div className="text-sm mt-0.5" style={{ color: '#aaa' }}>{meme.pose}</div>
            </div>
          </div>
          <div className="px-4 py-3" style={{ background: '#111' }}>
            <div className="text-xs uppercase tracking-widest" style={{ ...IMPACT, color: '#555' }}>
              match the pose above
            </div>
          </div>
        </div>

        {/* Webcam panel */}
        <div className="w-full md:w-1/2 flex flex-col rounded-2xl overflow-hidden"
          style={{
            border: isLoading ? '2px solid #222' : `2px solid ${matchColor}`,
            transition: 'border-color 0.3s',
            minHeight: 200,
          }}>
          <div className="relative flex-1 overflow-hidden" style={{ background: '#000', minHeight: 200 }}>

            {/* Video */}
            <video ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
              playsInline muted autoPlay />

            {/* Hidden capture canvas */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Skeleton overlay — same mirror transform as video so coordinates align */}
            <canvas
              ref={overlayCanvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ transform: 'scaleX(-1)', opacity: showSkeleton ? 1 : 0, transition: 'opacity 0.2s' }}
            />

            {showFlash && <div className="absolute inset-0 bg-white pointer-events-none" />}

            {/* Loading overlay */}
            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"
                style={{ background: 'rgba(0,0,0,0.75)' }}>
                <div className="w-8 h-8 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span className="text-white text-xs uppercase tracking-widest" style={IMPACT}>
                  starting up...
                </span>
              </div>
            )}

            {/* Countdown */}
            <AnimatePresence>
              {phase === 'countdown' && (
                <motion.div key={countdown}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  initial={{ scale: 2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.3 }}>
                  <span style={{ ...IMPACT, fontSize: '8rem', color: '#00ff88', textShadow: '0 0 40px #00ff8880', lineHeight: 1 }}>
                    {countdown}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Match meter */}
            {aiReady && !isLoading && (
              <div className="absolute top-3 left-3 right-3 flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#222' }}>
                  <motion.div className="h-full rounded-full" style={{ background: matchColor }}
                    animate={{ width: `${matchPct}%` }} transition={{ duration: 0.15 }} />
                </div>
                <span className="tabular-nums text-sm"
                  style={{ ...IMPACT, color: matchColor, minWidth: '3.5ch', textAlign: 'right' }}>
                  {matchPct}%
                </span>
              </div>
            )}

            {/* Status badge / manual snap */}
            {!isLoading && (
              <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                {aiReady ? (
                  <div className="px-4 py-1.5 rounded-full text-xs uppercase tracking-widest"
                    style={{
                      ...IMPACT,
                      background: 'rgba(0,0,0,0.7)',
                      backdropFilter: 'blur(4px)',
                      color: phase === 'countdown' || matchScore >= MATCH_THRESHOLD ? '#00ff88' : '#aaa',
                    }}>
                    {phase === 'get-ready' ? 'get ready...'
                      : phase === 'countdown' ? '✓ hold it...'
                      : matchScore >= MATCH_THRESHOLD ? '✓ pose matched!'
                      : matchScore > 0.20 ? 'getting there...'
                      : 'strike the pose'}
                  </div>
                ) : (
                  <CartoonButton label="📸 snap photo" color="bg-emerald-400" onClick={handleManualSnap} />
                )}
              </div>
            )}
          </div>

          {/* Skeleton toggle — only visible when AI is ready */}
          {aiReady && !isLoading && (
            <div className="px-4 py-2 flex items-center justify-between" style={{ background: '#111' }}>
              <span className="text-xs uppercase tracking-widest" style={{ ...IMPACT, color: '#555' }}>
                show tracking
              </span>
              <button
                onClick={toggleSkeleton}
                className="relative rounded-full transition-colors"
                style={{
                  width: 40,
                  height: 22,
                  background: showSkeleton ? '#00ff88' : '#333',
                  transition: 'background 0.2s',
                }}
              >
                <span
                  className="absolute rounded-full bg-white"
                  style={{
                    width: 16,
                    height: 16,
                    top: 3,
                    left: showSkeleton ? 21 : 3,
                    transition: 'left 0.2s',
                  }}
                />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Thumbnail strip */}
      {capturedPhotos.length > 0 && phase !== 'error' && (
        <div className="px-4 pb-4 flex gap-2 justify-center">
          {capturedPhotos.map((photo, i) => (
            <motion.div key={i} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="relative rounded-lg overflow-hidden"
              style={{ width: 60, height: 60, border: '2px solid #00ff88', flexShrink: 0 }}>
              <img src={photo} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.3)' }}>
                <span className="text-white font-black text-xs">{i + 1}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
