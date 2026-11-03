/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        page: '#F6F8FB',
        surface: '#FFFFFF',
        subtle: '#F8FAFC',
        txt: {
          main: '#172033',
          sec: '#667085',
          muted: '#94A3B8',
        },
        line: '#E2E8F0',
        brand: {
          DEFAULT: '#0F766E',
          hover: '#115E59',
          light: '#F0FDFA',
          accent: '#14B8A6',
        },
        state: {
          info: '#2563EB',
          infoBg: '#EFF6FF',
          ok: '#16A34A',
          okBg: '#F0FDF4',
          warn: '#D97706',
          warnBg: '#FFFBEB',
          err: '#DC2626',
          errBg: '#FEF2F2',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          '"PingFang SC"',
          '"Microsoft YaHei"',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
