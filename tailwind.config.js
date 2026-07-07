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
        // PSR Custom Color Palette
        psr: {
          red: '#C8102E',      // Primary Red
          darkRed: '#99001E',  // Accent Dark Red
          lightRed: '#FDEBEC', // Subdued background red
          bg: '#F8F9FB',       // Body background
          textPrimary: '#1E1E1E',
          textSecondary: '#6B7280',
          border: '#E5E7EB',
          success: '#22C55E',
          warning: '#F59E0B',
          danger: '#EF4444',
        }
      },
      fontFamily: {
        display: ['Clash Display', 'sans-serif'],
        heading: ['General Sans', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        numbers: ['Space Grotesk', 'monospace'],
        buttons: ['Satoshi', 'sans-serif'],
      },
      boxShadow: {
        premium: '0 4px 20px -2px rgba(200, 16, 46, 0.05), 0 2px 8px -1px rgba(0, 0, 0, 0.02)',
        glass: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
      },
      backdropBlur: {
        premium: '16px',
      }
    },
  },
  plugins: [],
}