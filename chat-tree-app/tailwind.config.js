/** @type {import('tailwindcss').Config} */
import { defineConfig } from '@tailwindcss/vite'

export default defineConfig({
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'chat-user': '#eff6ff',
        'chat-assistant': '#f0fdf4',
        'chat-system': '#f9fafb',
      }
    },
  },
})