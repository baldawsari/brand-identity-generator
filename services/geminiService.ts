import { GoogleGenAI, Type, Chat, Part, Modality } from "@google/genai";
import type { BrandIdentity, BrandAssets } from '../types';

// Helper to get the AI client with the most up-to-date API key from the environment
const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
};

// Utility to automatically retry failed requests due to transient errors (e.g., model overload)
const withRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    // Check for common transient error statuses
    const isTransientError = error.status === 503 || error.status === 'UNAVAILABLE' || (error.message && error.message.includes('overloaded'));
    if (retries > 0 && isTransientError) {
      console.warn(`Request failed, retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(res => setTimeout(res, delay));
      return withRetry(fn, retries - 1, delay * 2); // Exponential backoff
    }
    throw error;
  }
};


// Utility to convert File to a GoogleGenerativeAI.Part
async function fileToGenerativePart(file: File): Promise<Part> {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
}


const brandIdentitySchema = {
  type: Type.OBJECT,
  properties: {
    companyName: {
      type: Type.STRING,
      description: "A creative and fitting name for the company based on its mission."
    },
    logo: {
      type: Type.OBJECT,
      properties: {
        prompt: {
          type: Type.STRING,
          description: "A detailed, visually descriptive prompt for an AI image generator to create an ICON or SYMBOL ONLY (NO TEXT, NO LETTERS, NO COMPANY NAME). Describe the visual elements, shapes, and symbolism. The company name will be added programmatically as text, so the logo mark should be purely graphical."
        },
        style: {
          type: Type.STRING,
          description: "A short phrase describing the logo style (e.g., 'Minimalist Geometric', 'Organic Hand-drawn')."
        }
      },
      required: ["prompt", "style"]
    },
    logoConcepts: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING
      },
      description: "A list of 2-3 short descriptions for the logo's core concepts or elements (e.g., 'A simplified lettermark of the initials', 'An icon representing the core product')."
    },
    colorPalette: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          hex: {
            type: Type.STRING,
            description: "The hexadecimal color code (e.g., '#FFFFFF')."
          },
          name: {
            type: Type.STRING,
            description: "A descriptive name for the color (e.g., 'Midnight Blue', 'Mint Green')."
          },
          usage: {
            type: Type.STRING,
            description: "A brief note on how to use this color (e.g., 'Primary background', 'Accent and call-to-actions')."
          }
        },
        required: ["hex", "name", "usage"]
      },
      description: "A palette of 5 complementary colors."
    },
    fontPairings: {
      type: Type.OBJECT,
      properties: {
        header: {
          type: Type.STRING,
          description: "The name of a Google Font for headers (e.g., 'Montserrat', 'Tajawal')."
        },
        body: {
          type: Type.STRING,
          description: "The name of a Google Font for body text that pairs well with the header font (e.g., 'Lato', 'Cairo')."
        },
        notes: {
          type: Type.STRING,
          description: "A brief justification for why these fonts work well together."
        }
      },
      required: ["header", "body", "notes"]
    },
    designSystem: {
      type: Type.OBJECT,
      properties: {
        layoutStyle: {
          type: Type.STRING,
          enum: ["minimal", "bold", "corporate"],
          description: "The overall visual style: 'minimal' for clean/modern, 'bold' for impactful/strong, 'corporate' for professional/traditional."
        },
        titleAlignment: {
          type: Type.STRING,
          enum: ["left", "center", "right"],
          description: "Preferred text alignment for headings and titles."
        },
        borderRadius: {
          type: Type.NUMBER,
          description: "Default corner radius in pixels for UI elements (0 for sharp, 4-8 for subtle, 12-16 for rounded)."
        },
        accentPosition: {
          type: Type.STRING,
          enum: ["top", "bottom", "left", "right"],
          description: "Where accent elements (lines, bars, highlights) should appear by default."
        }
      },
      required: ["layoutStyle", "titleAlignment", "borderRadius", "accentPosition"]
    }
  },
  required: ["companyName", "logo", "logoConcepts", "colorPalette", "fontPairings", "designSystem"]
};


export const generateBrandIdentity = async (mission: string, lang: 'en' | 'ar', companyName?: string, logoDescription?: string): Promise<BrandIdentity> => {
  return withRetry(async () => {
    const ai = getAiClient();
    const languageInstruction = lang === 'ar'
      ? "Generate the output in Arabic."
      : "Generate the output in English.";

    // Unified font instruction
    const fontInstruction = "For 'fontPairings', select Google Fonts that match the brand style and support the primary language of the brand content.";

    let prompt = `
      Based on the following company mission, generate a complete brand identity.
      The identity should be modern, professional, and appealing.
      ${languageInstruction}

      **Important Typography Instructions:**
      ${fontInstruction}

      Mission: "${mission}"
    `;

    if (companyName) {
      prompt += `\n\n**Company Name:** You MUST use the following company name exactly as provided: "${companyName}". Do not generate a new one.`;
    } else {
      prompt += `\n\n**Company Name:** Generate a creative and fitting name for the company.`;
    }

    if (logoDescription) {
      prompt += `\n\n**Logo Concept:** The user has provided a concept for the logo. You MUST base your detailed logo generation prompt on this concept: "${logoDescription}". Expand on it to create a rich, descriptive prompt suitable for an AI image generator.`;
    }

    prompt += `\n\nProvide the output in a structured JSON format.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: brandIdentitySchema,
        temperature: 0.2
      }
    });

    const jsonString = response.text.trim();
    const brandIdentity = JSON.parse(jsonString);
    return brandIdentity;
  });
};

