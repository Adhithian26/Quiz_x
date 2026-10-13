/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0B0F19',       // Deepest navy/black background
          navy: '#111827',       // Charcoal / midnight card background
          surface: '#1E293B',    // Card hover / elevated surface
          border: '#334155',     // Subtle border
          violet: '#8B5CF6',     // Electric violet primary
          'violet-glow': '#A78BFA',
          cyan: '#06B6D4',       // Bright cyan accent
          'cyan-glow': '#22D3EE',
          emerald: '#10B981',    // Success / correct answer
          rose: '#F43F5E',       // Error / wrong answer
          amber: '#F59E0B',      // Warning / waiting
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounce 2s infinite',
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'slide-up': 'slideUp 0.4s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
