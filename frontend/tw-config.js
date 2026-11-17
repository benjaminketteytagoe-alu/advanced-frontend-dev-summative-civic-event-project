/*
 * Tailwind Play-CDN theme configuration for CivicEvents+.
 * Loaded immediately after the Tailwind CDN script on every page.
 *
 * Palette ("civic gazette"):
 *   ink    – deep navy used for text, primary buttons and surfaces
 *   paper  – warm off-white page background
 *   ember  – terracotta accent (ember-600+ passes WCAG AA on paper)
 *   moss   – success / published states
 */
tailwind.config = {
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f4f6fa', 100: '#e6eaf2', 200: '#c9d1e1', 300: '#9aa8c4', 400: '#6a7ca3',
          500: '#4a5d86', 600: '#36476c', 700: '#283656', 800: '#1c2742', 900: '#121a2e', 950: '#0b1120'
        },
        paper: { DEFAULT: '#f8f5ee', 50: '#fdfcf9', 100: '#f8f5ee', 200: '#efe9db', 300: '#e2d8c3', 400: '#cbbd9f' },
        ember: {
          50: '#fdf3ee', 100: '#fae3d6', 200: '#f3c2a8', 300: '#ea9a74', 400: '#df7447',
          500: '#c8562a', 600: '#a9441f', 700: '#87361b', 800: '#6b2c19', 900: '#572617'
        },
        moss: { 50: '#f2f7ec', 100: '#e1edd3', 200: '#c3dba8', 500: '#5b7f2f', 600: '#466625', 700: '#36501e' }
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'Cambria', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace']
      },
      boxShadow: {
        card: '0 1px 0 rgba(18,26,46,.04), 0 10px 30px -18px rgba(18,26,46,.35)',
        lift: '0 2px 0 rgba(18,26,46,.05), 0 22px 40px -20px rgba(18,26,46,.45)',
        inset: 'inset 0 0 0 1px rgba(18,26,46,.08)'
      },
      borderRadius: { xl2: '1.1rem' },
      maxWidth: { page: '76rem' }
    }
  }
};
