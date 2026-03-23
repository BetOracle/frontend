import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/health": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
  plugins: [react()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'thirdweb': ['thirdweb'],
          'recharts': ['recharts'],
          'vendor': ['react', 'react-dom', 'react-router-dom', 'framer-motion', 'lucide-react'],
          'wallet': ['@rainbow-me/rainbowkit', 'viem', 'wagmi'],
        },
      },
    },
  },
}));
