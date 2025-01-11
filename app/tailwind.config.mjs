const defaultTheme = require('tailwindcss/defaultTheme')

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			fontFamily: {
				poppins: ["Poppins", ...defaultTheme.fontFamily.sans],
				gamja: ["Gamja Flower", ...defaultTheme.fontFamily.sans],
			},
			colors: {
				beige: {
					base: "#f4f0e5",
					50: "#fcfbf7",
					100: "#f5f0e5",
					200: "#eee5d3",
					300: "#e7dbc0",
					400: "#e0d0ae",
					500: "#c9bb9c",
					600: "#b3a68b",
					700: "#9c9179",
					800: "#867c68",
				},
				"purp": {
					400: "#AE78FE"
				}
			}
		},
	},
	safelist: [
		"elevated-0",
		"elevated-1",
		"elevated-2",
		"elevated-3",
		"elevated-4",
	],
	plugins: [],
}