export const buildIdentityFromLogo = async (mission: string, companyName: string, logoFile: File, lang: 'en' | 'ar'): Promise<BrandIdentity> => {
  return withRetry(async () => {
    const ai = getAiClient();
    const languageInstruction = lang === 'ar' ? "Generate all text fields in Arabic." : "Generate all text fields in English.";
    const fontInstruction = "For 'fontPairings', select Google Fonts that aesthetically match the provided logo and support the brand's language.";

    const logoPart = await fileToGenerativePart(logoFile);

    const contents = {
      parts: [
        {
          text: `Analyze the attached logo image for a company named "${companyName}" with the mission: "${mission}".
                Based on the logo's style (e.g., modern, classic, playful) and colors, generate a complete brand identity.

                **Instructions:**
                1.  **companyName**: Use the provided name: "${companyName}".
                2.  **logo**: For the 'prompt', describe the provided logo. For the 'style', describe its visual style.
                3.  **logoConcepts**: Generate 2-3 logo concepts inspired by the logo.
                4.  **colorPalette**: Extract the 5 most dominant and complementary colors from the logo itself.
                5.  **fontPairings**: ${fontInstruction}
                6.  **Language**: ${languageInstruction}

                Provide the output in a structured JSON format.`},
        logoPart
      ]
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: brandIdentitySchema
      }
    });

    const jsonString = response.text.trim();
    const brandIdentity = JSON.parse(jsonString);
    return brandIdentity;
  });
};

export const rebrandLogoAndBuildIdentity = async (mission: string, companyName: string, logoFile: File, lang: 'en' | 'ar', rebrandNotes?: string): Promise<BrandIdentity> => {
  return withRetry(async () => {
    const ai = getAiClient();
    const languageInstruction = lang === 'ar' ? "Generate all text fields in Arabic." : "Generate all text fields in English.";
    const fontInstruction = "For 'fontPairings', select Google Fonts that aesthetically match the NEW modernized logo concept and support the brand's language.";

    const logoPart = await fileToGenerativePart(logoFile);

    let rebrandDirection = '';
    if (rebrandNotes) {
      rebrandDirection = `The user has provided specific direction for the rebrand: "${rebrandNotes}". You must adhere to these notes closely when creating the new logo concept.`;
    }

    const contents = {
      parts: [
        {
          text: `You are an expert branding consultant tasked with a rebranding project.
                    Analyze the attached existing logo for a company named "${companyName}" with the mission: "${mission}".

                    Your primary goal is to generate a concept for a **NEW, modernized logo**. This new concept should be outputted as a detailed, visually descriptive prompt for an AI image generator in the 'logo.prompt' field.
                    ${rebrandDirection}
                    
                    After establishing the new logo concept, build the rest of the brand identity (colors, fonts, etc.) to perfectly complement this **NEW** logo.

                    **Instructions:**
                    1.  **companyName**: Use the provided name: "${companyName}".
                    2.  **logo**: Create a 'prompt' for a NEW, modern logo inspired by the old one. Describe the 'style' of this new logo.
                    3.  **logoConcepts**: Generate logo concepts inspired by the NEW logo concept.
                    4.  **colorPalette**: Create a modern color palette that fits the NEW logo concept. It can be inspired by the original colors but should feel fresh.
                    5.  **fontPairings**: ${fontInstruction}
                    6.  **Language**: ${languageInstruction}

                    Provide the output in a structured JSON format.`
        },
        logoPart
      ]
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: brandIdentitySchema,
        temperature: 0.2
      }
    });

    const jsonString = response.text.trim();
    const brandIdentity = JSON.parse(jsonString);
    return brandIdentity;
  });
};


