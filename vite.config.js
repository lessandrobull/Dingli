import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    watch: {
      ignored: ['**/audios_dingli/**', '**/*.mp3']
    }
  }
})