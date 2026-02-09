
import React from 'react';
import { Heart, Share2 } from 'lucide-react';
import { SmartImage } from './SmartImage';
import { CocktailSummary } from '../types';
import { sanitizeKey, generateImage } from '../services/geminiService';
import { formatLikes } from './Helpers';

interface CocktailCardProps {
  cocktail: CocktailSummary;
  isFav: boolean;
  isShotsMode: boolean;
  devMode: boolean;
  forceNoAlcoholTag?: boolean;
  forceShotTag?: boolean;
  onSelect: (c: CocktailSummary) => void;
  onToggleFav: (name: string) => void;
  onShare: (name: string) => void;
}

const CLASSIC_DRINKS = [
    'COSMOPOLITAN', 'MARGARITA', 'OLD FASHIONED', 'MOJITO', 'NEGRONI', 'ESPRESSO MARTINI', 
    'WHISKEY SOUR', 'MOSCOW MULE', 'APEROL SPRITZ', 'MANHATTAN', 'DAIQUIRI', 'BLOODY MARY', 
    'PIÑA COLADA', 'DRY MARTINI', 'GIMLET', 'DARK N STORMY', 'PALOMA'
];

// Liste des tags techniques à masquer
const BLACKLISTED_TAGS = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
    'SEASON_JANUARY', 'SEASON_FEBRUARY', 'SEASON_MARCH', 'SEASON_APRIL', 'SEASON_MAY', 'SEASON_JUNE',
    'SEASON_JULY', 'SEASON_AUGUST', 'SEASON_SEPTEMBER', 'SEASON_OCTOBER', 'SEASON_NOVEMBER', 'SEASON_DECEMBER'
];

// Mots-clés prioritaires à afficher en premier
const PRIORITY_KEYWORDS = [
    'VALENTINE', 'ROMANTIC', 'LOVE', 'APHRODISIAC', // Feb
    'MARDI GRAS', 'CARNIVAL', // Feb/March
    'SUPER BOWL', 'FOOTBALL', 'GAME DAY', 'USA', // Feb
    'ST PATRICK', 'IRISH', 'GREEN', // March
    'EASTER', 'SPRING', // April
    'CINCO DE MAYO', 'MEXICAN', // May
    'SUMMER', 'BEACH', 'TROPICAL', 'TIKI', // Summer
    'HALLOWEEN', 'SPOOKY', 'SCARY', 'PUMPKIN', // Oct
    'CHRISTMAS', 'HOLIDAY', 'FESTIVE', 'XMAS', 'WINTER', // Dec
    'NEW YEAR', // Jan
    'COZY', 'AUTUMN', 'FALL' // Fall
];

