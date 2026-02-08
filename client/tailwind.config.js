/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                practo: {
                    blue: '#28328c',
                    teal: '#2d2d32',
                    lightTeal: '#41c1ad',
                    grey: '#787887',
                    border: '#f0f0f5',
                    bg: '#f0f0f5',
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            boxShadow: {
                'practo': '0 4px 12px 0 rgba(0,0,0,.05)',
            }
        },
    },
    plugins: [],
}
