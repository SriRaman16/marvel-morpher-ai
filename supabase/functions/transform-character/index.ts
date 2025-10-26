import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userImage, characterImage } = await req.json();
    const FOTOR_API_KEY = Deno.env.get('FOTOR_API_KEY');

    if (!FOTOR_API_KEY) {
      throw new Error('FOTOR_API_KEY is not configured');
    }

    console.log('Starting Fotor face swap transformation...');

    // Call Fotor API for face swap
    const response = await fetch('https://developer-api.fotor.com/api/v1/face_swap', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FOTOR_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target_image: characterImage, // Base64 string of the character body
        swap_image: userImage,         // Base64 string of the user's face
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Fotor API error:', response.status, errorText);
      throw new Error(`Fotor API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Fotor transformation successful');

    // Return the transformed image
    return new Response(
      JSON.stringify({ 
        transformedImage: data.result_image || data.image,
        success: true 
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in transform-character function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        success: false 
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
