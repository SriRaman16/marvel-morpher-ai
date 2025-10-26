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

    // Step 1: Submit face swap task
    const submitResponse = await fetch('https://api-b.fotor.com/v1/aiart/faceswap', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FOTOR_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userImageUrl: userImage,
        templateImageUrl: characterImage,
      }),
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error('Fotor API submit error:', submitResponse.status, errorText);
      throw new Error(`Fotor API error: ${submitResponse.status} - ${errorText}`);
    }

    const submitData = await submitResponse.json();
    console.log('Fotor task submitted:', submitData);

    if (submitData.code !== '000') {
      throw new Error(`Fotor API error: ${submitData.msg}`);
    }

    const taskId = submitData.data.taskId;

    // Step 2: Poll for task completion
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max wait time
    let taskStatus = 0;
    let resultUrl = '';

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

      const statusResponse = await fetch(
        `https://api-b.fotor.com/v1/aiart/tasks/${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${FOTOR_API_KEY}`,
          },
        }
      );

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        console.error('Fotor task status error:', statusResponse.status, errorText);
        throw new Error(`Failed to check task status: ${statusResponse.status}`);
      }

      const statusData = await statusResponse.json();
      console.log(`Task status check (attempt ${attempts + 1}):`, statusData);

      if (statusData.code !== '000') {
        throw new Error(`Task status error: ${statusData.msg}`);
      }

      taskStatus = statusData.data.status;

      if (taskStatus === 1) {
        // Task completed
        resultUrl = statusData.data.resultUrl;
        console.log('Task completed successfully, result URL:', resultUrl);
        break;
      } else if (taskStatus === 2) {
        // Task failed
        throw new Error('Face swap task failed');
      }

      attempts++;
    }

    if (taskStatus !== 1) {
      throw new Error('Task timed out waiting for completion');
    }

    // Step 3: Fetch the result image and convert to base64
    const imageResponse = await fetch(resultUrl);
    if (!imageResponse.ok) {
      throw new Error('Failed to fetch result image');
    }

    const imageBlob = await imageResponse.arrayBuffer();
    const base64Image = `data:image/jpeg;base64,${btoa(
      new Uint8Array(imageBlob).reduce((data, byte) => data + String.fromCharCode(byte), '')
    )}`;

    return new Response(
      JSON.stringify({ 
        transformedImage: base64Image,
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
