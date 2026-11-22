import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        glass: 'rgba(15, 23, 42, 0.7)',
        glassBorder: 'rgba(100, 116, 139, 0.3)',
        accent: {
          blue: '#3b82f6',
          violet: '#8b5cf6',
          cyan: '#06b6d4',
          emerald: '#10b981',
          amber: '#f59e0b',
          rose: '#f43f5e',
        },
        slate: {
          950: '#020617',
          900: '#0f172a',
          850: '#141f3a',
          800: '#1e293b',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'mesh-gradient': 'linear-gradient(135deg, #080c15 0%, #1e1b4b 40%, #0f172a 70%, #080c15 100%)',
        'mesh-gradient-violet': 'linear-gradient(135deg, #080c15 0%, #2d1b4b 40%, #1e1b4b 70%, #080c15 100%)',
        'mesh-gradient-cyan': 'linear-gradient(135deg, #080c15 0%, #0e2d3a 40%, #143d4a 70%, #080c15 100%)',
      },
      animation: {
        'float': 'float 20s ease-in-out infinite',
        'pulse-slow': 'pulse 4s ease-in-out infinite',
        'spin-slow': 'spin 20s linear infinite',
        'shimmer': 'shimmer 1.8s infinite ease-in-out',
        'drift': 'drift 80s linear infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      boxShadow: {
        'glass': '0 4px 24px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(59, 130, 246, 0.1) inset',
        'glass-lg': '0 8px 40px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(59, 130, 246, 0.15) inset',
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.25), 0 0 40px rgba(59, 130, 246, 0.1)',
        'glow-violet': '0 0 20px rgba(139, 92, 246, 0.25), 0 0 40px rgba(139, 92, 246, 0.1)',
        'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.25), 0 0 40px rgba(6, 182, 212, 0.1)',
        'glow-emerald': '0 0 20px rgba(16, 185, 129, 0.25), 0 0 40px rgba(16, 185, 129, 0.1)',
      },
      backdropBlur: {
        'xs': '2px',
        '4xl': '72px',
      },
      transitionDuration: {
        '400': '400ms',
      },
      transitionTimingFunction: {
        'ease-out-expo': 'cubic-bezier(0.19, 1, 0.22, 1)',
      },
    },
  },
  plugins: [],
};

export default config;