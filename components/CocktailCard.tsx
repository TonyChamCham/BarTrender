
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

const getSpecialTagStyle = (tag: string) => {
    const t = tag.toUpperCase();
    
    // Core Status & AI
    if (t === 'NO ALCOHOL' || t === 'MOCKTAIL' || t === 'VIRGIN') 
        return "bg-[#17B67F]/20 text-[#17B67F] border-[#17B67F]/40 shadow-[0_0_10px_-3px_rgba(23,182,127,0.3)]";
    if (t === 'SHOT' || t === 'SHOOTER') 
        return "bg-[#F3415F]/20 text-[#F3415F] border-[#F3415F]/40 shadow-[0_0_10px_-3px_rgba(243,65,95,0.3)]";
    if (t === 'AI CREATION' || t === 'BARMAN AI' || t === 'AI PICK')
        return "bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-[0_0_10px_-3px_rgba(168,85,247,0.3)]";
    
    // Physical / Temperature / Texture
    if (t.includes('HOT') || t.includes('WARM'))
        return "bg-red-600/20 text-red-400 border-red-600/40";
    if (t.includes('FROZEN') || t.includes('ICE') || t.includes('SLUSH'))
        return "bg-cyan-300/20 text-cyan-200 border-cyan-300/40";
    if (t.includes('CREAM') || t.includes('FOAM') || t.includes('SILKY'))
        return "bg-[#f5f5dc]/20 text-[#f5f5dc] border-[#f5f5dc]/40";
    if (t.includes('FIZZ') || t.includes('BUBBLY') || t.includes('SPARKLING'))
        return "bg-yellow-200/20 text-yellow-100 border-yellow-200/40";

    // Spirits / Ingredients
    if (t.includes('WHISKEY') || t.includes('BOURBON') || t.includes('SCOTCH') || t.includes('RUM') || t.includes('AGED'))
        return "bg-amber-600/20 text-amber-400 border-amber-600/40";
    if (t.includes('GIN') || t.includes('VODKA') || t.includes('TEQUILA') || t.includes('CLEAR'))
        return "bg-slate-300/20 text-slate-200 border-slate-300/40";
    if (t.includes('COFFEE') || t.includes('KAHLUA') || t.includes('ESPRESSO'))
        return "bg-stone-800/60 text-[#D2B48C] border-[#D2B48C]/40";
    if (t.includes('FRUIT') || t.includes('BERRY') || t.includes('SWEET'))
        return "bg-pink-500/20 text-pink-300 border-pink-500/40";
    if (t.includes('CITRUS') || t.includes('SOUR') || t.includes('LIME') || t.includes('LEMON'))
        return "bg-lime-400/20 text-lime-300 border-lime-400/40";
    if (t.includes('SPICY') || t.includes('GINGER') || t.includes('PEPPER'))
        return "bg-orange-600/20 text-orange-400 border-orange-600/40";
    if (t.includes('HERBAL') || t.includes('MINT') || t.includes('BASIL'))
        return "bg-emerald-600/20 text-emerald-300 border-emerald-600/40";

    // Moods
    if (t.includes('CLASSY') || t.includes('ELEGANT') || t.includes('SOPHISTICATED'))
        return "bg-indigo-900/40 text-indigo-300 border-indigo-400/30";
    if (t.includes('PARTY') || t.includes('FUN') || t.includes('TIKI'))
        return "bg-fuchsia-600/20 text-fuchsia-300 border-fuchsia-600/40";
    if (t.includes('COZY') || t.includes('RELAX'))
        return "bg-stone-600/30 text-stone-300 border-stone-500/30";
    if (t.includes('STRONG') || t.includes('BOLD') || t.includes('INTENSE'))
        return "bg-red-950/40 text-red-500 border-red-800/50";

    // Seasonal Styles (Fallback if exact match on specialLabel)
    if (t.includes('WINTER') || t.includes('NEW YEAR')) 
        return "bg-blue-600/20 text-blue-300 border-blue-500/40";
    if (t.includes('SPRING') || t.includes('ST PATRICK')) 
        return "bg-green-600/20 text-green-300 border-green-500/40"; 
    if (t.includes('SUMMER')) 
        return "bg-yellow-500/20 text-yellow-300 border-yellow-500/40";
    if (t.includes('AUTUMN') || t.includes('HALLOWEEN')) 
        return "bg-orange-700/20 text-orange-300 border-orange-600/40";
    if (t.includes('CHRISTMAS') || t.includes('XMAS')) 
        return "bg-red-700/20 text-red-200 border-red-500/40";
    
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
  
  let displayTags = cocktail.tags.map(normalizeTag);
  let specialLabel = cocktail.specialLabel ? normalizeTag(cocktail.specialLabel) : undefined;
  
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
          displayTags.unshift('NO ALCOHOL');
      }
  }

  const shotKeywords = ['SHOT', 'SHOOTER'];
  const tagSaysShot = displayTags.some(t => shotKeywords.includes(t.toUpperCase()));
  if (isShotsMode || tagSaysShot || forceShotTag) {
      displayTags = displayTags.filter(t => !shotKeywords.includes(t.toUpperCase()));
      if (!displayTags.some(t => t.toUpperCase() === 'SHOT')) {
          displayTags.unshift('SHOT');
      }
  }

  // Ensure special label is first, then technical tags (No Alc/Shot), then others
  const sortedTags = [
      ...(specialLabel ? [specialLabel] : []),
      ...displayTags.filter(t => ['NO ALCOHOL', 'SHOT'].includes(t.toUpperCase())),
      ...displayTags.filter(t => !['NO ALCOHOL', 'SHOT'].includes(t.toUpperCase()) && t !== specialLabel)
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
