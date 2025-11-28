
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from 'https://esm.sh/@google/genai';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

declare const Deno: any;

const API_KEY = Deno.env.get('GEMINI_API_KEY');
const ai = new GoogleGenAI({ apiKey: API_KEY });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, history, mode, audio, image } = await req.json();

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
    // Skip RAG if media is present, focus on media analysis first
    if ((mode === 'memory' || mode === 'auto') && !audio && !image && message) {
      try {
        const embedRes = await ai.models.embedContent({
          model: 'text-embedding-004',
          contents: message,
        });

        let embeddingValues = null;
        if (embedRes.embeddings && embedRes.embeddings.length > 0 && embedRes.embeddings[0].values) {
          embeddingValues = embedRes.embeddings[0].values;
        } else if (embedRes.embedding && embedRes.embedding.values) {
          embeddingValues = embedRes.embedding.values;
        }

        if (embeddingValues) {
          const { data: documents, error } = await supabaseClient.rpc('match_documents', {
            query_embedding: embeddingValues,
            match_threshold: 0.5,
            match_count: 5
          });

          if (documents && documents.length > 0) {
            citations = documents.map((doc: any) => ({
              id: doc.id,
              type: doc.type,
              title: doc.content.split(' ').slice(0, 5).join(' ') + '...',
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
      } catch (embedError) {
        console.error("Embedding Error:", embedError);
      }
    }

    // --- MODE 2: ACTION (Context Injection) ---
    if (mode === 'action' || mode === 'auto') {
      const { data: projects } = await supabaseClient.from('projects').select('id, title');
      if (projects && projects.length > 0) {
        context += `\n\nAvailable Projects (use these IDs for 'projectId'): ${JSON.stringify(projects)}`;
      }
    }

    // Calculate Today's Date for Relative Date Logic
    const today = new Date();
    const todayStr = today.toLocaleDateString('en-CA'); // YYYY-MM-DD format
    const dayName = today.toLocaleDateString('fa-IR', { weekday: 'long' });

    const systemPrompt = `
    You are an intelligent Persian AI assistant.
    Current Mode: ${mode.toUpperCase()}
    Today's Date: ${todayStr} (${dayName})

    **INSTRUCTIONS:**
    1. **Transcribe/OCR First:** 
       - If AUDIO is present: Write EXACTLY what you hear.
       - If IMAGE is present: Perform OCR. Read the text visible in the image. Describe the visual context briefly if relevant.
       - Store this in the 'transcription' field.
    2. **Analyze:** Based on the transcription (or text), identify ALL user intents.
       - If analysing a SCREENSHOT (e.g., chat app, notes app): Ignore UI elements (battery, time, back buttons). Focus on the *content* of the messages or notes. Extract actionable items.
    3. **Decompose:** Break complex requests into a list of actions.
       - "Buy milk and remind me to call Ali" -> 2 actions: CREATE_TASK("Buy milk"), CREATE_TASK("Call Ali").
    4. **Dates:** Convert relative dates (tomorrow, next friday) to YYYY-MM-DD using Today's Date.
    5. **Clean Titles:** If a date is extracted to 'dueDate', DO NOT include the time word in the 'title'.
    6. **Response Format:** You MUST return a VALID JSON object (no markdown, no code blocks) with this exact structure:

    {
      "transcription": "Text of what was said/written/seen",
      "reply": "Conversational Persian response summarizing what was done",
      "actions": [
        {
          "action": "CREATE_TASK" | "CREATE_NOTE" | "CREATE_PROJECT" | "CREATE_HABIT" | "CHAT",
          "params": {
            "title": "Clean title",
            "description": "Optional details",
            "dueDate": "YYYY-MM-DD" (or null),
            "priority": "medium" | "high" | "low",
            "projectId": "UUID" (or null),
            "tags": ["tag1", "tag2"],
            "content": "For notes",
            "name": "For habits",
            "frequency": "daily" | "weekly",
            "target_count": 1
          }
        }
      ]
    }
    
    **CONTEXT:**
    ${context}
    `;

    const userMessageParts: any[] = [];
    if (message) userMessageParts.push({ text: message });
    if (audio) {
      userMessageParts.push({
        inlineData: {
          mimeType: audio.mimeType,
          data: audio.data
        }
      });
    }
    if (image) {
      userMessageParts.push({
        inlineData: {
          mimeType: image.mimeType,
          data: image.data
        }
      });
    }

    // Safety Settings: BLOCK_NONE to prevent false positives on audio/images
    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: [
        ...history.slice(-3).map((h: any) => ({ role: h.sender === 'user' ? 'user' : 'model', parts: [{ text: h.text }] })),
        { role: 'user', parts: userMessageParts }
      ],
      config: {
        responseMimeType: 'application/json',
        // We rely on the system prompt for structure to keep Lite model stable.
        systemInstruction: systemPrompt,
        temperature: 0.0,
        maxOutputTokens: 8192,
        safetySettings: safetySettings
      }
    });

    const rawText = response.text;
    console.log("Raw Gemini Output:", rawText); 

    let aiResult;
    try {
        // Robust Parsing: Strip Markdown code blocks if present
        const cleanText = rawText?.replace(/```json\n?|\n?```/g, '').trim() || "{}";
        aiResult = JSON.parse(cleanText);
    } catch (e) {
        console.error("JSON Parse Error. Raw Text:", rawText);
        throw new Error("Failed to parse AI response. The model might have hallucinated or returned invalid JSON.");
    }

    const { actions, transcription, reply } = aiResult;
    
    const actionResults = [];
    if (actions && Array.isArray(actions)) {
        for (const item of actions) {
            const currentAction = item.action;
            const params = item.params || {};

            if (currentAction === 'CHAT') continue;

            try {
                let result = null;
                if (currentAction === 'CREATE_TASK') {
                    const taskTitle = params.title || "تسک جدید";
                    const { data, error } = await supabaseClient.rpc('create_task_with_tags', {
                        title: taskTitle,
                        description: params.description || null,
                        project_id: params.projectId || null,
                        due_date: params.dueDate || null,
                        priority: params.priority || 'medium',
                        tags: params.tags || []
                    });
                    if (error) throw error;
                    if (data) result = { type: 'task', operation: 'create', data: data };
                } 
                else if (currentAction === 'CREATE_NOTE') {
                    const finalContent = params.content || params.description || "";
                    const finalTitle = params.title || (finalContent.length > 20 ? finalContent.substring(0, 20) + "..." : finalContent) || "یادداشت جدید";
                    const { data, error } = await supabaseClient.rpc('create_note_with_tags', {
                        title: finalTitle,
                        content: finalContent || null,
                        project_id: params.projectId || null,
                        tags: params.tags || []
                    });
                    if (error) throw error;
                    if (data) result = { type: 'note', operation: 'create', data: data };
                }
                else if (currentAction === 'CREATE_PROJECT') {
                    const projTitle = params.title || "پروژه جدید";
                    const { data, error } = await supabaseClient.from('projects').insert({
                        user_id: user.id,
                        title: projTitle,
                        description: params.description || null,
                        color: params.color || 'sky',
                        priority: params.priority || 'medium'
                    }).select().single();
                    if (error) throw error;
                    if (data) result = { type: 'project', operation: 'create', data: data };
                }
                else if (currentAction === 'CREATE_HABIT') {
                    const habitName = params.name || params.title || "عادت جدید";
                    const { data, error } = await supabaseClient.from('habits').insert({
                        user_id: user.id,
                        name: habitName,
                        description: params.description || null,
                        frequency: params.frequency || 'daily',
                        target_count: params.target_count || 1
                    }).select().single();
                    if (error) throw error;
                    if (data) result = { type: 'habit', operation: 'create', data: data };
                }

                if (result) actionResults.push(result);
            } catch (actionError) {
                console.error(`Failed to execute action ${currentAction}:`, actionError);
            }
        }
    }

    return new Response(JSON.stringify({
        reply: reply || "انجام شد.",
        citations: citations,
        actionResults: actionResults,
        transcription: transcription 
    }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
    });

  } catch (error) {
    console.error("AI Assistant Logic Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
