import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Proxy /api to the local analysis server so the browser never sees FFLogs creds.
export default defineConfig({
	plugins: [react()],
	server: {
		port: 5173,
		proxy: {
			'/api': 'http://localhost:8787',
		},
	},
})
