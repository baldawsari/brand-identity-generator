import { GoogleGenAI, Type } from '@google/genai';

// This is a Vercel Edge Function (or Serverless Function)
// It holds the real Gemini API key server-side.

export const config = {
  runtime: 'edge', // Use Edge Runtime for best performance
};

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { action, payload } = await req.json();

    let result: any;

    switch (action) {
      case 'generateBrandIdentity':
        result = await generateBrandIdentity(payload);
        break;

      case 'buildIdentityFromLogo':
        // Note: File uploads are trickier in Edge Functions.
        // For now, recommend BYOK when users upload logos.
        return new Response(
          JSON.stringify({ error: 'Logo upload analysis is only supported in BYOK mode for now.' }),
          { status: 400 }
        );

      case 'generateImage':
        result = await generateImageProxy(payload);
        break;

      default:
        return new Response(`Unknown action: ${action}`, { status: 400 });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Proxy error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500 }
    );
  }
}

// --- Proxy implementations ---

async function generateBrandIdentity(payload: any) {
  const { mission, lang, companyName, logoDescription } = payload;

  const languageInstruction = lang === 'ar' ? 'Generate the output in Arabic.' : 'Generate the output in English.';

  const prompt = `
    Based on the following company mission, generate a complete brand identity.
    ${languageInstruction}

    Mission: "${mission}"
    ${companyName ? `Company Name: "${companyName}"` : ''}
    ${logoDescription ? `Logo Concept: "${logoDescription}"` : ''}
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: brandIdentitySchema,
      temperature: 0.2,
    },
  });

  return JSON.parse(response.text.trim());
}

async function generateImageProxy(payload: any) {
  const { prompt, colors } = payload;

  let fullPrompt = `${prompt}, vector logo, solid clean background, high resolution, minimalist`;
  if (colors?.length) {
    fullPrompt += `. The color palette should primarily feature these descriptive colors: ${colors.join(', ')}.`;
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts: [{ text: fullPrompt }] },
    config: {
      imageConfig: {
        aspectRatio: '1:1',
        imageSize: '1K',
      },
    },
  });

  const part = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
  if (part?.inlineData) {
    return { image: `data:image/png;base64,${part.inlineData.data}` };
  }

  throw new Error('Image generation did not return an image');
}

// Re-use the schema from the frontend (simplified version)
const brandIdentitySchema = {
  type: Type.OBJECT,
  properties: {
    companyName: { type: Type.STRING },
    logo: {
      type: Type.OBJECT,
      properties: {
        prompt: { type: Type.STRING },
        style: { type: Type.STRING },
      },
      required: ['prompt', 'style'],
    },
    logoConcepts: { type: Type.ARRAY, items: { type: Type.STRING } },
    colorPalette: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          hex: { type: Type.STRING },
          name: { type: Type.STRING },
          usage: { type: Type.STRING },
        },
        required: ['hex', 'name', 'usage'],
      },
    },
    fontPairings: {
      type: Type.OBJECT,
      properties: {
        header: { type: Type.STRING },
        body: { type: Type.STRING },
        notes: { type: Type.STRING },
      },
      required: ['header', 'body', 'notes'],
    },
  },
  required: ['companyName', 'logo', 'logoConcepts', 'colorPalette', 'fontPairings'],
};