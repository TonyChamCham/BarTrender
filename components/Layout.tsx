
import React from 'react';
import { Wine, ArrowLeft, Heart, Code2, Database } from 'lucide-react';

// SET THIS TO TRUE IF YOU WANT THE DEV TOOLS BACK
const SHOW_DEV_TOOLS = false;

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  onBack?: () => void;
  showBack?: boolean;
  stickyHeaderContent?: React.ReactNode;
  isNonAlcoholic: boolean;
  onToggleNonAlcoholic: () => void;
  isShotsMode: boolean;
  onToggleShotsMode: () => void;
  isSubscribed: boolean;
  onToggleSubscribe: () => void;
  devMode: boolean;
  onToggleDevMode: () => void;
  onOpenFavorites: () => void;
  onOpenChat?: () => void;
  onOpenCatalog?: () => void; 
  hideToolbar?: boolean;
  hideModeBar?: boolean; 
  hideHeader?: boolean; // Nouvelle prop
  tabsContent?: React.ReactNode; 
}

export const Layout: React.FC<LayoutProps> = ({ 
    children, 
    title, 
    onBack, 
    showBack,
    stickyHeaderContent,
    isNonAlcoholic,
    onToggleNonAlcoholic,
    isShotsMode,
    onToggleShotsMode,
    isSubscribed,
    onToggleSubscribe,
    devMode,
    onToggleDevMode,
    onOpenFavorites,
    onOpenChat,
    onOpenCatalog,
    hideToolbar = false,
    hideModeBar = false,
    hideHeader = false,
    tabsContent
}) => {
  
  const getBadgeText = () => {
      if (devMode) return 'DEV';
      if (!isSubscribed) return 'FREE';
      return 'PREMIUM';
  };

  const getBadgeStyle = () => {
     if (devMode) return "text-orange-500 border-orange-500/50";
     if (isSubscribed) return "text-[#ec1337] border-[#ec1337]";
     return "text-stone-500 border-stone-700";
  };

  const getAiBarmanIcon = () => {
      const baseUrl = "https://firebasestorage.googleapis.com/v0/b/mixmaster-ai-2fe73.firebasestorage.app/o/images%2Ficons%2F";
      const suffix = "?alt=media";
      if (isNonAlcoholic && isShotsMode) return `${baseUrl}260111_barmanAI_icon_no-alc_shot.png${suffix}`;
      if (isNonAlcoholic) return `${baseUrl}260111_barmanAI_icon_no-alc.png${suffix}`;
      if (isShotsMode) return `${baseUrl}260111_barmanAI_icon_shot.png${suffix}`;
      return `${baseUrl}260111_barmanAI_icon.png${suffix}`;
  };

  // Helper for Halo Color Logic - Utilisation d'ombres centrées (0 0 15px) au lieu de l'ombre par défaut décalée
  const getHaloColorClass = () => {
      if (isNonAlcoholic && isShotsMode) return "shadow-[0_0_15px_rgba(23,182,127,0.6)] border-[#17B67F]";
      if (isNonAlcoholic) return "shadow-[0_0_15px_rgba(23,182,127,0.6)] border-[#17B67F]";
      if (isShotsMode) return "shadow-[0_0_15px_rgba(243,65,95,0.6)] border-[#F3415F]";
      return "shadow-[0_0_15px_rgba(236,19,55,0.6)] border-[#ec1337]"; // Default Red Glow
  };

  const ModeBarCompact = () => (
    <div className="flex items-center gap-1.5 h-full justify-end pr-1">
        <button 
            onClick={onToggleNonAlcoholic} 
            className={`flex items-center justify-center px-3 py-1.5 rounded-lg border transition-all active:scale-95 whitespace-nowrap h-9 ${
                isNonAlcoholic ? 'bg-[#17B67F]/20 text-[#17B67F] border-[#17B67F]/40' : 'bg-[#1f0a0a] border-[#3d1a1a] text-stone-500'
            }`}
        >
            <span className="text-[10px] font-black uppercase">No Alcohol</span>
        </button>
        <button 
            onClick={onToggleShotsMode} 
            className={`flex items-center justify-center px-3 py-1.5 rounded-lg border transition-all active:scale-95 whitespace-nowrap h-9 ${
                isShotsMode ? 'bg-[#F3415F]/20 text-[#F3415F] border-[#F3415F]/40' : 'bg-[#1f0a0a] border-[#3d1a1a] text-stone-500'
            }`}
        >
            <span className="text-[10px] font-black uppercase">Shots</span>
        </button>
    </div>
  );

  return (
    <div className="h-[100dvh] flex flex-col w-full bg-[#0f0505] overflow-hidden relative border-x border-[#2a1010] mx-auto max-w-[1600px]">
      
      {/* --- HEADER --- */}
      {!hideHeader && (
        <header 
            className={`absolute top-0 left-0 right-0 z-50 bg-[#0f0505]/50 backdrop-blur-md border-b border-[#2a1010] transition-all shadow-xl shadow-black/20 flex flex-col pt-2`}
        >
            {/* 
                TOP ROW: 
                - Portrait: h-16 (64px) + pt-safe (Safe Area)
                - Landscape: h-16 (64px) FIXED. No weird padding. 
                - Flex items centered perfectly.
            */}
            <div 
                className={`
                    flex items-center justify-between px-4 w-full gap-2 relative 
                    pt-[env(safe-area-inset-top)] 
                    ${tabsContent ? 'landscape:h-auto' : 'h-16 portrait:pt-2 landscape:h-16 lg:landscape:h-14'}
                `}
            >
                
                {/* LEFT: Logo area */}
                <div className="flex items-center flex-shrink-0 mr-1 z-20 h-full">
                    {showBack && (
                        <button onClick={onBack} className="p-2 mr-2 -ml-2 hover:bg-[#1f0a0a] rounded-full text-slate-200 active:scale-90 transition-all">
                            <ArrowLeft size={22} strokeWidth={2.5} />
                        </button>
                    )}
                    <div className="relative flex flex-row items-center">
                        <div className="flex items-center -space-x-1 relative z-10">
                            <Wine className="text-[#ec1337] flex-shrink-0" size={26} strokeWidth={2.5} />
                            <h1 className="text-lg font-black text-slate-100 tracking-tight translate-y-[1px] pr-2">
                                {(!title || title === 'BarTrender') ? <span>Bar<span className="text-[#ec1337]">Trender</span></span> : title}
                            </h1>
                        </div>
                        
                        <button 
                            onClick={onToggleSubscribe} 
                            className={`
                                transition-all border bg-[#1f0a0a] px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-widest whitespace-nowrap
                                translate-y-[1px]
                                ${getBadgeStyle()}
                            `}
                        >
                            {getBadgeText()}
                        </button>
                    </div>
                </div>

                {/* CONTAINER RIGHT */}
                <div className="flex-1 flex items-center justify-end min-w-0 h-full">
                    
                    {/* CENTER (Mobile Landscape Only) */}
                    <div className="hidden landscape:flex lg:landscape:hidden flex-1 items-center justify-end min-w-0 h-full mr-2">
                        {stickyHeaderContent && <div className="h-9 flex-grow min-w-[100px] max-w-[250px]">{stickyHeaderContent}</div>}
                        {!hideModeBar && <div className="flex-shrink-0 ml-2"><ModeBarCompact /></div>}
                    </div>
                    
                    {/* RIGHT: Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0 h-full">
                        {/* Chat Button (Mobile Landscape) - Fixed size and alignment */}
                        {onOpenChat && (
                            <button 
                                onClick={onOpenChat}
                                className={`hidden landscape:flex lg:landscape:hidden w-15 h-[55px] rounded-lg bg-[#1f0a0a] border items-center justify-center overflow-hidden active:scale-95 mr-2 ${getHaloColorClass()}`}
                            >
                                <img src={getAiBarmanIcon()} alt="AI" className="w-full h-full object-cover object-bottom scale-110" />
                            </button>
                        )}

                        {devMode && SHOW_DEV_TOOLS && (
                            <button onClick={onOpenCatalog} className="p-2 rounded-full text-stone-300 hover:text-emerald-500 transition-colors">
                                <Database size={18} strokeWidth={2.5} />
                            </button>
                        )}
                        
                        {SHOW_DEV_TOOLS && (
                            <button onClick={onToggleDevMode} className={`p-2 rounded-full transition-colors landscape:hidden lg:landscape:block ${devMode ? 'text-red-400' : 'text-stone-500 hover:text-stone-300'}`}>
                                <Code2 size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* --- PORTRAIT TOOLBAR --- */}
            {!hideToolbar && (
                <div className="px-4 pb-3 pt-2 flex items-center gap-3 landscape:hidden lg:landscape:flex">
                    <div className="flex-1 flex flex-col gap-1 min-w-0 justify-center">
                        {stickyHeaderContent && (
                            <div className="h-[37px] w-full">
                                {stickyHeaderContent}
                            </div>
                        )}
                        {!hideModeBar && (
                            <div className="flex items-center gap-2 h-8 w-full">
                                <button onClick={onToggleNonAlcoholic} className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl border transition-all active:scale-95 px-3 h-full ${isNonAlcoholic ? 'bg-[#17B67F]/20 text-[#17B67F] border-[#17B67F]/40 shadow-lg shadow-[#17B67F]/10' : 'bg-[#1f0a0a] border-[#3d1a1a] text-stone-300'}`}>
                                    <span className="text-[9px] font-black uppercase tracking-wider">No Alcohol</span>
                                </button>
                                <button onClick={onToggleShotsMode} className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl border transition-all active:scale-95 px-3 h-full ${isShotsMode ? 'bg-[#F3415F]/20 text-[#F3415F] border-[#F3415F]/40 shadow-lg shadow-[#F3415F]/10' : 'bg-[#1f0a0a] border-[#3d1a1a] text-stone-300'}`}>
                                    <span className="text-[9px] font-black uppercase tracking-wider">Shots</span>
                                </button>
                            </div>
                        )}
                    </div>
                    {/* HALO EFFECT (Dynamic Color) */}
                    {onOpenChat && (
                        <button onClick={onOpenChat} className={`w-[62px] h-[70px] rounded-2xl flex flex-col items-center justify-center active:scale-95 bg-[#1f0a0a] border hover:scale-105 transition-all group overflow-hidden flex-shrink-0 z-10 ${getHaloColorClass()}`}>
                            <img src={getAiBarmanIcon()} alt="AI" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = "https://firebasestorage.googleapis.com/v0/b/mixmaster-ai-2fe73.firebasestorage.app/o/images%2Ficons%2F260111_barmanAI_icon.png?alt=media"; }} />
                        </button>
                    )}
                </div>
            )}

            {/* TABS */}
            {tabsContent && (
                <div className="flex items-center gap-0 border-t border-[#2a1010] bg-[#0f0505]/20 backdrop-blur-md overflow-hidden portrait:py-3 portrait:px-4 landscape:py-1 landscape:px-2 landscape:h-10 landscape:mt-[10px] lg:landscape:mt-0 lg:landscape:py-3 lg:landscape:px-4 lg:landscape:h-auto">
                    {tabsContent}
                </div>
            )}
        </header>
      )}

      <main id="main-scroll-container" className="flex-1 overflow-y-auto relative bg-[#0f0505]">
          {children}
      </main>
    </div>
  );
};