const getSpecialTagStyle = (tag: string) => {
    const t = tag.toUpperCase().replace(/_/g, ' '); 
    
    // 1. CORE STATUS & AI
    if (t === 'NO ALCOHOL' || t === 'MOCKTAIL' || t === 'VIRGIN' || t === 'ZERO PROOF') 
        return "bg-[#17B67F]/20 text-[#17B67F] border-[#17B67F]/40 shadow-[0_0_10px_-3px_rgba(23,182,127,0.3)]";
    if (t === 'SHOT' || t === 'SHOOTER') 
        return "bg-[#F3415F]/20 text-[#F3415F] border-[#F3415F]/40 shadow-[0_0_10px_-3px_rgba(243,65,95,0.3)]";
    if (t === 'AI CREATION' || t === 'BARMAN AI' || t === 'AI PICK')
        return "bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-[0_0_10px_-3px_rgba(168,85,247,0.3)]";
    
    // 2. EVENTS & HOLIDAYS (PRIORITY)
    if (t.includes('VALENTINE') || t.includes('LOVE') || t.includes('ROMANTIC') || t.includes('APHRODISIAC'))
        return "bg-[#ec407a]/20 text-[#ff80ab] border-[#ec407a]/40 shadow-[0_0_8px_-2px_rgba(236,64,122,0.4)]"; 
    
    if (t.includes('HALLOWEEN') || t.includes('SPOOKY') || t.includes('PUMPKIN') || t.includes('SCARY'))
        return "bg-[#ff6d00]/20 text-[#ff9e80] border-[#ff6d00]/40"; 

    if (t.includes('CHRISTMAS') || t.includes('XMAS') || t.includes('HOLIDAY') || t.includes('FESTIVE'))
        return "bg-[#d50000]/20 text-[#ff8a80] border-[#d50000]/40"; 
    
    if (t.includes('ST PATRICK') || t.includes('IRISH') || t.includes('LUCKY')) 
        return "bg-[#00c853]/20 text-[#69f0ae] border-[#00c853]/40"; 

    if (t.includes('SUPER BOWL') || t.includes('USA') || t.includes('FOOTBALL') || t.includes('GAME DAY'))
        return "bg-blue-900/50 text-white border-red-500/50 shadow-[0_0_10px_-2px_rgba(59,130,246,0.5)]"; 

    if (t.includes('MARDI GRAS') || t.includes('CARNIVAL'))
        return "bg-purple-900/40 text-yellow-300 border-green-500/40"; 

    if (t.includes('EASTER') || t.includes('EGG') || t.includes('SPRING'))
        return "bg-pink-200/10 text-pink-200 border-sky-300/30"; 

    if (t.includes('TAX DAY') || t.includes('MONEY') || t.includes('DOLLAR'))
        return "bg-green-800/40 text-green-400 border-green-600/50 shadow-[0_0_8px_-2px_rgba(74,222,128,0.3)]";

    if (t.includes('EARTH DAY') || t.includes('PLANET') || t.includes('SUSTAINABLE'))
        return "bg-emerald-800/40 text-sky-300 border-emerald-600/40"; 

    // 3. FLAVORS
    if (t.includes('CHOCOLATE') || t.includes('COCOA') || t.includes('COFFEE') || t.includes('ESPRESSO') || t.includes('STOUT'))
        return "bg-[#5d4037]/40 text-[#d7ccc8] border-[#8d6e63]/40"; 
    
    if (t.includes('DESSERT') || t.includes('CAKE') || t.includes('VANILLA') || t.includes('CREAM') || t.includes('SWEET') || t.includes('COOKIE') || t.includes('MARSHMALLOW') || t.includes('COCONUT') || t.includes('FROTHY') || t.includes('FOAM'))
        return "bg-[#fbc02d]/10 text-[#fff59d] border-[#fbc02d]/30"; 

    if (t.includes('CINNAMON') || t.includes('MAPLE') || t.includes('SPICE') || t.includes('NUTMEG') || t.includes('SAVORY') || t.includes('CLOVE'))
        return "bg-orange-900/30 text-orange-200 border-orange-700/40"; 

    if (t.includes('HONEY') || t.includes('AGAVE'))
        return "bg-yellow-600/20 text-yellow-400 border-yellow-500/40"; 

    if (t.includes('SMOKY') || t.includes('MEZCAL') || t.includes('SCOTCH'))
         return "bg-stone-700/50 text-stone-300 border-stone-500/40"; 

    // 4. STYLE
    if (t.includes('REFRESHING') || t.includes('FROZEN') || t.includes('ICE') || t.includes('COLD') || t.includes('MINT') || t.includes('CUCUMBER'))
        return "bg-cyan-500/20 text-cyan-200 border-cyan-400/30"; 

    if (t.includes('FIZZ') || t.includes('BUBBLY') || t.includes('SPARKLING') || t.includes('CHAMPAGNE'))
        return "bg-yellow-200/10 text-yellow-100 border-yellow-200/30";

    // 5. COLORS
    if (t.includes('BERRY') || t.includes('CHERRY') || t.includes('POMEGRANATE') || t.includes('RHUBARB') || t.includes('HIBISCUS') || t.includes('WINE') || t.includes('VERMOUTH') || t.includes('ROSÉ'))
        return "bg-pink-600/20 text-pink-300 border-pink-500/40";

    if (t.includes('PURPLE') || t.includes('LAVENDER') || t.includes('VIOLET') || t.includes('UUBE'))
         return "bg-violet-600/20 text-violet-300 border-violet-500/40";

    if (t.includes('PEACH') || t.includes('PEAR') || t.includes('APRICOT'))
        return "bg-orange-400/20 text-orange-200 border-orange-400/40";

    if (t.includes('HERBAL') || t.includes('BASIL') || t.includes('CHARTREUSE') || t.includes('MIDORI') || t.includes('THYME') || t.includes('ROSEMARY') || t.includes('TOMATILLO') || t.includes('VEGETAL') || t.includes('GREEN') || t.includes('TEA') || t.includes('MATCHA'))
        return "bg-emerald-600/20 text-emerald-300 border-emerald-500/40";

    // 6. SPIRITS
    if (t.includes('WHISKEY') || t.includes('BOURBON') || t.includes('RUM') || t.includes('AGED') || t.includes('OAK'))
        return "bg-amber-700/30 text-amber-400 border-amber-600/40";
    
    if (t.includes('BEER') || t.includes('ALE') || t.includes('LAGER') || t.includes('IPA'))
        return "bg-amber-600/20 text-amber-300 border-amber-500/40";

    if (t.includes('GIN') || t.includes('VODKA') || t.includes('TEQUILA') || t.includes('CLEAR') || t.includes('SAKE') || t.includes('MARTINI') || t.includes('ELDERFLOWER') || t.includes('LYCHEE'))
        return "bg-slate-400/20 text-slate-200 border-slate-400/30";

    if (t.includes('CITRUS') || t.includes('SOUR') || t.includes('LIME') || t.includes('LEMON') || t.includes('ORANGE'))
        return "bg-lime-500/20 text-lime-300 border-lime-400/40";
    
    if (t.includes('SPICY') || t.includes('GINGER') || t.includes('PEPPER') || t.includes('CHILI'))
        return "bg-orange-700/20 text-orange-400 border-orange-600/40";

    // 7. MOODS
    if (t.includes('LUXURY') || t.includes('LUXURIOUS') || t.includes('PREMIUM') || t.includes('GOLD') || t.includes('CLASSY') || t.includes('ELEGANT'))
        return "bg-yellow-950/40 text-yellow-100 border-yellow-600/40 shadow-[0_0_10px_-3px_rgba(234,179,8,0.3)]";
    
    if (t.includes('PARTY') || t.includes('FUN') || t.includes('TIKI') || t.includes('TROPICAL'))
        return "bg-fuchsia-600/20 text-fuchsia-300 border-fuchsia-500/40";
    
    if (t.includes('COZY') || t.includes('RELAX') || t.includes('COMFORT'))
        return "bg-stone-600/30 text-stone-300 border-stone-500/30";
    
    if (t.includes('STRONG') || t.includes('BOLD') || t.includes('INTENSE'))
        return "bg-red-950/40 text-red-500 border-red-800/50";

    // 8. SEASONS (Generic Fallback)
    if (t.includes('WINTER')) return "bg-blue-800/30 text-blue-300 border-blue-600/40";
    if (t.includes('SPRING')) return "bg-green-500/20 text-green-200 border-green-500/30"; 
    if (t.includes('SUMMER')) return "bg-yellow-600/20 text-yellow-300 border-yellow-600/40";
    if (t.includes('AUTUMN') || t.includes('FALL')) return "bg-orange-800/30 text-orange-300 border-orange-700/40";
    
    // Default
    return "bg-stone-800/40 text-stone-400 border-stone-700/50";
};

