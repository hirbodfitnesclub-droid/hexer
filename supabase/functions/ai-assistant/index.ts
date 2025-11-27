

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
        frequency: { type: Type.STRING, enum: ["daily", "weekly"], nullable: true },
        target_count: { type: Type.INTEGER, nullable: true },
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
        try {
            const embedRes = await ai.models.embedContent({
                model: 'text-embedding-004',
                contents: message, 
            });
            
            let embeddingValues = null;

            // Robust Check for both plural and singular response formats
            if (embedRes.embeddings && embedRes.embeddings.length > 0 && embedRes.embeddings[0].values) {
                embeddingValues = embedRes.embeddings[0].values;
            } else if (embedRes.embedding && embedRes.embedding.values) {
                embeddingValues = embedRes.embedding.values;
            }
            
            if (embeddingValues) {
                // 2. Perform Semantic Search via RPC
                const { data: documents, error } = await supabaseClient.rpc('match_documents', {
                    query_embedding: embeddingValues,
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
            } else {
                console.warn("Embedding generation returned no values (checked both singular and plural).");
            }
        } catch (embedError) {
             console.error("Embedding Error:", embedError);
             // Continue without RAG context if embedding fails
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
    7. For habits, infer 'name', 'frequency' (default daily), and 'target_count' (default 1).
    8. IMPORTANT: If user gives long text for a note but no title, generate a short summary title.
    
    Context:
    ${context}
    `;

    // Call Gemini
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-lite',
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
         // --- CREATE TASK ---
         if (action === 'CREATE_TASK') {
            const taskTitle = params.title || "تسک جدید"; // Fallback title
            const { data, error } = await supabaseClient.rpc('create_task_with_tags', {
                title: taskTitle, 
                description: params.description || null, 
                project_id: params.projectId || null, 
                due_date: params.dueDate || null, 
                priority: params.priority || 'medium', 
                tags: params.tags || []
            });
            
            if (error) throw new Error(`DB Error (Create Task): ${error.message}`);
            if (data) actionResult = { type: 'task', operation: 'create', data: data };
         }
         // --- CREATE NOTE ---
         else if (action === 'CREATE_NOTE') {
             // Smart mapping: If content is missing but description exists, use description.
             const finalContent = params.content || params.description || "";
             // Smart mapping: If title is missing, generate one from content.
             const finalTitle = params.title || (finalContent.length > 20 ? finalContent.substring(0, 20) + "..." : finalContent) || "یادداشت جدید";

             const { data, error } = await supabaseClient.rpc('create_note_with_tags', {
                 title: finalTitle, 
                 content: finalContent || null, 
                 project_id: params.projectId || null, 
                 tags: params.tags || []
             });
             
             if (error) throw new Error(`DB Error (Create Note): ${error.message}`);
             if (data) actionResult = { type: 'note', operation: 'create', data: data };
         }
         // --- CREATE PROJECT ---
         else if (action === 'CREATE_PROJECT') {
             const projTitle = params.title || "پروژه جدید";
             const { data, error } = await supabaseClient.from('projects').insert({ 
                 user_id: user.id, 
                 title: projTitle, 
                 description: params.description || null, 
                 color: params.color || 'sky', 
                 priority: params.priority || 'medium' 
             }).select().single();
             
             if (error) throw new Error(`DB Error (Create Project): ${error.message}`);
             if (data) actionResult = { type: 'project', operation: 'create', data: data };
         }
         // --- CREATE HABIT ---
         else if (action === 'CREATE_HABIT') {
             const habitName = params.name || params.title || "عادت جدید";
             const { data, error } = await supabaseClient.from('habits').insert({ 
                 user_id: user.id, 
                 name: habitName, 
                 description: params.description || null, 
                 frequency: params.frequency || 'daily',
                 target_count: params.target_count || 1 
             }).select().single();
             
             if (error) throw new Error(`DB Error (Create Habit): ${error.message}`);
             if (data) actionResult = { type: 'habit', operation: 'create', data: data };
         }
         // --- UNHANDLED ACTION ---
         else {
             // If the AI output an action we didn't handle above (e.g. UPDATE_TASK without implementation)
             // We shouldn't fail silently.
             // For now, we only implemented CREATES in this version. 
             // If it's an UPDATE, we might skip logic but we shouldn't claim "Done" unless intended.
             if (action.startsWith('CREATE')) {
                 throw new Error(`Failed to execute action ${action}: Params might be invalid.`);
             }
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
    // Return a 500 error with the message so the frontend can display it
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
