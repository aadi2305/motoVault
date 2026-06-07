import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: '/aadi2305.github.io/motoVault/', // <-- Add this line (replace with your repo name, keep slashes)
    plugins: [react(), tailwindcss()],
    // ... existing configuration
  };
});
