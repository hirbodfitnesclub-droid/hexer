
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenAI } from 'https://esm.sh/@google/genai';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

declare const Deno: any;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { type, id, content } = await req.json();
    
    if (!content || !id || !type) {
         return new Response(JSON.stringify({ message: "Invalid payload" }), { status: 400, headers: corsHeaders });
    }

    const API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!API_KEY) throw new Error("Missing GEMINI_API_KEY");
    
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    
    // Generate embedding using text-embedding-004
    // FIX: Parameter MUST be 'contents' (plural) for the new SDK
    const response = await ai.models.embedContent({
        model: 'text-embedding-004',
        contents: content, 
    });
    
    const embedding = response.embedding.values;

    // Use SERVICE_ROLE_KEY as configured by the user
    const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY');
    if (!SERVICE_ROLE_KEY) throw new Error("Missing SERVICE_ROLE_KEY");

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      SERVICE_ROLE_KEY
    );

    const table = type === 'task' ? 'tasks' : 'notes';
    
    const { error } = await supabaseClient
        .from(table)
        .update({ embedding })
        .eq('id', id);

    if (error) throw error;

    return new Response(JSON.stringify({ message: "Vectorized successfully" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Vectorize Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
