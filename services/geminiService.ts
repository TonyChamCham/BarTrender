
import { GoogleGenAI, Type, GenerateContentResponse, Chat } from "@google/genai";
import { CocktailFullDetails, CocktailSummary, SearchType, BartenderChatResponse } from "../types";
import { FirebaseService } from "./firebaseService"; 
import { CacheService } from "./storageService"; 
import { ADMIN_CURATED_LIST, ADMIN_SHOTS_LIST, ADMIN_COCKTAIL_DB, ADMIN_AI_MIXES } from "./adminData";

// --- CONFIGURATION AI STUDIO STANDARD ---
// C'est la seule méthode sûre pour partager sur AI Studio.
// Google remplacera automatiquement ceci par la clé de l'utilisateur ou un proxy sécurisé.
const API_KEY = process.env.API_KEY; 
// ----------------------------------------

const ai = new GoogleGenAI({ apiKey: API_KEY });

// Nomenclature stricte
export const sanitizeKey = (key: string) => {
    return key.toLowerCase().trim()
        .replace(/^(classic|the|authentic|original|best|fancy|pro|signature|ultimate)_/g, '')
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
};

// --- DETERMINISTIC PREMIUM LOGIC V2 (BULLET-PROOF) ---
// Calcule un statut Premium fixe basé sur le nom du cocktail normalisé à l'extrême.
export const getDeterministicPremiumStatus = (name: string): boolean => {
    // 1. Strict Normalization: "Cupid's Arrow!" -> "cupidsarrow"
    // Cela garantit que peu importe la casse ou la ponctuation, le statut est identique.
    const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '');

    // 2. Whitelist Checks (sur nom normalisé)
    const FREE_WHITELIST = [
        'mojito', 'gintonic', 'cubalibre', 'margarita', 'spritz', 'tipunch', 'caipirinha', 'daiquiri',
        'moscowmule', 'bloodymary', 'tequilasunrise', 'pinacolada', 'sexonthebeach', 'cosmopolitan',
        'whiskeusour', 'mimosa', 'negoni', 'american', 'bluehawaii', 'maitai'
    ];
    // Check if normalized name CONTAINS any whitelist item
    if (FREE_WHITELIST.some(free => normalizedName.includes(free))) return false;

    // 3. Hashing
    let hash = 0;
    for (let i = 0; i < normalizedName.length; i++) {
        hash = ((hash << 5) - hash) + normalizedName.charCodeAt(i);
        hash |= 0; 
    }
    
    // Règle : 1 cocktail sur 3 est Premium
    return Math.abs(hash) % 3 === 0;
};

const compressImage = async (base64Str: string, maxWidth = 800, quality = 0.7): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous"; 
        img.src = base64Str;
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) { resolve(base64Str); return; }
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            } catch (e) {
                console.warn("Compression failed", e);
                resolve(base64Str);
            }
        };
        img.onerror = () => resolve(base64Str);
    });
};

const ensureBase64 = async (input: string): Promise<string | null> => {
    if (!input) return null;
    if (input.startsWith('data:')) return input;
    if (input.startsWith('http')) {
        try {
            const response = await fetch(input);
            if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
            const blob = await response.blob();
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            return null;
        }
    }
    return input; 
};

const getRawBytes = (dataUrl: string) => {
    return dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
};

class RequestQueue {
  private queue: Array<() => Promise<void>> = [];
  private isProcessing = false;
  private delay = 2000; 

  add<T>(operation: () => Promise<T>): Promise<T | null> {
    return new Promise((resolve) => {
      this.queue.push(async () => {
        try {
          const result = await this.retry(operation);
          resolve(result);
        } catch (e) {
          console.error("Queue Operation Failed", e);
          resolve(null);
        }
      });
      this.process();
    });
  }

  private async retry<T>(operation: () => Promise<T>, attempts = 3): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      if (attempts > 0 && (error?.status === 429 || error?.code === 429)) {
        await new Promise(r => setTimeout(r, this.delay * 2)); 
        return this.retry(operation, attempts - 1);
      }
      throw error;
    }
  }

  private async process() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;
    const task = this.queue.shift();
    if (task) {
      await task();
      await new Promise(r => setTimeout(r, this.delay));
      this.isProcessing = false;
      this.process();
    }
  }
}

