import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// El puerto 5173 es el origen permitido por defecto en el CORS de C-TRD
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
});
