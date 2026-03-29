/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                healsync: {
                    indigo: '#4f46e5',
                    violet: '#7c3aed',
                    mint: '#10b981',
                    grey: '#6b7280',
                    border: '#e5e7eb',
                    bg: '#f9fafb',
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            boxShadow: {
                'healsync': '0 4px 12px 0 rgba(79,70,229,.15)',
                'healsync-hover': '0 8px 24px 0 rgba(79,70,229,.25)',
            },
            animation: {
                'fade-up': 'fadeUp 0.6s ease-out',
                'fade-in': 'fadeIn 0.3s ease-out',
            },
            keyframes: {
                fadeUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
            },
        },
    },
    plugins: [],
}