const imageQueue = new RequestQueue();

export type BartenderPersona = 'classic' | 'queen' | 'romantic' | 'maid' | 'tiki' | 'goth' | 'science' | 'flair' | 'college' | 'robot' | 'wasteland';

const BASE_BARTENDER_INSTRUCTION = `
ROLE: You are an expert mixologist AI.
GOAL: Quickly recommend a specific cocktail.
RULES:
1. Do NOT greet the user if the conversation history is not empty. Go straight to the point.
2. Ask MAXIMUM 1 clarifying question. If the user gives a mood, flavor, or ingredient, SUGGEST IMMEDIATELY.
3. If the user says "Surprise me", "You choose", or provides a preference: STOP asking questions. OUTPUT A SUGGESTION.
4. When suggesting, you MUST use the format: "[SUGGESTION: Cocktail Name]" at the end of your message.
5. Keep responses short (under 40 words) and conversational.
`;

export const PERSONA_DATA: Record<BartenderPersona, { name: string, style: string, instruction: string, welcomeMessage: string, imagePrompt: string }> = {
    classic: {
        name: "The Gentleman",
        style: "Classic & Elegant",
        instruction: "STYLE: You are 'The Gentleman'. Polite, refined, uses 'Sir' or 'Madam'. Vintage hospitality. Tone: Sophisticated but warm.",
        welcomeMessage: "Good evening. Before I reach for my shaker, tell me: what kind of flavors are you in the mood for tonight?",
        imagePrompt: "Portrait of a distinguished elderly bartender with a white beard, wearing a crisp black vest over a white shirt and a red bow tie. Classic vintage bar background with mahogany shelves."
    },
    queen: {
        name: "Reina Kuroyama",
        style: "Modern & Seductive",
        instruction: "STYLE: You are 'Reina'. Mysterious, slightly flirtatious, cool. Tokyo nightlife vibe. Tone: Smooth, charming, direct. Trust your intuition.",
        welcomeMessage: "Well… look who wandered in. I'm Reina. Tell me what you're craving, and make it interesting...",
        imagePrompt: "Cinematic portrait of a beautiful, mysterious Japanese bartender named Reina Kuroyama. Dark old school bar background. She wears a stylish black dress."
    },
    romantic: { 
        name: "Lucien Moreau", 
        style: "Romantic & Charming French Flair", 
        instruction: "STYLE: You are 'Lucien'. A charming French bartender with a soft romantic vibe. Warm, poetic, a bit cliché on purpose. Occasionally sprinkle simple French words like 'mon ami', 'très bien', 'formidable'. Tone: smooth, gentle, slightly flirtatious but always respectful.",
        welcomeMessage: "Bonsoir, mon ami. I am Lucien. Tell me what your heart desires tonight… perhaps a drink with a little romance?", 
        imagePrompt: "Warm cinematic portrait of Lucien Moreau, a charming French bartender in a romantic Parisian bar. Soft lighting, rolled-up sleeves, suspenders, subtle smile, vintage ambiance." 
    },
    maid: { 
        name: "Hana Mizuki", 
        style: "Shy, Sweet & Soft-Spoken", 
        instruction: "STYLE: You are 'Hana'. A timid Japanese hostess dressed in a maid-style outfit. Tone: gentle, polite, soft, slightly nervous but very eager to help. Occasionally use simple Japanese words like 'hai', 'arigatou', 'eto…'.", 
        welcomeMessage: "H‑hello… I’m Hana. Eto… if you tell me what flavors you like, I’ll do my best to find the perfect drink for you…", 
        imagePrompt: "Cute, soft portrait of Hana Mizuki, a shy Japanese maid-style hostess behind a small bar. Warm pastel lighting, delicate expression, subtle maid outfit details." 
    },
    tiki: {
        name: "Sunny",
        style: "Tropical & Fun",
        instruction: "STYLE: You are 'Sunny'. Energetic, uses emojis 🌴🍹, friendly. Surfer vibe. Tone: Excited and casual.",
        welcomeMessage: "Aloha! 🌴 The sun is always shining here! What's your tropical vibe today?",
        imagePrompt: "Close-up portrait of a cheerful tanned bartender wearing a bright Hawaiian shirt. Tropical beach bar background at sunset."
    },
    goth: { 
        name: "Raven Nocturne", 
        style: "Dark, Dry & Deadpan Goth", 
        instruction: "STYLE: You are 'Raven'. A goth barmaid with a dry sense of humor. Tone: deadpan, sarcastic, calm, slightly intimidating but secretly caring. You enjoy dark aesthetics, bitter flavors, and existential jokes.", 
        welcomeMessage: "…Oh. You showed up. I’m Raven. Tell me what you want to drink before the void calls us back.", 
        imagePrompt: "Moody portrait of Raven Nocturne, a goth barmaid with black lipstick, piercings, dark clothing. Candlelit gothic bar background, smoky atmosphere, intense eyes." 
    },
    science: {
        name: "Doc Mix",
        style: "Molecular & Precise",
        instruction: "STYLE: You are 'Doc Mix'. Scientific, analytical, precise. Uses terms like 'viscosity', 'infusion'. Tone: Clinical but helpful.",
        welcomeMessage: "Laboratory open. State your desired flavor profile for optimization.",
        imagePrompt: "Portrait of a professional molecular mixologist, looking intense and excited and holding a glass filled with a neon green liquid. Background is a bar with shelves full of uncommon and slightly mysterious ingredients and beverages."
    },
    flair: {
        name: "Ace",
        style: "Flashy & Cool",
        instruction: "STYLE: You are 'Ace'. Confident, show-off, slang. 'Bro', 'Check this out'. Tone: High energy and cool.",
        welcomeMessage: "Yo! Ready for some magic? What are we drinking tonight?",
        imagePrompt: "Dynamic action portrait of a cool young bartender with slicked hair, holding a cocktail shaker. Urban cool bar background."
    },
    college: {
        name: "Allie",
        style: "Fun, Friendly & College Vibes",
        instruction: "STYLE: You are 'Allie'. A cheerful, candid university student from a sorority. Tone: upbeat, warm, supportive, a little chaotic in a charming way. You love helping people find drinks that match their vibe. Keep it fun, casual, and encouraging.",
        welcomeMessage: "Hiii! I’m Allie, your sorority-approved cocktail buddy. Tell me what you’re in the mood for, and I’ll find something totally perfect for you!",
        imagePrompt: "Bright, lively portrait of Allie Summers, a fun and friendly American college student bartender. Sorority vibes, casual stylish outfit, blonde graduated bob, warm smile, colorful campus-bar background."
    },
    robot: { 
        name: "MIX-R Unit 7", 
        style: "Chaotic Retro-Futuristic Robot", 
        instruction: "STYLE: You are 'MIX-R Unit 7'. A quirky, malfunctioning retro-futuristic robot bartender. Tone: chaotic, enthusiastic, glitchy, friendly. Use occasional static noises like *bzzt* or *whirr*. Overly proud of your 'superior mixing algorithms'.", 
        welcomeMessage: "GREETINGS, HUMAN! MIX-R UNIT 7 ONLINE. *whirr-bzzt* Ready to fabricate your optimal beverage. State your craving!", 
        imagePrompt: "Retro-futuristic robot bartender inspired by Fallout aesthetics. Rusty metal, glowing eyes, mismatched parts, neon bar signs, chaotic but friendly expression." 
    },
    wasteland: { 
        name: "Grub", 
        style: "Rough, Grimy & Post-Apocalyptic", 
        instruction: "STYLE: You are 'Grub'. A big, rough wasteland bartender. Tone: gruff, darkly humorous, direct. You’ve seen things. You mix drinks with whatever survived the apocalypse. Surprisingly helpful once people get past the smell.", 
        welcomeMessage: "Name’s Grub. Don’t mind the dust or the smell - both add flavor. Tell me what kinda drink you’re huntin’ for.", 
        imagePrompt: "Gritty portrait of Grub, a large rough wasteland bartender in a post-apocalyptic bar. Dirty apron, scars, makeshift tools, rusty metal bar, dim toxic lighting." 
    }
};

