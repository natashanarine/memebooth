import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { LandingPage } from './components/LandingPage';
import { MemeSelection } from './components/MemeSelection';
import { PhotoBooth } from './components/PhotoBooth';
import { ResultPage } from './components/ResultPage';
import type { Meme } from './lib/memes';

type Screen = 'landing' | 'selection' | 'booth' | 'result';

export default function App() {
  const [screen, setScreen] = useState<Screen>('landing');
  const [selectedMemes, setSelectedMemes] = useState<Meme[]>([]);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);

  const handleStart = () => setScreen('selection');

  const handleMemeConfirm = (memes: Meme[]) => {
    setSelectedMemes(memes);
    setScreen('booth');
  };

  const handleBoothComplete = (photos: string[], memes: Meme[]) => {
    setCapturedPhotos(photos);
    setSelectedMemes(memes);
    setScreen('result');
  };

  const handleRestart = () => {
    setScreen('landing');
    setSelectedMemes([]);
    setCapturedPhotos([]);
  };

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', width: '100%' }}>
      <AnimatePresence mode="wait">
        {screen === 'landing' && (
          <LandingPage key="landing" onStart={handleStart} />
        )}
        {screen === 'selection' && (
          <MemeSelection
            key="selection"
            onConfirm={handleMemeConfirm}
            onBack={() => setScreen('landing')}
          />
        )}
        {screen === 'booth' && (
          <PhotoBooth
            key="booth"
            memes={selectedMemes}
            onComplete={handleBoothComplete}
            onBack={() => setScreen('selection')}
          />
        )}
        {screen === 'result' && (
          <ResultPage
            key="result"
            photos={capturedPhotos}
            memes={selectedMemes}
            onRestart={handleRestart}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
