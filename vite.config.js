import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `npm run build`      -> build normal para Vercel (dist/)
// `npm run build:demo` -> un solo archivo HTML para mostrarle al cliente (demo/index.html)
export default defineConfig(({ mode }) => {
  const demo = mode === 'demo'
  return {
    plugins: [react(), tailwindcss(), ...(demo ? [viteSingleFile()] : [])],
    define: { __DEMO__: JSON.stringify(demo) },
    build: { outDir: demo ? 'demo' : 'dist' },
  }
})