export const translateBrandIdentity = async (identity: BrandIdentity, targetLang: 'en' | 'ar', adaptTypography: boolean): Promise<BrandIdentity> => {
  return withRetry(async () => {
    const ai = getAiClient();
    const languageInstruction = targetLang === 'ar'
      ? "Translate and adapt the provided brand identity into Arabic."
      : "Translate and adapt the provided brand identity into English.";

    let fontTranslationInstruction: string;
    if (adaptTypography) {
      fontTranslationInstruction = `Select a NEW pair of Google Fonts that have excellent support for ${targetLang === 'ar' ? 'Arabic' : 'Latin'} script. These new fonts should capture the same style and feeling as the original fonts. Translate the 'notes' to ${targetLang === 'ar' ? 'Arabic' : 'English'} to justify this new font pairing.`;
    } else {
      fontTranslationInstruction = "Keep the 'header' and 'body' font names exactly the same as in the original. You MUST NOT change the font names. Only translate the 'notes' field into the target language.";
    }

    // Create a copy to avoid mutating the original object, and remove the image data.
    const identityToTranslate = { ...identity };
    delete identityToTranslate.logoImage;



    const prompt = `
      Translate and adapt the following brand identity JSON object to the target language: ${targetLang}.
      ${languageInstruction}

      RULES:
      - Keep the original JSON structure perfectly intact.
      - Keep the values for "logo.prompt" and "colorPalette.*.hex" exactly the same as the original.
      - Translate the string values for: "companyName", "logo.style", "logoConcepts" (each item in the array), "colorPalette.*.name", and "colorPalette.*.usage".
      - **Typography Instructions:** ${fontTranslationInstruction}

      Original JSON to adapt:
      ${JSON.stringify(identityToTranslate, null, 2)}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: brandIdentitySchema
      }
    });

    const jsonString = response.text.trim();
    const translatedIdentity = JSON.parse(jsonString);
    return translatedIdentity;
  });
};


export const generateImage = async (prompt: string, colors?: string[]): Promise<string> => {
  return withRetry(async () => {
    const ai = getAiClient();
    let fullPrompt = `${prompt}, vector logo, solid clean background, high resolution, minimalist`;
    if (colors && colors.length > 0) {
      fullPrompt += `. The color palette should primarily feature these descriptive colors: ${colors.join(', ')}. Do not use or display any hex codes.`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: fullPrompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: '1:1',
          imageSize: '1K',
        },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const base64ImageBytes: string = part.inlineData.data;
        return `data:image/png;base64,${base64ImageBytes}`;
      }
    }
    throw new Error("Image generation did not return an image. This could be due to safety filters or a temporary issue.");
  });
};

export const generatePrimaryLogo = async (identity: BrandIdentity): Promise<string> => {
  const basePrompt = identity.logo.prompt;
  const colors = identity.colorPalette.map(c => c.name);

  // Generate primary logo only
  const primaryLogoUrl = await generateImage(basePrompt, colors);
  return primaryLogoUrl;
};

export const generateLogoMark = async (identity: BrandIdentity): Promise<string> => {
  const iconPrompt = `${identity.logo.prompt}.
    CRITICAL INSTRUCTIONS:
    - Create a clean, flat vector-style ICON/SYMBOL ONLY
    - Do NOT include any text, letters, words, or the company name
    - Use a solid white or transparent background
    - High contrast, simple shapes`;
  const colors = identity.colorPalette.map(c => c.name);
  return generateImage(iconPrompt, colors);
};

const logoRegenerationSchema = {
  type: Type.OBJECT,
  properties: {
    logo: brandIdentitySchema.properties.logo,
    logoConcepts: brandIdentitySchema.properties.logoConcepts,
  },
  required: ["logo", "logoConcepts"]
};

export const regenerateLogoAndConcepts = async (mission: string, companyName: string, lang: 'en' | 'ar'): Promise<{ logo: BrandIdentity['logo']; logoConcepts: BrandIdentity['logoConcepts'] }> => {
  return withRetry(async () => {
    const ai = getAiClient();
    const languageInstruction = lang === 'ar' ? "Generate the text fields in Arabic." : "Generate all text fields in English.";

    const prompt = `
      Based on the following company mission and name, generate a NEW and DIFFERENT creative concept for a logo.
      Do not repeat previous ideas. Aim for a fresh perspective.
      Company Name: "${companyName}"
      Mission: "${mission}"
      
      **Instructions:**
      1.  **logo**: Create a detailed, visually descriptive 'prompt' for an AI image generator to create a primary logo, and a short 'style' description.
      2.  **logoConcepts**: Generate 2-3 short descriptions for the new logo's elements or concepts.

      ${languageInstruction}
      Provide the output in a structured JSON format.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: logoRegenerationSchema,
        temperature: 0.2
      }
    });

    return JSON.parse(response.text.trim());
  });
};


