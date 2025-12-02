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
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## حالت بدون نصب و استفاده از استورها

در محیط‌های آنلاین بدون دسترسی به CLI می‌توانید برای تست و ساخت کامپوننت‌ها مستقیماً از استورهای دامنه‌ای استفاده کنید:

1. یک sandbox ایجاد کنید و سورس پروژه را داخل آن کپی کنید.
2. فایل‌های استور در پوشه `contexts/` قرار دارند و با الگوی Zustand کار می‌کنند (`useTaskStore`، `useNoteStore`، `useProjectStore`، `useHabitStore`، `useChatStore`، `useNotificationStore` و `useUIStore`).
3. در هر فایل React می‌توانید با `import { useTaskStore } from './contexts/tasksStore'` داده و اکشن‌ها را دریافت کنید. این استورها با `useSyncExternalStore` پیاده‌سازی شده‌اند و بدون Provider هم قابل استفاده هستند.
4. برای تست دستی، یک کامپوننت ساده بسازید و داده را با `const tasks = useTaskStore(state => state.tasks);` یا فراخوانی اکشن‌ها (`useTaskStore.getState().fetchTasks()`) بخوانید. این الگو در sandbox‌های آنلاین (مانند StackBlitz) بدون نیاز به `npm install` نیز کار می‌کند زیرا استور از وابستگی‌های داخلی پروژه استفاده می‌کند.

> نکته: برای تولید حالت‌های مشتق‌شده می‌توانید از Selector های ذخیره‌شده در خود استور (مانند `useTaskStore(state => state.tasks)`) یا `createSelector` در `utils/zustandLite.ts` کمک بگیرید تا فقط بخش موردنیاز را رندر کنید.