export const CocktailCard: React.FC<CocktailCardProps> = ({
  cocktail,
  isFav,
  isShotsMode,
  devMode,
  forceNoAlcoholTag,
  forceShotTag,
  onSelect,
  onToggleFav,
  onShare
}) => {
  const glassContext = isShotsMode ? "served in a small glass shot" : "high-end cocktail photography";
  const nameUpper = cocktail.name.toUpperCase();
  const isClassic = CLASSIC_DRINKS.some(c => nameUpper.includes(c));
  
  const normalizeTag = (t: string) => t.toUpperCase() === 'AI PICK' ? 'AI CREATION' : t;
  
  // Filter out internal technical tags or month names from display
  const isCleanTag = (t: string) => {
      const upper = t.toUpperCase();
      if (upper.startsWith('SEASON_')) return false;
      if (BLACKLISTED_TAGS.includes(upper)) return false;
      return true;
  };

  const rawTags = cocktail.tags.filter(isCleanTag).map(normalizeTag);
  
  // LOGIC DE TRI DES TAGS
  // 1. Seasonal/Events (Priority)
  const priorityTags = rawTags.filter(t => PRIORITY_KEYWORDS.some(k => t.toUpperCase().includes(k)));
  // 2. Technical (No Alc, Shot)
  const techTags = rawTags.filter(t => ['NO ALCOHOL', 'SHOT', 'MOCKTAIL', 'VIRGIN', 'SHOOTER'].includes(t.toUpperCase()));
  // 3. Others (Ingredients, Flavors)
  const otherTags = rawTags.filter(t => !priorityTags.includes(t) && !techTags.includes(t));

  let displayTags = [...priorityTags, ...techTags, ...otherTags];

  // Handle Special Label separately
  let specialLabel = cocktail.specialLabel ? normalizeTag(cocktail.specialLabel) : undefined;
  
  // If special label is technical (e.g. SEASON_FEBRUARY), don't show it as a pill
  if (specialLabel && !isCleanTag(specialLabel)) {
      specialLabel = undefined;
  }
  
  if (isClassic && specialLabel === 'AI CREATION') {
      specialLabel = undefined;
      displayTags = displayTags.filter(t => t !== 'AI CREATION');
  }
  
  const noAlcKeywords = ['MOCKTAIL', 'NON-ALCOHOLIC', 'VIRGIN', 'NO ALCOHOL', 'ZERO PROOF'];
  const nameIsVirgin = cocktail.name.toLowerCase().includes('virgin') || cocktail.name.toLowerCase().includes('mocktail');
  const tagSaysNoAlc = displayTags.some(t => noAlcKeywords.includes(t.toUpperCase()));
  
  if (tagSaysNoAlc || nameIsVirgin || forceNoAlcoholTag) {
      displayTags = displayTags.filter(t => !noAlcKeywords.includes(t.toUpperCase()));
      if (!displayTags.some(t => t.toUpperCase() === 'NO ALCOHOL')) {
          // Insert NO ALCOHOL after priority tags but before others
          const insertIdx = priorityTags.length;
          displayTags.splice(insertIdx, 0, 'NO ALCOHOL');
      }
  }

  const shotKeywords = ['SHOT', 'SHOOTER'];
  const tagSaysShot = displayTags.some(t => shotKeywords.includes(t.toUpperCase()));
  if (isShotsMode || tagSaysShot || forceShotTag) {
      displayTags = displayTags.filter(t => !shotKeywords.includes(t.toUpperCase()));
      if (!displayTags.some(t => t.toUpperCase() === 'SHOT')) {
           // Insert SHOT after priority tags
           const insertIdx = priorityTags.length;
           displayTags.splice(insertIdx, 0, 'SHOT');
      }
  }

  // Final Assembly
  const sortedTags = [
      ...(specialLabel ? [specialLabel] : []),
      ...displayTags.filter(t => t !== specialLabel)
  ];

  const uniqueTags = Array.from(new Set(sortedTags.map(t => t.toUpperCase())));

  return (
    <div 
      onClick={() => onSelect(cocktail)}
      className="group bg-[#1f0a0a] rounded-3xl overflow-hidden border border-[#3d1a1a] relative active:scale-[0.98] transition-all shadow-lg hover:border-[#ec1337]/30 mb-3 last:mb-20"
    >
      <div className="aspect-[4/3] bg-stone-900 relative overflow-hidden">
        <SmartImage 
          cacheKey={`cocktails/${sanitizeKey(cocktail.name)}/cover`} 
          prompt={`8k ${glassContext} of ${cocktail.name}. Cinematic lighting, high quality.`} 
          alt={cocktail.name} 
          className="w-full h-full object-cover" 
          devMode={devMode}
          onRegenerate={(p, mod, src) => generateImage(p, `cocktails/${sanitizeKey(cocktail.name)}/cover`, true, mod, src)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1f0a0a] via-transparent to-transparent opacity-60" />
        
        <div className="absolute top-3 left-3 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
          <button 
            onClick={(e) => { e.stopPropagation(); onToggleFav(cocktail.name); }}
            className={`flex items-center gap-2 px-3 py-2 rounded-full backdrop-blur-md transition-all border shadow-lg ${isFav ? 'bg-[#ec1337] text-white border-[#ec1337]' : 'bg-[#0f0505]/60 text-stone-300 border-white/10'}`}
          >
            <Heart size={16} className={isFav ? "fill-current" : ""} strokeWidth={2.5} />
            <span className="text-xs font-bold">{formatLikes(cocktail.likes)}</span>
          </button>
          
          <button 
            onClick={(e) => { e.stopPropagation(); onShare(cocktail.name); }}
            className="p-2.5 w-fit rounded-full backdrop-blur-md bg-[#0f0505]/60 text-white border border-white/10 active:scale-90 transition-transform shadow-lg"
          >
            <Share2 size={16} strokeWidth={2.5} />
          </button>
        </div>

        {cocktail.isPremium && (
          <div className="absolute top-5 -right-8 w-32 bg-[#ec1337] text-white text-[9px] font-black py-1.5 text-center rotate-45 shadow-lg uppercase tracking-wider z-20">
            Premium
          </div>
        )}
      </div>
      <div className="p-5 pt-3">
        <h3 className="font-bold text-xl text-slate-100 leading-tight mb-1">{cocktail.name}</h3>
        <p className="text-sm text-stone-400 font-medium line-clamp-2 leading-relaxed mb-3">{cocktail.description}</p>
        <div className="flex flex-wrap gap-2">
          {uniqueTags.slice(0,5).map((t, idx) => (
              <span 
                key={`${t}-${idx}`} 
                className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg border backdrop-blur-sm transition-all ${getSpecialTagStyle(t)}`}
              >
                {t}
              </span>
          ))}
        </div>
      </div>
    </div>
  );
};
