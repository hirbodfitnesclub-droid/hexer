<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1jPztVSq35oScCpJqmp29rZsGDnpBvK3I

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy the sample environment file and set your secrets:
   - `cp .env.example .env`
   - Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to a freshly issued Supabase URL and anon key (rotate any old keys in the Supabase dashboard to invalidate leaked credentials).
   - Set `GEMINI_API_KEY` to your Gemini API key.
3. Run the app:
   `npm run dev`
