
import React, { useState, useRef, useEffect } from 'react';
import { X, ArrowRight, ChevronRight, Video, Loader2, Edit2, Check, Save, Image as ImageIcon, Upload, Move } from 'lucide-react';
import { SmartImage } from './SmartImage';
import { BartenderPersona, PERSONA_DATA, sanitizeKey, generateImage, generateBartenderVideo } from '../services/geminiService';
import { CocktailSummary } from '../types';
import { CacheService } from '../services/storageService';
import { FirebaseService } from '../services/firebaseService';

interface ChatMessage {
  role: string;
  text: string;
  suggestionName?: string;
}

interface BartenderChatProps {
  history: ChatMessage[];
  persona: BartenderPersona;
  isTyping: boolean;
  devMode: boolean;
  onSendMessage: (text: string) => void;
  onSwitchPersona: (p: BartenderPersona) => void;
  onSelectCocktail: (s: CocktailSummary) => void;
}

// Special component for Standard Smooth Loop (User will edit file for ping-pong)
const PingPongVideo = ({ src, className }: { src: string, className?: string }) => {
    return (
        <video 
            src={src} 
            muted 
            autoPlay
            loop
            playsInline 
            className={className}
        />
    );
};

export const BartenderChat: React.FC<BartenderChatProps> = ({
  history,
  persona,
  isTyping,
  devMode,
  onSendMessage,
  onSwitchPersona,
  onSelectCocktail
}) => {
  const [input, setInput] = useState('');
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
  const [isVideoStudioOpen, setIsVideoStudioOpen] = useState(false);
  
  // Video Studio State
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [generatedBlobUrl, setGeneratedBlobUrl] = useState<string | null>(null);
  const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Image Positioning State
  const [imgPos, setImgPos] = useState({ x: 50, y: 20 }); // Percent
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{x: number, y: number} | null>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageUploadRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isTyping]);

  useEffect(() => {
    // 0. Load Image Position
    const savedPos = localStorage.getItem(`bartender_pos_${persona}`);
    if (savedPos) {
        setImgPos(JSON.parse(savedPos));
    } else {
        setImgPos({ x: 50, y: 20 }); // Default
    }

    // 1. Check Local Video (Session)
    const savedUrl = localStorage.getItem(`bartender_video_${persona}`);
    if (savedUrl) {
        console.log("Found local video for", persona);
        setVideoUrl(savedUrl);
    } else {
        // 2. Try to fetch from Firebase directly if not local
        setVideoUrl(null);
        FirebaseService.getVideo(`videos/bartender/${persona}.mp4`).then(url => {
            if (url) {
                setVideoUrl(url);
                localStorage.setItem(`bartender_video_${persona}`, url);
            }
        });
    }
    setCustomPrompt(`${PERSONA_DATA[persona].imagePrompt}. Cinemagraph style, seamless loop. Subtle breathing motion, ambient bar lighting moving, cinematic idle loop, 4k, slow movement. No sudden moves. Frozen background.`);
  }, [persona]);

  const openStudio = async () => {
      const key = `bartender/${sanitizeKey(persona)}`;
      const cached = await CacheService.getImage(key);
      if (cached) {
          setReferenceImage(cached);
      }
      setIsVideoStudioOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleRefImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
              const base64 = evt.target?.result as string;
              setReferenceImage(base64);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleGenerateVideo = async () => {
      if (isVideoLoading) return;
      setIsVideoLoading(true);
      setGeneratedBlobUrl(null);
      setGeneratedBlob(null);
      try {
          const rawUri = await generateBartenderVideo(persona, customPrompt, referenceImage || undefined);
          if (rawUri) {
              const response = await fetch(rawUri);
              if (!response.ok) throw new Error("Failed to download video bytes");
              const blob = await response.blob();
              const objectUrl = URL.createObjectURL(blob);
              setGeneratedBlob(blob);
              setGeneratedBlobUrl(objectUrl);
          }
      } catch (e) {
          console.error(e);
          alert("Video generation failed. Check console.");
      } finally {
          setIsVideoLoading(false);
      }
  };

  const handleValidateAndSave = async () => {
      if (!generatedBlob) return;
      setIsUploading(true);
      try {
          const permanentUrl = await FirebaseService.saveVideo(sanitizeKey(persona), generatedBlob);
          if (permanentUrl) {
              setVideoUrl(permanentUrl);
              localStorage.setItem(`bartender_video_${persona}`, permanentUrl);
              setIsVideoStudioOpen(false);
          }
      } catch (e) {
          alert("Upload failed.");
      } finally {
          setIsUploading(false);
      }
  };

  // --- DRAG LOGIC FOR DEV MODE ---
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
      
      // Convert pixel delta to percentage delta
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
          localStorage.setItem(`bartender_pos_${persona}`, JSON.stringify(imgPos));
      }
  };

  // --- HELPER FOR STATIC ASSETS ---
  const getStaticBartenderImage = (personaKey: string) => {
      return `https://firebasestorage.googleapis.com/v0/b/mixmaster-ai-2fe73.firebasestorage.app/o/images%2Fbartender%2F${personaKey}.jpg?alt=media`;
  };

  return (
    <div className="flex flex-col h-full bg-[#0f0505] relative landscape:flex-row landscape:mt-0">
      
      {/* Persona Selector Modal */}
      {isPersonaModalOpen && (
        <div className="absolute inset-0 z-[100] bg-[#0f0505]/95 backdrop-blur-md p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-2xl font-black text-white">Choose Bartender</h3>
            <button onClick={() => setIsPersonaModalOpen(false)} className="p-2 bg-[#1f0a0a] rounded-full text-stone-400"><X size={24} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(Object.keys(PERSONA_DATA) as BartenderPersona[]).map(p => (
              <button key={p} onClick={() => { onSwitchPersona(p); setIsPersonaModalOpen(false); }}
                className={`p-4 rounded-3xl border flex items-center gap-4 transition-all ${persona === p ? 'bg-[#ec1337]/10 border-[#ec1337]' : 'bg-[#1f0a0a] border-[#3d1a1a]'}`}>
                <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 bg-stone-900 border border-stone-800">
                  {/* DIRECT STATIC IMAGE LOAD */}
                  <img 
                    src={getStaticBartenderImage(p)} 
                    alt={PERSONA_DATA[p].name} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                         // Fallback in case image is missing (optional)
                         (e.target as HTMLImageElement).style.display = 'none';
                    }}
                   />
                </div>
                <div className="text-left"><h4 className="font-black text-lg text-white">{PERSONA_DATA[p].name}</h4><p className="text-[10px] uppercase opacity-60">{PERSONA_DATA[p].style}</p></div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Video Studio Modal */}
      {isVideoStudioOpen && devMode && (
         <div className="absolute inset-0 z-[110] bg-[#0f0505] flex flex-col p-4 overflow-hidden pt-20">
             {/* ... Studio Content ... */}
             <div className="flex justify-between items-center mb-4 border-b border-[#3d1a1a] pb-4">
                <div className="flex items-center gap-2">
                    <Video className="text-[#ec1337]" size={24} />
                    <h3 className="text-xl font-black text-white">Veo Studio</h3>
                </div>
                <button onClick={() => setIsVideoStudioOpen(false)} className="p-2 bg-[#1f0a0a] rounded-full text-stone-400"><X size={24} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4">
                <div className="flex gap-4 h-32">
                     <div className="w-32 h-full bg-stone-900 rounded-xl overflow-hidden border border-[#3d1a1a] relative group flex-shrink-0">
                         {referenceImage ? (
                             <img src={referenceImage} className="w-full h-full object-cover" alt="Ref" />
                         ) : (
                             <div className="w-full h-full flex items-center justify-center text-stone-600"><ImageIcon size={24} /></div>
                         )}
                         <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => imageUploadRef.current?.click()}>
                             <Upload size={20} className="text-white mb-1" />
                             <span className="text-[8px] font-bold text-white uppercase">Change Ref</span>
                         </div>
                         <input type="file" ref={imageUploadRef} className="hidden" accept="image/*" onChange={handleRefImageUpload} />
                     </div>
                     <div className="flex-1 flex flex-col justify-center">
                         <h4 className="text-xs font-bold text-white uppercase mb-1">Reference Image</h4>
                         <p className="text-[10px] text-stone-400 leading-snug">Veo will animate this exact image. Click on it to upload a different starting frame.</p>
                     </div>
                </div>

                <div className="aspect-video w-full bg-stone-900 rounded-2xl overflow-hidden relative border border-[#3d1a1a] flex items-center justify-center">
                    {isVideoLoading ? (
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="animate-spin text-[#ec1337]" size={40} />
                            <span className="text-xs font-bold text-stone-500 uppercase tracking-widest">Veo is working...</span>
                        </div>
                    ) : generatedBlobUrl ? (
                        <PingPongVideo src={generatedBlobUrl} className="w-full h-full object-cover" />
                    ) : (
                        <div className="text-stone-600 text-sm font-bold">No generated video</div>
                    )}
                </div>

                <div>
                    <label className="text-[10px] font-bold text-stone-500 uppercase mb-2 block">Prompt (Edit to Iterate)</label>
                    <textarea 
                        className="w-full h-24 bg-[#1f0a0a] border border-[#3d1a1a] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#ec1337] resize-none leading-relaxed"
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                    />
                </div>
            </div>

            <div className="mt-4 flex gap-3">
                <button 
                    onClick={handleGenerateVideo} 
                    disabled={isVideoLoading}
                    className="flex-1 py-4 bg-[#1f0a0a] border border-[#3d1a1a] rounded-2xl text-white font-bold flex items-center justify-center gap-2 active:scale-95"
                >
                    {isVideoLoading ? "Generating..." : "Generate / Iterate"}
                </button>
                {generatedBlobUrl && (
                    <button 
                        onClick={handleValidateAndSave}
                        disabled={isUploading} 
                        className="flex-1 py-4 bg-[#ec1337] rounded-2xl text-white font-bold flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-[#ec1337]/20"
                    >
                        {isUploading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                        Save to App
                    </button>
                )}
            </div>
         </div>
      )}

      {/* Main Barman Visual (Left Column in Landscape) */}
      <div 
        ref={imageContainerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        // Force aspect-video on tablet portrait (md:) and landscape
        // Mobile portrait stays h-72 for vertical space efficiency
        className={`relative w-full h-72 md:h-auto md:aspect-video flex-shrink-0 overflow-hidden border-b landscape:border-b-0 landscape:border-r border-[#3d1a1a] landscape:w-[45%] landscape:h-full landscape:aspect-auto ${devMode ? 'cursor-move' : ''}`}
      >
        {videoUrl ? (
             <PingPongVideo 
                src={videoUrl} 
                className="w-full h-full object-cover object-center"
             />
        ) : (
            // DIRECT STATIC IMAGE LOAD FOR MAIN VISUAL (Instead of SmartImage)
            <img 
                src={getStaticBartenderImage(persona)} 
                alt={PERSONA_DATA[persona].name} 
                className="w-full h-full object-cover"
                style={{ objectPosition: `${imgPos.x}% ${imgPos.y}%` }}
                onError={(e) => {
                    // Safety fallback: if image doesn't load, try to hide it or show placeholder
                    // For now, we assume user uploaded them correctly
                }}
            />
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0505] via-transparent to-transparent opacity-60 pointer-events-none" />
        
        {/* Buttons moved to TOP LEFT - Corrected Position (top-4 instead of top-20) */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-20">
            <button onClick={() => setIsPersonaModalOpen(true)} className="px-4 py-2 bg-[#ec1337] text-white rounded-full shadow-2xl active:scale-90 transition-transform text-[10px] font-black uppercase tracking-widest border border-white/20">
            Switch
            </button>
            {devMode && (
                <button 
                    onClick={openStudio} 
                    className="px-3 py-2 rounded-full shadow-2xl active:scale-90 transition-transform flex items-center gap-2 border border-white/20 bg-white/10 text-white backdrop-blur-md justify-center"
                >
                    <Video size={14} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Studio</span>
                </button>
            )}
        </div>
        
        {/* Dev Mode Overlay hint */}
        {devMode && !videoUrl && (
            <div className="absolute top-4 right-4 bg-black/50 p-1 rounded text-[8px] text-white pointer-events-none">
                <Move size={12} className="inline mr-1" />
                Drag to Position
            </div>
        )}

        <div className="absolute bottom-4 left-6 pointer-events-none">
          <p className="text-[#ec1337] text-[10px] font-black uppercase tracking-[0.3em] mb-1">{PERSONA_DATA[persona].style}</p>
          <h2 className="text-3xl font-black text-white leading-none">{PERSONA_DATA[persona].name}</h2>
        </div>
      </div>

      {/* Chat Area (Right Column in Landscape) */}
      <div className="flex-1 flex flex-col h-full min-h-0 landscape:w-[55%]">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {history.map((m, i) => (
            <div key={i} className="space-y-4">
                <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-4 rounded-3xl ${m.role === 'user' ? 'bg-[#ec1337] text-white rounded-tr-none' : 'bg-[#1f0a0a] border border-[#3d1a1a] text-slate-200 rounded-tl-none'}`}>
                    {m.text}
                </div>
                </div>
                {m.suggestionName && (
                <div className="flex justify-start pl-4">
                    <div 
                    onClick={() => onSelectCocktail({ name: m.suggestionName!, description: "AI recommendation", tags: ['Suggested'], isPremium: false })} 
                    className="bg-[#1f0a0a] border border-[#3d1a1a] rounded-2xl overflow-hidden w-64 shadow-2xl active:scale-95 transition-all flex flex-col"
                    >
                    <div className="h-32 relative bg-stone-900 overflow-hidden">
                        <SmartImage cacheKey={`cocktails/${sanitizeKey(m.suggestionName)}/cover`} prompt={`Cocktail photography of ${m.suggestionName}`} alt={m.suggestionName} className="w-full h-full object-cover" devMode={devMode} />
                    </div>
                    <div className="p-3 bg-[#1a0808]">
                        <p className="text-white font-black text-sm mb-1 truncate">{m.suggestionName}</p>
                        <div className="flex items-center justify-between">
                        <span className="text-[10px] text-stone-400">View recipe</span>
                        <div className="p-1.5 bg-[#ec1337] rounded-full text-white"><ChevronRight size={14} /></div>
                        </div>
                    </div>
                    </div>
                </div>
                )}
            </div>
            ))}
            {isTyping && (
            <div className="flex justify-start">
                <div className="bg-[#1f0a0a] border border-[#3d1a1a] p-4 rounded-3xl flex gap-2">
                <div className="w-2 h-2 bg-[#ec1337] rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-[#ec1337] rounded-full animate-bounce delay-150" />
                </div>
            </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="p-4 bg-[#0f0505] border-t border-[#3d1a1a] flex gap-2 flex-shrink-0">
            <input 
            className="flex-1 bg-[#1f0a0a] border border-[#3d1a1a] rounded-full px-5 py-3 text-white outline-none focus:border-[#ec1337]" 
            value={input} 
            onChange={e => setInput(e.target.value)} 
            placeholder={`Talk to ${PERSONA_DATA[persona].name}...`} 
            />
            <button type="submit" className="p-4 bg-[#ec1337] rounded-full text-white active:scale-90"><ArrowRight size={20} /></button>
        </form>
      </div>
    </div>
  );
};