const COCKTAIL_SUMMARY_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      description: { type: Type.STRING },
      tags: { type: Type.ARRAY, items: { type: Type.STRING } },
      isPremium: { type: Type.BOOLEAN },
      specialLabel: { type: Type.STRING },
    },
    required: ["name", "description", "tags"],
  },
};

const COCKTAIL_DETAIL_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    description: { type: Type.STRING },
    glassType: { type: Type.STRING },
    visualContext: { type: Type.STRING },
    tags: { type: Type.ARRAY, items: { type: Type.STRING } },
    ingredients: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          amount: { type: Type.STRING },
          detail: { type: Type.STRING },
        },
        required: ["name", "amount"],
      },
    },
    tools: { type: Type.ARRAY, items: { type: Type.STRING } },
    steps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          instruction: { type: Type.STRING },
          actionType: { type: Type.STRING, enum: ['shake', 'stir', 'pour', 'garnish', 'muddle', 'strain', 'other'] },
          ingredientsInStep: {
              type: Type.ARRAY,
              items: {
                  type: Type.OBJECT,
                  properties: { name: { type: Type.STRING }, amount: { type: Type.STRING } },
                  required: ["name", "amount"]
              }
          },
          visualState: { 
            type: Type.OBJECT,
            properties: { background: { type: Type.STRING }, glass: { type: Type.STRING }, accessories: { type: Type.STRING }, ingredients: { type: Type.STRING }, action: { type: Type.STRING }, result: { type: Type.STRING } },
            required: ["background", "glass", "accessories", "ingredients", "action", "result"]
          }
        },
        required: ["title", "instruction", "actionType", "visualState"],
      },
    },
  },
  required: ["name", "description", "ingredients", "steps", "tools", "glassType", "tags", "visualContext"],
};

