
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenAI, Type } from 'https://esm.sh/@google/genai';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

declare const Deno: any;

const API_KEY = Deno.env.get('GEMINI_API_KEY');
const ai = new GoogleGenAI({ apiKey: API_KEY });

// Schema for JSON output
const intentSchema = {
  type: Type.OBJECT,
  properties: {
    action: {
      type: Type.STRING,
      enum: ["CREATE_TASK", "CREATE_NOTE", "CREATE_PROJECT", "CREATE_HABIT", "UPDATE_TASK", "UPDATE_NOTE", "UPDATE_HABIT", "CHAT"],
    },
    params: {
      type: Type.OBJECT,
      nullable: true,
      properties: {
        title: { type: Type.STRING, nullable: true },
        name: { type: Type.STRING, description: "Name for habit", nullable: true },
        description: { type: Type.STRING, nullable: true },
        content: { type: Type.STRING, nullable: true },
        tags: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true },
        targetId: { type: Type.STRING, description: "ID of item to update", nullable: true },
        projectId: { type: Type.STRING, nullable: true },
        dueDate: { type: Type.STRING, description: "YYYY-MM-DD", nullable: true },
        priority: { type: Type.STRING, enum: ["medium", "high", "low"], nullable: true },
        color: { type: Type.STRING, nullable: true },
        reply: { type: Type.STRING, description: "Conversational Persian response" }
      },
      required: ["reply"]
    },
  },
  required: ["action"],
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, history, mode } = await req.json();
    
    // Create Supabase Client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    let context = "";
    let citations: any[] = [];
    
    // --- MODE 1: MEMORY (RAG) ---
    if (mode === 'memory' || mode === 'auto') {
        // 1. Generate Embedding for query
        const embedRes = await ai.models.embedContent({
            model: 'text-embedding-004',
            contents: message, 
        });
        const embedding = embedRes.embedding.values;

        // 2. Perform Semantic Search via RPC
        const { data: documents, error } = await supabaseClient.rpc('match_documents', {
            query_embedding: embedding,
            match_threshold: 0.5, // 50% similarity
            match_count: 5
        });

        if (documents && documents.length > 0) {
            citations = documents.map((doc: any) => ({
                id: doc.id,
                type: doc.type,
                title: doc.content.split(' ').slice(0, 5).join(' ') + '...', // First 5 words as rough title
                similarity: doc.similarity
            }));

            context += "\n\nRelevant Info Found in Database:\n";
            documents.forEach((doc: any) => {
                context += `- [${doc.type.toUpperCase()}] ${doc.content} (ID: ${doc.id})\n`;
            });
        } else if (mode === 'memory') {
            context += "\n\nNo relevant memory found in database.";
        }
    }

    // --- MODE 2: ACTION (Direct Schema Injection) ---
    // Fetch minimal project list for ID mapping
    if (mode === 'action' || mode === 'auto') {
         const { data: projects } = await supabaseClient.from('projects').select('id, title');
         if (projects && projects.length > 0) {
             context += `\n\nAvailable Projects (use these IDs): ${JSON.stringify(projects)}`;
         }
    }
    
    // Construct System Instruction
    const finalSystemInstruction = `
    You are an AI assistant for a task manager. 
    Current Mode: ${mode.toUpperCase()}
    
    Rules:
    1. Respond in Persian (Farsi).
    2. Output ONLY JSON matching the schema.
    3. If Mode is ACTION: Focus on creating/updating items.
    4. If Mode is MEMORY: Use the provided "Relevant Info" to answer questions.
    5. If Mode is AUTO: Decide based on context.
    6. For 'priority', map user input to 'high', 'medium', or 'low'.
    
    Context:
    ${context}
    `;

    // Call Gemini
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
            ...history.slice(-3).map((h: any) => ({ role: h.sender === 'user' ? 'user' : 'model', parts: [{ text: h.text }] })),
            { role: 'user', parts: [{ text: message }] }
        ],
        config: {
            responseMimeType: "application/json",
            responseSchema: intentSchema,
            systemInstruction: finalSystemInstruction,
        }
    });

    const aiResult = JSON.parse(response.text.trim());
    const { action, params } = aiResult;

    let actionResult = null;

    // Execute Action (Only if not CHAT)
    if (action !== 'CHAT') {
         if (action === 'CREATE_TASK' && params?.title) {
            const { data } = await supabaseClient.rpc('create_task_with_tags', {
                title: params.title, description: params.description, project_id: params.projectId, due_date: params.dueDate, priority: params.priority || 'medium', tags: params.tags || []
            });
            if (data) actionResult = { type: 'task', operation: 'create', data: data };
         }
         else if (action === 'CREATE_NOTE' && params?.title) {
             const { data } = await supabaseClient.rpc('create_note_with_tags', {
                 title: params.title, content: params.content, project_id: params.projectId, tags: params.tags || []
             });
             if (data) actionResult = { type: 'note', operation: 'create', data: data };
         }
         else if (action === 'CREATE_PROJECT' && params?.title) {
             const { data } = await supabaseClient.from('projects').insert({ user_id: user.id, title: params.title, description: params.description, color: params.color || 'sky', priority: params.priority || 'medium' }).select().single();
             if (data) actionResult = { type: 'project', operation: 'create', data: data };
         }
    }
    
    return new Response(JSON.stringify({ 
        reply: params?.reply || "انجام شد.",
        citations: citations,
        actionResult: actionResult
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("AI Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
