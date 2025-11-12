import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenAI, Type, GenerateContentResponse } from 'https://esm.sh/@google/genai@0.14.0';
import type { Task, Note, Project } from '../../../types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

declare const Deno: any;

// Helper function for retry mechanism
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Types (Subset needed for server) ---
interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
}

interface AIResponse {
  action: "CREATE_TASK" | "CREATE_NOTE" | "CREATE_PROJECT" | "CREATE_HABIT" | "UPDATE_TASK" | "UPDATE_NOTE" | "UPDATE_HABIT" | "LINK_ITEMS" | "PLAN_DAY" | "SEARCH" | "CHAT";
  params?: {
    title?: string;
    name?: string;
    description?: string;
    content?: string;
    tags?: string[];
    targetId?: string;
    projectId?: string | null;
    dueDate?: string;
    priority?: 'کم' | 'متوسط' | 'زیاد';
    color?: string;
    reply: string;
  };
  scheduledTaskIds?: string[];
}


// --- AI Configuration ---
const API_KEY = Deno.env.get('GEMINI_API_KEY');
if (!API_KEY) {
  // Fail early if the API key is not set.
  console.error("Missing GEMINI_API_KEY environment variable.");
}
const ai = new GoogleGenAI({ apiKey: API_KEY });
const model = 'gemini-2.5-flash';

const systemInstruction = `You are a highly efficient assistant for a personal management app, acting as a Natural Language to JSON translator. Adhere strictly to the provided JSON schema. Your "reply" field MUST ALWAYS be in Persian, conversational, short, and confirm the action. Do not add any text outside the required JSON output. Analyze the user's request and provided context to determine the correct action and parameters.`;

const intentSchema = {
  type: Type.OBJECT,
  properties: {
    action: {
      type: Type.STRING,
      enum: ["CREATE_TASK", "CREATE_NOTE", "CREATE_PROJECT", "CREATE_HABIT", "UPDATE_TASK", "UPDATE_NOTE", "UPDATE_HABIT", "LINK_ITEMS", "PLAN_DAY", "SEARCH", "CHAT"],
    },
    params: {
      type: Type.OBJECT,
      nullable: true,
      properties: {
        title: { type: Type.STRING, nullable: true },
        name: { type: Type.STRING, description: "Name for an item, especially for a habit.", nullable: true },
        description: { type: Type.STRING, nullable: true },
        content: { type: Type.STRING, nullable: true },
        tags: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true },
        targetId: { type: Type.STRING, description: "ID of the item to update or link.", nullable: true },
        projectId: { type: Type.STRING, description: "ID of the target project.", nullable: true },
        dueDate: { type: Type.STRING, description: "Due date in YYYY-MM-DD format.", nullable: true },
        priority: { type: Type.STRING, enum: ["کم", "متوسط", "زیاد"], nullable: true },
        color: { type: Type.STRING, enum: ["sky", "red", "green", "yellow", "purple", "gray"], nullable: true },
        reply: { type: Type.STRING, description: "A conversational, natural Persian response for the user." }
      },
      required: ["reply"]
    },
    scheduledTaskIds: {
      type: Type.ARRAY,
      nullable: true,
      items: { type: Type.STRING }
    },
  },
  required: ["action"],
};

// --- Prompt Generation ---
const generateIntentPrompt = (message: string, history: ChatMessage[], tasks: Task[], notes: Note[], projects: Project[], habits: {id: string, name: string}[]): string => {
  let context = 'Current user data structure (name and ID only):\n\n';
  if (projects.length > 0) context += 'Projects: ' + projects.map(p => `"${p.title}" (id: ${p.id})`).join(', ') + '\n';
  if (tasks.length > 0) context += 'Tasks: ' + tasks.map(t => `"${t.title}" (id: ${t.id})`).join(', ') + '\n';
  if (notes.length > 0) context += 'Notes: ' + notes.map(n => `"${n.title}" (id: ${n.id})`).join(', ') + '\n';
  if (habits.length > 0) context += 'Habits: ' + habits.map(h => `"${h.name}" (id: ${h.id})`).join(', ') + '\n';

  const historyContext = history.slice(-6).map(msg => `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.text}`).join('\n');

  return `
    **Context for ID lookups:**
    ${context}

    **Recent Conversation History:**
    ${historyContext}

    **New User Request:** "${message}"

    **Instructions:**
    1.  **Detect Action:** What is the user's primary intent? Use \`CREATE_HABIT\` for new habits and \`UPDATE_HABIT\` to toggle today's status.
    2.  **Extract Parameters:** Get all necessary info. For updates/links, it's crucial to find the item's ID from the context and put it in \`targetId\`.
    3.  **Formulate Reply:** ALWAYS create a short, friendly, natural Persian response in the \`reply\` field. This is shown to the user after the action succeeds.
    4.  **Final Output:** Your output must be ONLY a JSON object matching the defined schema.
  `;
};