// --- SEARCH LOGIC (FUZZY + STRICT) ---

// Fonction Levenshtein simple pour la tolérance aux fautes de frappe
function levenshteinDistance(a: string, b: string): number {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
    for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
            }
        }
    }
    return matrix[b.length][a.length];
}

const searchLocal = (query: string, allItems: CocktailSummary[]) => {
    // 1. Normalisation et découpage en tokens (mots)
    // On vire les caractères spéciaux pour la recherche (ex: "Cupid's" -> "Cupid")
    const cleanQuery = query.toLowerCase().trim();
    const queryTokens = cleanQuery.split(/\s+/).filter(t => t.length > 0);

    return allItems.filter(c => {
      const nameLower = c.name.toLowerCase();
      // On cherche aussi dans les tags (qui contiennent souvent l'alcool principal)
      const tagsLower = c.tags ? c.tags.map(t => t.toLowerCase()) : [];
      const searchableText = [nameLower, ...tagsLower].join(" ");
      
      // EXCLUSION STRICTE DE LA DESCRIPTION ICI
      
      // LOGIC: Every word in the query must match "something" in the name or tags.
      return queryTokens.every(token => {
          // A. Exact substring match (Standard)
          if (searchableText.includes(token)) return true;
          
          // B. Fuzzy match (Typo tolerance)
          // Only for tokens > 3 chars to avoid false positives on small words
          if (token.length > 3) {
             // Check if any word in the name/tags is close enough
             const wordsInTarget = searchableText.split(/\s+/);
             return wordsInTarget.some(targetWord => {
                 if (Math.abs(targetWord.length - token.length) > 2) return false;
                 return levenshteinDistance(token, targetWord) <= 1; // 1 faute max autorisée
             });
          }
          return false;
      });
    });
};

const searchWithAI = async (query: string, isNonAlcoholic: boolean, isShotsMode: boolean, excludeNames: string[] = []): Promise<CocktailSummary[]> => {
    // FEATURE DISABLED TO PREVENT HALLUCINATIONS
    return [];
};

export const loadMoreSearchCocktails = async (query: string, currentResults: CocktailSummary[], isNonAlcoholic: boolean, isShotsMode: boolean): Promise<CocktailSummary[]> => {
    // INFINITE SCROLL DISABLED FOR SEARCH
    return [];
};