export const generateMarketingAssets = async (
  companyName: string,
  logoFile: File,
  colors: string,
  fonts: { header: string, body: string },
  lang: 'en' | 'ar'
): Promise<BrandAssets> => {
  return withRetry(async () => {
    const ai = getAiClient();
    const languageInstruction = lang === 'ar' ? "The text on the assets should be in Arabic." : "The text on the assets should be in English.";
    const logoPart = await fileToGenerativePart(logoFile);

    const assetPromptsSchema = {
      type: Type.OBJECT,
      properties: {
        businessCardPrompt: { type: Type.STRING },
        letterheadPrompt: { type: Type.STRING },
        socialPostPrompt: { type: Type.STRING },
      },
      required: ["businessCardPrompt", "letterheadPrompt", "socialPostPrompt"]
    };

    const contents = {
      parts: [
        {
          text: `You are a brand designer. A client has provided their core brand assets:
                - Company Name: "${companyName}"
                - Logo: (attached)
                - Colors: ${colors}
                - Fonts: Header - ${fonts.header}, Body - ${fonts.body}

                Your task is to generate 3 detailed, visually descriptive prompts for an AI image generator to create marketing materials. The designs must be modern, professional, and strictly adhere to the provided brand assets. ${languageInstruction}
                
                **IMPORTANT RULE:** When you write the prompts, refer to colors by their descriptive names (e.g., 'a deep navy blue', 'a vibrant lime green') and you MUST NOT include the hex codes in the final prompts for the image generator.

                **Prompts to Generate:**
                1. A double-sided business card.
                2. An official company letterhead.
                3. A versatile social media post template for Instagram.

                Output a JSON object with keys: 'businessCardPrompt', 'letterheadPrompt', 'socialPostPrompt'.` },
        logoPart
      ]
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: assetPromptsSchema
      }
    });

    const prompts = JSON.parse(response.text.trim());

    // generateImage is already wrapped with withRetry and uses gemini-3-pro-image-preview
    const [businessCardUrl, letterheadUrl, socialPostUrl] = await Promise.all([
      generateImage(prompts.businessCardPrompt),
      generateImage(prompts.letterheadPrompt),
      generateImage(prompts.socialPostPrompt)
    ]);

    return { businessCardUrl, letterheadUrl, socialPostUrl };
  });
};

export const initializeChat = (lang: 'en' | 'ar'): Chat => {
  const ai = getAiClient();
  const systemInstruction = lang === 'ar'
    ? 'أنت مساعد ودود ومفيد. أجب عن الأسئلة بإيجاز ووضوح باللغة العربية.'
    : 'You are a friendly and helpful assistant. Answer questions concisely and clearly in English.';

  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction,
    },
  });
};