// --- Main Deno Server ---
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!API_KEY) {
      throw new Error("Missing GEMINI_API_KEY environment variable.");
    }
      
    const { message, history } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 1. Fetch fresh data from the database
    const [
        { data: tasks, error: tasksError },
        { data: notes, error: notesError },
        { data: projects, error: projectsError },
        { data: dbHabits, error: habitsError }
    ] = await Promise.all([
        supabaseClient.from('tasks').select('id, title, project_id'),
        supabaseClient.from('notes').select('id, title'),
        supabaseClient.from('projects').select('id, title'),
        supabaseClient.from('habits').select('id, name') // Fetch 'name' instead of 'title'
    ]);

    if (tasksError || notesError || projectsError || habitsError) throw tasksError || notesError || projectsError || habitsError;

    // 2. Understand User Intent (with Retry Logic)
    const intentPrompt = generateIntentPrompt(message, history, tasks as any, notes as any, projects as any, dbHabits as any);
    
    let intentResponse: GenerateContentResponse | null = null;
    let lastError: Error | null = null;
    const maxRetries = 3;

    for (let i = 0; i < maxRetries; i++) {
        try {
            intentResponse = await ai.models.generateContent({
              model: model,
              contents: intentPrompt,
              config: {
                responseMimeType: "application/json",
                responseSchema: intentSchema,
                systemInstruction: systemInstruction,
              },
            });
            // If successful, break the loop
            break; 
        } catch (error) {
            lastError = error;
            // Check if it's the specific "overloaded" error
            if (error.message && (error.message.includes('503') || error.message.toLowerCase().includes('overloaded'))) {
                console.warn(`Attempt ${i + 1} failed with 503 error. Retrying in ${i + 1} second(s)...`);
                await sleep((i + 1) * 1000); // Exponential backoff
            } else {
                // If it's another error, don't retry, just throw
                throw error;
            }
        }
    }

    if (!intentResponse) {
        throw lastError || new Error("AI model failed to respond after multiple retries.");
    }
    
    let aiResult: AIResponse;
    try {
      aiResult = JSON.parse(intentResponse.text.trim());
    } catch (e) {
        console.error("Failed to parse AI response:", intentResponse.text);
        throw new Error("پاسخ هوش مصنوعی قابل پردازش نبود. لطفاً کمی واضح‌تر بیان کنید.");
    }
    
    const { action, params, scheduledTaskIds } = aiResult;
    
    // 3. Execute Command Directly
    switch (action) {
      case 'CREATE_TASK':
        if (params?.title) {
          const { error } = await supabaseClient.rpc('create_task_with_tags', {
            title: params.title,
            description: params.description || null,
            project_id: params.projectId || null,
            due_date: params.dueDate || null,
            priority: params.priority || 'متوسط',
            tags: params.tags || []
          });
          if (error) throw error;
        }
        break;
      case 'CREATE_NOTE':
        if (params?.title) {
          const { error } = await supabaseClient.rpc('create_note_with_tags', {
            title: params.title,
            content: params.content || null,
            project_id: params.projectId || null,
            tags: params.tags || []
          });
          if (error) throw error;
        }
        break;
      case 'CREATE_PROJECT':
        if (params?.title) {
          await supabaseClient.from('projects').insert({ 
            user_id: user.id, title: params.title, description: params.description, color: params.color || 'sky', priority: params.priority || 'متوسط' 
          }).throwOnError();
        }
        break;
      case 'CREATE_HABIT':
        if (params?.name) {
            await supabaseClient.from('habits').insert({
                user_id: user.id, name: params.name, description: params.description // Insert into 'name' column
            }).throwOnError();
        }
        break;
      case 'UPDATE_TASK':
        if (params?.targetId) {
          const { targetId, reply, ...updates } = params;
          const updatesForDb: { [key: string]: any } = {};
          
          if (updates.title !== undefined) updatesForDb.title = updates.title;
          if (updates.description !== undefined) updatesForDb.description = updates.description;
          if (updates.priority !== undefined) updatesForDb.priority = updates.priority;
          if (updates.projectId !== undefined) updatesForDb.project_id = updates.projectId;
          if (updates.dueDate !== undefined) updatesForDb.due_date = updates.dueDate;
          
          if (Object.keys(updatesForDb).length > 0) {
              await supabaseClient.from('tasks').update(updatesForDb).eq('id', targetId).throwOnError();
          }
        }
        break;
      case 'UPDATE_HABIT':
        if (params?.targetId) {
            const today = new Date().toISOString().slice(0, 10);
            const { data: existing, error: selectError } = await supabaseClient.from('habit_completions').select('id').eq('habit_id', params.targetId).eq('completion_date', today).maybeSingle();
            if (selectError && selectError.code !== 'PGRST116') throw selectError;

            if (existing) {
                await supabaseClient.from('habit_completions').delete().eq('id', existing.id).throwOnError();
            } else {
                await supabaseClient.from('habit_completions').insert({ user_id: user.id, habit_id: params.targetId, completion_date: today }).throwOnError();
            }
        }
        break;
      case 'PLAN_DAY':
        if (scheduledTaskIds && scheduledTaskIds.length > 0) {
          const todayStr = new Date().toISOString();
          await supabaseClient.from('tasks').update({ due_date: todayStr }).in('id', scheduledTaskIds).throwOnError();
        }
        break;
      case 'CHAT':
      case 'SEARCH':
        // No DB action needed, just return the reply
        break;
    }

    // 4. Return Final Confirmation
    return new Response(JSON.stringify({ reply: params?.reply || "انجام شد!" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Edge Function Error:", error);
    return new Response(JSON.stringify({ error: error.message || 'مشکلی در سرور پیش آمد.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