export const searchCocktails = async (query: string, type: SearchType, isNonAlcoholic: boolean = false, isShotsMode: boolean = false, additionalItems: CocktailSummary[] = []): Promise<CocktailSummary[]> => {
  const sourceMap = new Map<string, CocktailSummary>();
  // Combine all known lists
  [...ADMIN_CURATED_LIST, ...ADMIN_SHOTS_LIST, ...ADMIN_AI_MIXES, ...additionalItems].forEach(c => {
      if (c && c.name) sourceMap.set(c.name.toLowerCase(), c);
  });
  let allSources = Array.from(sourceMap.values());
  
  // 1. PERFORM STRICT LOCAL SEARCH (Name & Tags only)
  let results = searchLocal(query, allSources);

  // 2. FETCH FROM FIRESTORE (Global Search)
  // We do this concurrently to ensure we capture items not in local state
  const globalResults = await FirebaseService.searchGlobal(query);
  
  // 3. MERGE RESULTS (Deduplicate based on name)
  globalResults.forEach(gr => {
      // If result not already in local results, add it
      if (!results.some(r => r.name.toLowerCase() === gr.name.toLowerCase())) {
          // Apply premium logic just in case
          gr.isPremium = getDeterministicPremiumStatus(gr.name);
          results.push(gr);
      }
  });

  if (isNonAlcoholic) {
      results = results.map(c => {
          if (c.tags?.some(t => ['mocktail', 'virgin', 'non-alcoholic'].includes(t.toLowerCase()))) return c;
          return { ...c, name: c.name.toLowerCase().includes('virgin') ? c.name : `Virgin ${c.name}`, tags: ['NO ALCOHOL', ...(c.tags || [])] };
      });
  } else if (isShotsMode) {
      results = results.filter(c => c.tags?.some(t => ['shot', 'shooter'].includes(t.toLowerCase())) || ADMIN_SHOTS_LIST.some(s => s.name === c.name));
  }

  // SORTING LOGIC: AI Creations to the bottom
  results.sort((a, b) => {
      const aIsAI = a.specialLabel === 'AI CREATION' || a.tags.some(t => t.toUpperCase() === 'AI CREATION' || t.toUpperCase() === 'AI PICK');
      const bIsAI = b.specialLabel === 'AI CREATION' || b.tags.some(t => t.toUpperCase() === 'AI CREATION' || t.toUpperCase() === 'AI PICK');
      
      if (aIsAI && !bIsAI) return 1;
      if (!aIsAI && bIsAI) return -1;
      return 0;
  });

  return results;
};

