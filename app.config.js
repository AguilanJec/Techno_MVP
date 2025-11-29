// app.config.js
import 'dotenv/config'

export default ({ config }) => ({
    ...config,
    extra: {
        ...config.extra,
        geminiApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? null,
    },
})