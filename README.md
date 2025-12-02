<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally or inside an online workspace such as Google AI Studio (no local machine setup required).

View your app in AI Studio: https://ai.studio/apps/drive/1jPztVSq35oScCpJqmp29rZsGDnpBvK3I

## Run Locally or in an Online Workspace

**Prerequisites:**  Node.js (available in your online workspace terminal)


1. Install dependencies from the built-in terminal (local or hosted):
   `npm install`
2. Configure environment variables:
   - For online platforms (e.g., Google AI Studio), add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `GEMINI_API_KEY` in the environment settings panel.
   - For local development, copy the sample env file: `cp .env.example .env`, then set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to freshly issued Supabase credentials (rotate any old keys in the Supabase dashboard) and `GEMINI_API_KEY` to your Gemini API key.
3. Run the app:
   `npm run dev`
