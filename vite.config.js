import { defineConfig } from 'vite'
import { reactRouter } from '@react-router/dev/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [reactRouter()],
  worker: { format: 'es' },
  build: {
    rollupOptions: {
      output: {
        // Split the React runtime into its own long-cacheable chunk so app-code
        // updates don't force visitors to re-download the framework.
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) {
            return 'react'
          }
        },
      },
    },
  },
})
