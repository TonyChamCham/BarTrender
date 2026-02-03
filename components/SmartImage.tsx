
import React, { useState, useEffect, useRef } from 'react';
import { ImageOff, Loader2, RefreshCw, X, ArrowRight, FolderOpen } from 'lucide-react';
import { generateImage } from '../services/geminiService';
import { FirebaseService } from '../services/firebaseService';
import { CacheService } from '../services/storageService';

interface SmartImageProps {
  prompt: string;
  cacheKey: string; 
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  fallbackIcon?: React.ReactNode;
  devMode?: boolean;
  onRegenerate?: (newPrompt: string, model: string, sourceImage?: string) => Promise<string | null>;
}

const IMAGE_MODELS = [
    { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 (Fast/Edit)', desc: 'Best for small changes & speed' },
    { id: 'gemini-3-pro-image-preview', name: 'Gemini 3 Pro (HQ)', desc: 'Best for photorealism' },
    { id: 'imagen-4.0-generate-001', name: 'Imagen 4 (Art)', desc: 'Best for artistic styles' }
];

export const SmartImage: React.FC<SmartImageProps> = ({ 
  prompt, 
  cacheKey,
  alt, 
  className = "",
  style,
  fallbackIcon,
  devMode,
  onRegenerate
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showRefinementModal, setShowRefinementModal] = useState(false); 
  const [refineText, setRefineText] = useState("");
  const [selectedModel, setSelectedModel] = useState(IMAGE_MODELS[0].id);
  const [error, setError] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    let timeoutId: any;

    const fetchImage = async () => {
      setLoading(true);
      setError(false);
      
      // Safety timeout
      timeoutId = setTimeout(() => {
        if (mounted.current) { setLoading(false); }
      }, 45000);

      try {
        const url = await generateImage(prompt, cacheKey);
        clearTimeout(timeoutId);
        if (mounted.current) {
          if (url) { 
              setImageUrl(url); 
              setError(false); 
          } else { 
              setError(true); 
          }
        }
      } catch (err) { 
          console.error("SmartImage load error", err);
          if (mounted.current) setError(true); 
      } 
      finally { 
          if (mounted.current) setLoading(false); 
      }
    };

    fetchImage();
    return () => { mounted.current = false; clearTimeout(timeoutId); };
  }, [cacheKey, prompt]); 

  const handleStopPropagation = (e: React.SyntheticEvent | React.MouseEvent) => {
      e.stopPropagation();
      if ('nativeEvent' in e) e.nativeEvent.stopImmediatePropagation();
  };

  const handleRegenerateClick = (e: React.MouseEvent) => {
    handleStopPropagation(e);
    setRefineText("");
    setShowRefinementModal(true);
  };

  const handleLocalUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (evt) => {
          const base64 = evt.target?.result as string;
          setIsRegenerating(true);
          try {
              await FirebaseService.saveImage(cacheKey, base64);
              await CacheService.saveImage(cacheKey, base64);
              setImageUrl(base64);
              setError(false);
          } catch (err) { alert("Upload failed."); } 
          finally { setIsRegenerating(false); }
      };
      reader.readAsDataURL(file);
  };

  // Helper to convert current image to base64 via Canvas 
  const getCurrentImageAsBase64 = (): string | null => {
      // 1. Prefer existing base64 state if available
      if (imageUrl && imageUrl.startsWith('data:')) return imageUrl;

      // 2. Try canvas for simple images
      if (!imgRef.current) return null;
      try {
          const canvas = document.createElement('canvas');
          canvas.width = imgRef.current.naturalWidth;
          canvas.height = imgRef.current.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) return null;
          ctx.drawImage(imgRef.current, 0, 0);
          return canvas.toDataURL('image/jpeg', 0.8);
      } catch (e) {
          console.warn("Canvas export failed (likely CORS taint)", e);
          return null;
      }
  };

  const handleSubmitRefinement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onRegenerate) return;
    
    setShowRefinementModal(false);
    setIsRegenerating(true);
    const finalPrompt = refineText.trim() ? `${prompt}. ADJUSTMENT: ${refineText}` : prompt;
      
    try {
      let sourceImage: string | undefined = undefined;
      
      // If refining with Gemini 2.5, we MUST provide the source image.
      if (refineText.trim() && selectedModel === 'gemini-2.5-flash-image') {
          // Try to get source from state first, then canvas, then cache
          sourceImage = imageUrl && imageUrl.startsWith('data:') ? imageUrl : getCurrentImageAsBase64() || await CacheService.getImage(cacheKey) || undefined;
      }

      const newUrl = await onRegenerate(finalPrompt, selectedModel, sourceImage);
      if (newUrl && mounted.current) { setImageUrl(newUrl); setError(false); }
    } catch (err) { alert("Regeneration failed."); } 
    finally { if (mounted.current) setIsRegenerating(false); }
  };

  if (loading) return (
      <div className={`bg-slate-900 flex flex-col items-center justify-center animate-pulse ${className} relative overflow-hidden`} style={style}>
        <Loader2 className="text-amber-500/50 mb-2 animate-spin" size={32} />
        <span className="text-xs text-slate-500 font-bold uppercase">Visualizing...</span>
      </div>
  );

  return (
    <div className="relative w-full h-full group">
      {(error || !imageUrl) ? (
        <div className={`bg-slate-900 flex items-center justify-center ${className}`} style={style}><ImageOff className="text-slate-700" size={32} /></div>
      ) : (
        <img 
            ref={imgRef}
            src={imageUrl} 
            alt={alt} 
            style={style}
            // Removed crossOrigin to prevent broken images on mobile/data-urls
            className={`transition-opacity duration-700 ${className}`} 
        />
      )}
      
      {isRegenerating && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
             <Loader2 className="text-amber-500 animate-spin mb-2" size={32} />
             <span className="text-white font-bold text-sm">Refining...</span>
        </div>
      )}

      {showRefinementModal && (
        <div className="absolute inset-0 bg-stone-950/95 z-50 flex flex-col p-4" onClick={handleStopPropagation}>
            <div className="flex justify-between items-center mb-3">
              <span className="text-[#ec1337] font-black text-xs uppercase tracking-widest">Regeneration</span>
              <button onClick={(e) => { handleStopPropagation(e); setShowRefinementModal(false); }} className="p-1 bg-[#1f0a0a] rounded-full text-stone-500">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 hide-scrollbar">
                <div>
                  <label className="text-[10px] font-bold text-stone-500 uppercase mb-1 block">Refinement / Inpainting</label>
                  <textarea 
                    className="w-full bg-[#1f0a0a] border border-[#3d1a1a] rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[#ec1337] transition-all resize-none h-24" 
                    placeholder="Ex: 'Fewer ice cubes' (Leave empty to change full image)" 
                    value={refineText} 
                    onChange={(e) => setRefineText(e.target.value)} 
                    autoFocus 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-stone-500 uppercase mb-1 block">AI Model</label>
                  <div className="space-y-2">
                    {IMAGE_MODELS.map(m => (
                      <button 
                        key={m.id} 
                        onClick={() => setSelectedModel(m.id)} 
                        className={`w-full p-3 rounded-2xl border text-left transition-all ${selectedModel === m.id ? 'bg-[#ec1337]/10 border-[#ec1337]' : 'bg-[#0f0505] border-[#3d1a1a]'}`}
                      >
                        <div className={`font-bold text-xs ${selectedModel === m.id ? 'text-[#ec1337]' : 'text-white'}`}>{m.name}</div>
                        <div className="text-[10px] text-stone-500 truncate">{m.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
            </div>
            <button onClick={handleSubmitRefinement} className="mt-4 bg-[#ec1337] text-white py-4 rounded-full font-black text-xs uppercase tracking-widest shadow-xl shadow-[#ec1337]/20 flex items-center justify-center gap-2">
              Generate <ArrowRight size={16} />
            </button>
        </div>
      )}

      {devMode && !loading && !isRegenerating && !showRefinementModal && (
        <div className="absolute top-2 right-2 flex flex-col gap-2 z-40 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={handleRegenerateClick} className="bg-[#ec1337] text-white p-2 rounded-full border-2 border-white/20 active:scale-95">
            <RefreshCw size={16} />
          </button>
          <button onClick={(e) => { handleStopPropagation(e); fileInputRef.current?.click(); }} className="bg-emerald-600 text-white p-2 rounded-full border-2 border-white/20 active:scale-95">
            <FolderOpen size={16} />
          </button>
          <input type="file" ref={fileInputRef} onChange={handleLocalUpload} accept="image/*" className="hidden" />
        </div>
      )}
    </div>
  );
};