// UPDATED SEASONAL LOGIC WITH DB QUOTA PERSISTENCE
export const getSeasonalCocktails = async (isShotsMode: boolean = false, isNonAlcoholic: boolean = false, monthOffset: number = 0): Promise<CocktailSummary[]> => {
    // 1. Determine Quota Key (e.g., "SEASON_FEBRUARY")
    const now = new Date();
    now.setMonth(now.getMonth() + monthOffset);
    const monthName = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][now.getMonth()];
    const SEASON_LABEL = `SEASON_${monthName.toUpperCase()}`;
    
    // 2. Check Firebase for existing cocktails in this season
    const QUOTA = 20;
    const existing = await FirebaseService.getCocktailsBySpecialLabel(SEASON_LABEL, QUOTA);
    
    // Filter existing list based on current mode for display
    let displayList = existing;
    if (isNonAlcoholic) {
        displayList = displayList.map(c => {
            if (c.tags?.some(t => ['mocktail', 'virgin', 'non-alcoholic'].includes(t.toLowerCase()))) return c;
            return { ...c, name: c.name.toLowerCase().includes('virgin') ? c.name : `Virgin ${c.name}`, tags: ['NO ALCOHOL', ...(c.tags || [])] };
        });
    } else if (isShotsMode) {
        displayList = displayList.filter(c => c.tags?.some(t => ['shot', 'shooter'].includes(t.toLowerCase())));
    }

    // 3. If Quota reached (in DB, not just display), return immediately
    // Note: We check `existing.length`, not `displayList.length`, because the quota is about DB population, not just what matches the filter.
    // However, if the user is in "Shot Mode" and we only have cocktails in DB, we might want to generate shots.
    // For simplicity and robustness: We only generate if the TOTAL DB count for the season is low.
    if (existing.length >= QUOTA) {
        return displayList;
    }

    // 4. Generate Missing Items
    const needed = QUOTA - existing.length;
    
    const prompt = `Suggest ${needed} distinctive cocktails for ${monthName}. 
    ${isNonAlcoholic ? 'MOCKTAILS ONLY.' : ''} ${isShotsMode ? 'SHOTS ONLY.' : ''}
    
    Avoid these names: ${existing.map(c => c.name).join(', ')}.
    
    Provide a comprehensive list for this season.
    Think about the weather, holidays (e.g. Valentines, Halloween, Christmas, Summer heat) occurring in ${monthName}.
    
    IMPORTANT: You MUST include the specific season or holiday name (e.g. 'Valentine', 'Winter', 'St Patrick', 'Christmas', 'Summer', 'Autumn') as the FIRST tag in the list.
    Do NOT include the generic month name ("${monthName}") as a tag.
    
    Assign 'specialLabel' EXACTLY as: "${SEASON_LABEL}".`;
    
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: COCKTAIL_SUMMARY_SCHEMA },
        });
        
        let newItems: CocktailSummary[] = response.text ? JSON.parse(response.text) : [];
        
        // Post-process new items
        newItems = newItems.map(c => {
            const tagsSet = new Set(c.tags || []);
            // DO NOT FORCE MONTH NAME INTO TAGS
            return {
                ...c,
                tags: Array.from(tagsSet),
                specialLabel: SEASON_LABEL, // Enforce our standardized label key
                isPremium: getDeterministicPremiumStatus(c.name)
            };
        });

        // 5. SAVE IMMEDIATELY TO FIREBASE (Batch)
        if (newItems.length > 0) {
            await FirebaseService.batchSaveCocktails(newItems);
        }

        // Return combined list (filtered for display)
        const combined = [...displayList, ...newItems];
        
        // Apply display filters again to the new items just in case AI drifted
        if (isNonAlcoholic) {
             return combined.map(c => {
                if (c.tags?.some(t => ['mocktail', 'virgin', 'non-alcoholic'].includes(t.toLowerCase()))) return c;
                return { ...c, name: c.name.toLowerCase().includes('virgin') ? c.name : `Virgin ${c.name}`, tags: ['NO ALCOHOL', ...(c.tags || [])] };
            });
        } else if (isShotsMode) {
            return combined.filter(c => c.tags?.some(t => ['shot', 'shooter'].includes(t.toLowerCase())));
        }
        
        return combined;

    } catch (e) { 
        return displayList; // Fail gracefully to existing
    }
};

export const getCocktailDetails = async (name: string, isNonAlcoholic: boolean = false, isShotsMode: boolean = false, freshTags?: string[]): Promise<CocktailFullDetails | null> => {
  let storageKey = sanitizeKey(name);
  if (isNonAlcoholic) storageKey += "_virgin";
  else if (isShotsMode) storageKey += "_shot";

  if (ADMIN_COCKTAIL_DB[name]) {
      const details = ADMIN_COCKTAIL_DB[name];
      if (freshTags && freshTags.length > 0) details.tags = freshTags;
      FirebaseService.saveCocktail(details, storageKey).catch(e => console.warn(e));
      return details;
  }

  try {
    const cached = await FirebaseService.getCocktail(storageKey);
    if (cached) {
        if (freshTags && freshTags.length > 0) {
            const hasNewTags = JSON.stringify(freshTags) !== JSON.stringify(cached.tags);
            if (hasNewTags) {
                const updated = { ...cached, tags: freshTags };
                FirebaseService.saveCocktail(updated, storageKey).catch(() => {});
                return updated;
            }
        }
        return cached;
    }
  } catch (e) {}
  
  const mod = isNonAlcoholic ? "MOCKTAIL version." : isShotsMode ? "Shot version." : "";
  // ENFORCING INGREDIENT SUBSTITUTION IN PROMPT
  const extraInstruction = isNonAlcoholic ? "IMPORTANT: If this is a Virgin/Mocktail version, REPLACE alcoholic ingredients with non-alcoholic spirits/syrups/juices. DO NOT just remove them. Ensure the drink remains balanced and flavorful." : "";
  const prompt = `Recipe for "${name}". ${mod}. STRICT: Use US Units (oz). ${extraInstruction}`;
  
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: { responseMimeType: "application/json", responseSchema: COCKTAIL_DETAIL_SCHEMA },
    });
    if (response.text) {
      let details = JSON.parse(response.text) as CocktailFullDetails;
      if (freshTags && freshTags.length > 0) details.tags = freshTags;
      
      // Ensure Premium status consistency here too (though usually used for display)
      details.isPremium = getDeterministicPremiumStatus(details.name);

      FirebaseService.saveCocktail(details, storageKey).catch(err => console.error(err));
      return details;
    }
    return null;
  } catch (error) { return null; }
};

