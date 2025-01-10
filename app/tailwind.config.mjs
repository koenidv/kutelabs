const defaultTheme = require('tailwindcss/defaultTheme')

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			fontFamily: {
				poppins: ["Poppins", ...defaultTheme.fontFamily.sans]
			},
			colors: {
				beige: {
					base: "#f4f0e5",
					50: "#fcfbf7",
					100: "#f5f0e5",
					200: "#eee5d3",
					300: "#e7dbc0",
					400: "#e0d0ae",
				},
				"purp": {
					400: "#AE78FE"
				}
			}
		},
	},
	plugins: [],
}
