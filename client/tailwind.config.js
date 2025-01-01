/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        lightGrey: {
          DEFAULT: '#8D8D8D', // Your desired hex code
          hover: '#696969',   // A darker shade for hover
        },
        grey: {
          DEFAULT: '#BDBDBD', // Your desired hex code
          hover: '#696969',   // A darker shade for hover
        },
      }
    },
  },  
  plugins: [],
}