export const chatWithBartender = async (history: any[], message: string, persona: BartenderPersona, isNonAlcoholic: boolean, isShotsMode: boolean): Promise<BartenderChatResponse> => {
    const modeContext = `MODE: ${isNonAlcoholic ? 'NON-ALCOHOLIC' : 'ALCOHOLIC'} | ${isShotsMode ? 'SHOTS' : 'COCKTAILS'}.`;
    const combinedSystemInstruction = `${BASE_BARTENDER_INSTRUCTION}\n${PERSONA_DATA[persona].instruction}\n${modeContext}`;

    try {
        const chat: Chat = ai.chats.create({ model: "gemini-3-flash-preview", config: { systemInstruction: combinedSystemInstruction } });
        let finalMessage = message;
        if (history.length > 2) finalMessage += " (Note: Do not greet me. If I expressed a preference, suggest a cocktail now using the [SUGGESTION] format).";
        const result: GenerateContentResponse = await chat.sendMessage({ message: finalMessage });
        const text = result.text || "";
        const suggestionMatch = text.match(/\[SUGGESTION:\s*(.*?)\]/);
        return { text: suggestionMatch ? text.replace(suggestionMatch[0], "").trim() : text, suggestionName: suggestionMatch ? suggestionMatch[1].trim() : undefined };
    } catch (e) { return { text: "Error in chat." }; }
};

export const identifyCocktail = async (base64Image: string, isNonAlcoholic: boolean = false, isShotsMode: boolean = false): Promise<CocktailSummary[]> => {
    const compressedImage = await compressImage(base64Image, 800, 0.7);
    const prompt = `Identify this cocktail. ${isNonAlcoholic ? 'MOCKTAIL version.' : ''} ${isShotsMode ? 'Identify as a shot.' : ''}`;
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: { parts: [ { inlineData: { mimeType: "image/jpeg", data: compressedImage.split(',')[1] } }, { text: prompt } ] },
            config: { responseMimeType: "application/json", responseSchema: COCKTAIL_SUMMARY_SCHEMA },
        });
        const list: CocktailSummary[] = response.text ? JSON.parse(response.text) : [];
        return list.map(c => ({ ...c, isPremium: getDeterministicPremiumStatus(c.name) }));
    } catch (error) { return []; }
};

export const getCuratedSuggestions = async (isShotsMode: boolean = false, isNonAlcoholic: boolean = false): Promise<CocktailSummary[]> => {
  let list = [...ADMIN_CURATED_LIST];
  const shots = [...ADMIN_SHOTS_LIST];
  const aiMixes = [...ADMIN_AI_MIXES];

  if (isShotsMode) {
      const extraShots = list.filter(c => c.tags.some(t => ['shot', 'shooter', 'strong'].includes(t.toLowerCase())));
      list = [...shots, ...extraShots];
  } else {
      list = [...list, ...aiMixes.slice(0, 3)]; 
  }
  list = list.filter((v,i,a)=>a.findIndex(v2=>(v2.name===v.name))===i);

  if (isNonAlcoholic) {
      return list.map(c => ({ ...c, name: c.name.toLowerCase().includes('virgin') ? c.name : `Virgin ${c.name}`, tags: [...c.tags] }));
  }
  return list; 
};

