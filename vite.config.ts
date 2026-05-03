import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // @mediapipe/pose uses Google Closure exports, not named ESM — stub it out.
      // MoveNet doesn't use MediaPipe at runtime; this only prevents a build error.
      '@mediapipe/pose': resolve(__dirname, 'src/stubs/mediapipe-pose.js'),
    },
  },
})
