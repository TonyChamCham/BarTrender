
import React, { useState, useEffect, useRef } from 'react';
import { Heart, Share2, CheckCircle, Beer, Layers, Loader2, Save, Move } from 'lucide-react';
import { SmartImage } from './SmartImage';
import { Button } from './Button';
import { CocktailFullDetails } from '../types';
import { sanitizeKey, generateImage } from '../services/geminiService';
import { getIngredientIcon, convertUnitsInString, formatLikes } from './Helpers';

interface CocktailDetailsProps {
  selectedCocktail: CocktailFullDetails;
  unitSystem: 'US' | 'Metric';
  onToggleUnit: () => void;
  devMode: boolean;
  favorites: string[];
  isLoadingDetails: boolean;
  isSaving: boolean;
  onToggleFav: (name: string) => void;
  onShare: (name: string) => void;
  onValidate: (c: CocktailFullDetails) => void;
  onStartMixing: () => void;
}

export const CocktailDetails: React.FC<CocktailDetailsProps> = ({
  selectedCocktail,
  unitSystem,
  onToggleUnit,
  devMode,
  favorites,
  isLoadingDetails,
  isSaving,
  onToggleFav,
  onShare,
  onValidate,
  onStartMixing
}) => {
  const isMetric = unitSystem === 'Metric';
  const isFav = favorites.includes(selectedCocktail.name);
  
  // Image Positioning Logic
  const [imgPos, setImgPos] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{x: number, y: number} | null>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      const savedPos = localStorage.getItem(`cocktail_pos_${sanitizeKey(selectedCocktail.name)}`);
      if (savedPos) {
          setImgPos(JSON.parse(savedPos));
      } else {
          setImgPos({ x: 50, y: 50 });
      }
  }, [selectedCocktail.name]);

  const handleMouseDown = (e: React.MouseEvent) => {
      if (!devMode) return;
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDragging || !dragStartRef.current || !imageContainerRef.current) return;
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;
      const rect = imageContainerRef.current.getBoundingClientRect();
      const percentX = (deltaX / rect.width) * 100;
      const percentY = (deltaY / rect.height) * 100;
      
      setImgPos(prev => ({
          x: Math.max(0, Math.min(100, prev.x - percentX * 0.5)),
          y: Math.max(0, Math.min(100, prev.y - percentY * 0.5))
      }));
      dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
      if (isDragging) {
          setIsDragging(false);
          localStorage.setItem(`cocktail_pos_${sanitizeKey(selectedCocktail.name)}`, JSON.stringify(imgPos));
      }
  };


  return (
    <div className="bg-[#0f0505] min-h-full">
      <div 
        ref={imageContainerRef}
        className={`relative w-full h-96 overflow-hidden ${devMode ? 'cursor-move' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <SmartImage 
          cacheKey={`cocktails/${sanitizeKey(selectedCocktail.name)}/cover`} 
          prompt={`8k high-end photography of ${selectedCocktail.name}. Professional lighting.`} 
          alt={selectedCocktail.name} 
          className="w-full h-full object-cover" 
          style={{ objectPosition: `${imgPos.x}% ${imgPos.y}%` }}
          devMode={devMode} 
          onRegenerate={(p, mod, src) => generateImage(p, `cocktails/${sanitizeKey(selectedCocktail.name)}/cover`, true, mod, src)} 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0505] via-transparent to-transparent opacity-90 pointer-events-none" />
        
        <div className="absolute top-4 left-4 flex flex-col gap-3 pointer-events-auto">
          <button 
            onClick={() => onToggleFav(selectedCocktail.name)} 
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full backdrop-blur-md transition-all border shadow-2xl ${isFav ? 'bg-[#ec1337] text-white border-[#ec1337]' : 'bg-[#0f0505]/60 text-stone-300 border-white/10'}`}
          >
            <Heart size={20} className={isFav ? "fill-current" : ""} strokeWidth={2.5} />
            <span className="text-sm font-black">{formatLikes(selectedCocktail.likes)}</span>
          </button>
          
          <button 
            onClick={() => onShare(selectedCocktail.name)} 
            className="p-3 w-fit rounded-full bg-[#0f0505]/60 backdrop-blur-md text-white border border-white/10 shadow-2xl active:scale-90 transition-transform"
          >
            <Share2 size={20} strokeWidth={2.5} />
          </button>
        </div>

        {devMode && (
            <div className="absolute top-4 right-4 bg-black/50 p-1 rounded text-[8px] text-white pointer-events-none z-20">
                <Move size={12} className="inline mr-1" />
                Drag to Position
            </div>
        )}

        <div className="absolute bottom-0 left-0 p-6 w-full pointer-events-none">
          <div className="flex items-center gap-2 mb-1">
            {selectedCocktail.isValidated && <CheckCircle size={14} className="text-emerald-500" />}
            <h1 className="text-4xl font-black text-white leading-none drop-shadow-lg">{selectedCocktail.name}</h1>
          </div>
        </div>
        
        {isLoadingDetails && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-10 pointer-events-none">
            <Loader2 className="animate-spin text-[#ec1337]" size={48} />
          </div>
        )}
      </div>
      
      <div className="px-6 py-8 pb-10 -mt-6 relative z-10 bg-[#0f0505] rounded-t-3xl border-t border-[#3d1a1a]">
        
        <p className="text-stone-300 font-medium italic border-l-2 border-[#ec1337] pl-4 mb-8">"{selectedCocktail.description}"</p>
        
        <div className="mb-8">
          <h3 className="text-xs font-black text-[#ec1337] uppercase tracking-[0.2em] mb-4">Equipment</h3>
          <div className="w-full bg-[#1f0a0a] p-5 rounded-3xl border border-[#3d1a1a] space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#ec1337]/5 rounded-xl flex items-center justify-center text-[#ec1337]/70">
                <Beer size={20} />
              </div>
              <span className="text-white font-black text-sm">{selectedCocktail.glassType || 'Standard Glass'}</span>
            </div>
            {selectedCocktail.tools?.map(t => (
              <div key={t} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-stone-600">
                  <Layers size={18} />
                </div>
                <span className="text-stone-300 text-sm font-bold">{t}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black text-[#ec1337] uppercase tracking-[0.2em]">Ingredients</h3>
            <button onClick={onToggleUnit} className="h-8 bg-[#1f0a0a] rounded-lg border border-[#3d1a1a] flex p-1 gap-1 active:scale-95 transition-transform">
                 <div className={`px-2 rounded flex items-center justify-center text-[10px] font-bold uppercase transition-all ${!isMetric ? 'bg-[#ec1337] text-white shadow-lg' : 'text-stone-500'}`}>OZ</div>
                 <div className={`px-2 rounded flex items-center justify-center text-[10px] font-bold uppercase transition-all ${isMetric ? 'bg-[#ec1337] text-white shadow-lg' : 'text-stone-500'}`}>ML</div>
            </button>
          </div>
          <div className="space-y-3">
            {selectedCocktail.ingredients.map((ing, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-[#1f0a0a] border border-[#3d1a1a]">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {getIngredientIcon(ing.name)}
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-slate-200 text-lg block leading-tight break-words">{ing.name}</span>
                    {ing.detail && (
                      <span className="text-[11px] text-stone-400 font-medium block leading-tight mt-1 break-words">
                        {convertUnitsInString(ing.detail, isMetric)}
                      </span>
                    )}
                  </div>
                </div>
                <span className="font-mono text-[#ec1337] text-sm font-bold bg-[#ec1337]/10 px-3 py-1.5 rounded-xl ml-3 flex-shrink-0">
                  {convertUnitsInString(ing.amount, isMetric)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          {devMode && (
            <Button variant="secondary" onClick={() => onValidate(selectedCocktail)} isLoading={isSaving} className="flex-1">
              <Save size={20} className="mr-2" /> Validate
            </Button>
          )}
          <Button fullWidth onClick={onStartMixing} disabled={!selectedCocktail.steps?.length} className={devMode ? 'flex-1' : 'w-full'}>
            Start Mixing
          </Button>
        </div>
      </div>
    </div>
  );
};
