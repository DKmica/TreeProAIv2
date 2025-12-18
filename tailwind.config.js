/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-cyan': {
          '50': '#e0f7ff',
          '100': '#b3ecff',
          '200': '#80e1ff',
          '300': '#4dd5ff',
          '400': '#26cbff',
          '500': '#00c2ff',
          '600': '#00a8e6',
          '700': '#008abd',
          '800': '#006d94',
          '900': '#004f6b',
          '950': '#003142',
        },
        'brand-green': {
          '50': '#e0f7ff',
          '100': '#b3ecff',
          '200': '#80e1ff',
          '300': '#4dd5ff',
          '400': '#26cbff',
          '500': '#00c2ff',
          '600': '#00a8e6',
          '700': '#008abd',
          '800': '#006d94',
          '900': '#004f6b',
          '950': '#003142',
        },
        'brand-gray': {
          '50': '#f0f4f8',
          '100': '#d9e2ec',
          '200': '#bcccdc',
          '300': '#9fb3c8',
          '400': '#829ab1',
          '500': '#627d98',
          '600': '#486581',
          '700': '#334e68',
          '800': '#243b53',
          '900': '#102a43',
          '950': '#0a1628',
        }
      }
    }
  },
  plugins: [],
}