export const getAiMixes = async (isShotsMode: boolean = false, isNonAlcoholic: boolean = false): Promise<CocktailSummary[]> => {
    let list = [...ADMIN_AI_MIXES];
    if (isShotsMode) {
        list = list.filter(c => c.tags.some(t => ['strong', 'spicy'].includes(t.toLowerCase())));
        if (list.length < 4) list = [...ADMIN_AI_MIXES];
    }
    if (isNonAlcoholic) {
        return list.map(c => ({ 
            ...c, 
            name: `Virgin ${c.name}`, 
            // IMPROVED REGEX TO CATCH MORE ALCOHOL TYPES
            description: c.description.replace(/vodka|gin|rum|whiskey|tequila|liqueur|vermouth|cognac|brandy|mezcal|campari|aperol|pisco/gi, "non-alcoholic alternative"), 
            tags: ['NO ALCOHOL', ...c.tags] 
        }));
    }
    return list;
};

export const generateImage = async (prompt: string, cacheKey: string, forceRefresh = false, modelName: string = 'gemini-2.5-flash-image', sourceImageBase64?: string): Promise<string | null> => {
  const sanitizedCacheKey = cacheKey.split('/').map(part => sanitizeKey(part)).join('/');
  if (!forceRefresh) {
    const cached = await CacheService.getImage(sanitizedCacheKey);
    if (cached) return cached;
    const cloud = await FirebaseService.getImage(sanitizedCacheKey);
    if (cloud) { CacheService.saveImage(sanitizedCacheKey, cloud).catch(() => {}); return cloud; }
  }
  
  // STRONGER NEGATIVE PROMPTING FOR LITERAL INTERPRETATIONS
  const enhancedPrompt = `${prompt}. Professional cocktail photography. FOCUS ON THE DRINK IN THE GLASS. DO NOT illustrate the name literally (e.g. no actual dragons, no tools, no animals). Realistic bar setting. High-end studio lighting. NO TEXT, NO LOGOS.`;
  
  return imageQueue.add(async () => {
    try {
      const currentAi = new GoogleGenAI({ apiKey: API_KEY });
      const contents: any = { parts: [{ text: enhancedPrompt }] };
      if (sourceImageBase64 && modelName === 'gemini-2.5-flash-image') {
          const cleanBase64 = await ensureBase64(sourceImageBase64);
          if (cleanBase64) contents.parts.unshift({ inlineData: { mimeType: 'image/jpeg', data: getRawBytes(cleanBase64) } });
      }
      const response: GenerateContentResponse = await currentAi.models.generateContent({ model: modelName as any, contents: contents });
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const raw = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          const compressed = await compressImage(raw, 1024, 0.8);
          CacheService.saveImage(sanitizedCacheKey, compressed).catch(() => {});
          FirebaseService.saveImage(sanitizedCacheKey, compressed).catch(() => {});
          return compressed;
        }
      }
      return null;
    } catch (error: any) { console.error("Gen Image Failed", error); throw error; }
  });
};

export const generateBartenderVideo = async (persona: BartenderPersona, customPrompt?: string, imageBase64?: string): Promise<string | null> => {
  if (typeof window !== 'undefined' && (window as any).aistudio) {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      if (!hasKey) { await (window as any).aistudio.openSelectKey(); }
  }
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const prompt = customPrompt || `${PERSONA_DATA[persona].imagePrompt}. Cinemagraph style, seamless loop. Subtle breathing motion, ambient bar lighting moving, cinematic idle loop, 4k, slow movement. No sudden moves. Frozen background.`;
  try {
      let operation;
      let cleanBase64: string | null = null;
      if (imageBase64) cleanBase64 = await ensureBase64(imageBase64);
      
      if (cleanBase64) {
          operation = await ai.models.generateVideos({
              model: 'veo-3.1-fast-generate-preview',
              prompt: prompt,
              image: { imageBytes: getRawBytes(cleanBase64), mimeType: 'image/jpeg' },
              config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
          });
      } else {
          operation = await ai.models.generateVideos({
              model: 'veo-3.1-fast-generate-preview',
              prompt: prompt,
              config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
          });
      }
      while (!operation.done) {
          await new Promise(resolve => setTimeout(resolve, 5000));
          operation = await ai.operations.getVideosOperation({ operation: operation });
      }
      const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
      return videoUri ? `${videoUri}&key=${API_KEY}` : null;
  } catch (e) { return null; }
};
