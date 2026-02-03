
import React, { useState, useEffect, useRef } from 'react';
import { Layout } from './components/Layout';
import { Button } from './components/Button';
import { AppView, CocktailSummary, CocktailFullDetails, SearchType } from './types';
import { 
  searchCocktails, getCocktailDetails, getCuratedSuggestions, identifyCocktail, chatWithBartender,
  BartenderPersona, PERSONA_DATA, getSeasonalCocktails, sanitizeKey, getAiMixes, generateImage
} from './services/geminiService';
import { FirebaseService } from './services/firebaseService';
import { Search, Camera, Loader2, Shuffle, Flame, Calendar, Wine, Bot, HeartOff, Heart, AlertTriangle } from 'lucide-react';

// Modulized Components
import { CocktailCard } from './components/CocktailCard';
import { Paywall } from './components/Paywall';
import { BartenderChat } from './components/BartenderChat';
import { CocktailDetails } from './components/CocktailDetails';
import { MixingGuide } from './components/MixingGuide';
import { CameraView } from './components/CameraView';
import { DevGrid } from './components/DevGrid';
import { SmartImage } from './components/SmartImage';
import { AgeGate } from './components/AgeGate';

type HomeTab = 'seasonal' | 'trending' | 'ai-mixes' | 'random' | 'favorites';

const PLACEHOLDERS = [
    "Cocktail, ingredient, mood",
    "B-52, mint, detox",
    "Cosmopolitan, party",
    "Whiskey, sour, classy",
    "Gin, tonic, refresh",
    "Tequila, lime, spicy",
    "Mocktail, fruit, fresh"
];

// Helper to get next month name in ENGLISH
const getMonthName = (offset: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + offset);
    return d.toLocaleString('en-US', { month: 'long' });
};

// Generates an illustrative prompt based on the month/season
const getSeasonalPrompt = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('january')) return "Cozy winter bar interior, snowy window, warm fireplace glow, cinematic lighting, 8k";
    if (t.includes('february')) return "Romantic cocktail bar, valentines day atmosphere, red roses, soft candle lighting, cinematic";
    if (t.includes('march')) return "St Patrick's Day pub atmosphere, green ambient lighting, clover decorations, cinematic, lively";
    if (t.includes('april')) return "Spring garden cocktail bar, cherry blossoms, fresh daylight, pastel colors, cinematic";
    if (t.includes('may')) return "Blooming flowers, bright spring cocktail terrace, sunny, cinematic, vibrant";
    if (t.includes('june')) return "Early summer rooftop bar, sunshine, blue sky, refreshing vibe, cinematic";
    if (t.includes('july')) return "Beach bar at sunset, tiki torches, summer vibes, ocean background, cinematic";
    if (t.includes('august')) return "Hot summer night, vibrant neon city bar, energetic atmosphere, cinematic, sweaty glass";
    if (t.includes('september')) return "Golden hour bar, late summer transition to autumn, warm light, harvest vibe, cinematic";
    if (t.includes('october')) return "Halloween themed bar, pumpkins, spooky elegant atmosphere, cinematic, dark moody lighting";
    if (t.includes('november')) return "Cozy autumn evening, rain on window, warm amber lighting, rustic bar, cinematic";
    if (t.includes('december')) return "Christmas decorated bar, festive lights, snowy window, holiday magic, cinematic";
    return "Elegant high-end cocktail bar, cinematic lighting, atmospheric, blurred background";
};

// Divider Component using SmartImage - FULL WIDTH/HEIGHT DESIGN
const SeasonDivider: React.FC<{ title: string, devMode: boolean }> = ({ title, devMode }) => {
    const prompt = getSeasonalPrompt(title);
    const cacheKey = `seasonal/divider/${sanitizeKey(title)}`;

    return (
        <div className="col-span-1 sm:col-span-2 lg:col-span-4 w-full h-40 relative overflow-hidden rounded-3xl shadow-2xl my-6 group">
             {/* Full Background Image */}
             <div className="absolute inset-0 w-full h-full">
                <SmartImage 
                    cacheKey={cacheKey}
                    prompt={prompt}
                    alt={title}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 opacity-80"
                    devMode={devMode}
                    onRegenerate={(p, mod, src) => generateImage(p, cacheKey, true, mod, src)}
                />
             </div>
             
             {/* Gradient Overlay for Text Contrast */}
             <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />
             
             {/* Centered Text */}
             <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-4 text-center">
                 <h3 className="text-white text-lg md:text-xl font-black uppercase tracking-[0.3em] drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] border-b-2 border-[#ec1337] pb-1">
                    {title}
                 </h3>
             </div>
        </div>
    );
};

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [splashFading, setSplashFading] = useState(false);
  const [logoAnimating, setLogoAnimating] = useState(true);
  
  // New State for Age Gate
  const [showAgeGate, setShowAgeGate] = useState(false);
  
  const [viewStack, setViewStack] = useState<AppView[]>([AppView.HOME]);
  const view = viewStack[viewStack.length - 1];

  const [paywallReason, setPaywallReason] = useState<'recipe' | 'camera' | 'chat' | 'generic'>('generic');
  const [pendingCocktailSummary, setPendingCocktailSummary] = useState<CocktailSummary | null>(null);
  const [pendingChatMessage, setPendingChatMessage] = useState<string | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [lastAnalyzedImage, setLastAnalyzedImage] = useState<string | null>(null);
  const [isImageSearch, setIsImageSearch] = useState(false);
  
  const [selectedCocktail, setSelectedCocktail] = useState<CocktailFullDetails | null>(null);
  const [isNonAlcoholic, setIsNonAlcoholic] = useState(false);
  const [isShotsMode, setIsShotsMode] = useState(false);
  const [unitSystem, setUnitSystem] = useState<'US' | 'Metric'>('US');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [devMode, setDevMode] = useState(false);
  
  const [favorites, setFavorites] = useState<CocktailSummary[]>([]);
  const [curatedList, setCuratedList] = useState<CocktailSummary[]>([]); 
  const [seasonalList, setSeasonalList] = useState<CocktailSummary[]>([]);
  const [aiMixesList, setAiMixesList] = useState<CocktailSummary[]>([]);
  const [searchResults, setSearchResults] = useState<CocktailSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [placeholder, setPlaceholder] = useState(PLACEHOLDERS[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  
  // STATES POUR LA GESTION DE L'INFINITE SCROLL
  const [isSeasonalLoading, setIsSeasonalLoading] = useState(false);
  const [seasonalError, setSeasonalError] = useState(false);
  const [hasMoreSeasonal, setHasMoreSeasonal] = useState(true);
  const [displayCount, setDisplayCount] = useState(8);
  
  const [mixingStep, setMixingStep] = useState(0);
  const [activeTab, setActiveTab] = useState<HomeTab>('seasonal');
  const [seasonalOffset, setSeasonalOffset] = useState(0); 
  
  const [chatHistories, setChatHistories] = useState<Record<BartenderPersona, any[]>>(() => {
    const initial: any = {};
    (Object.keys(PERSONA_DATA) as BartenderPersona[]).forEach(p => {
      initial[p] = [{ role: 'model', text: PERSONA_DATA[p].welcomeMessage }];
    });
    return initial;
  });
  const [bartenderPersona, setBartenderPersona] = useState<BartenderPersona>('classic');
  const [isTyping, setIsTyping] = useState(false);

  // SCROLL RESTORATION REF (Per Tab)
  const scrollPositionsRef = useRef<Record<string, number>>({});

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchDebounceRef = useRef<any>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const getScrollContainer = () => document.getElementById('main-scroll-container');

  useEffect(() => {
    const timerAnim = setTimeout(() => setLogoAnimating(false), 1500);
    const timerFade = setTimeout(() => setSplashFading(true), 2500);
    const timerRemove = setTimeout(() => {
        setShowSplash(false);
        // Check if we need to show age gate (could use localstorage to show only once, but for hackathon demo showing it every time is safer/cleaner)
        setShowAgeGate(true);
    }, 3200);
    return () => { clearTimeout(timerAnim); clearTimeout(timerFade); clearTimeout(timerRemove); };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('bartrender_fav_objects');
    if (saved) setFavorites(JSON.parse(saved));
    setPlaceholder(PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)]);
  }, []);

  useEffect(() => {
    getCuratedSuggestions(isShotsMode, isNonAlcoholic).then(list => {
        setCuratedList(list);
    });
    getAiMixes(isShotsMode, isNonAlcoholic).then(list => {
        setAiMixesList(list);
    });
    fetchSeasonal(0, true); // Reset to 0 when mode changes
  }, [isNonAlcoholic, isShotsMode]);

  // BACKGROUND DB POPULATION LOGIC
  useEffect(() => {
    let isCancelled = false;
    const populateDB = async () => {
        const listToProcess = activeTab === 'seasonal' ? seasonalList : activeTab === 'ai-mixes' ? aiMixesList : curatedList;
        if (listToProcess.length === 0) return;
        for (const cocktail of listToProcess) {
            if (isCancelled) break;
            if (cocktail.isDivider) continue; // Skip dividers
            await getCocktailDetails(cocktail.name, isNonAlcoholic, isShotsMode);
            await new Promise(r => setTimeout(r, 2000));
        }
    };
    const timeout = setTimeout(populateDB, 3000);
    return () => { isCancelled = true; clearTimeout(timeout); };
  }, [seasonalList, curatedList, aiMixesList, activeTab, isNonAlcoholic, isShotsMode]);

  // RESTORE SCROLL ON TAB CHANGE
  useEffect(() => {
      if (view === AppView.HOME) {
          const container = getScrollContainer();
          if (container) {
              container.scrollTop = scrollPositionsRef.current[activeTab] || 0;
          }
      }
  }, [activeTab, view]);

  useEffect(() => {
    if (view === AppView.HOME) {
        setPlaceholder(PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)]);
        setIsImageSearch(false);
        setLastAnalyzedImage(null);
        setSearchQuery('');
        
        const container = getScrollContainer();
        if (container) {
            setTimeout(() => {
                container.scrollTop = scrollPositionsRef.current[activeTab] || 0;
            }, 0);
        }
    }
  }, [view]);

  // Infinite Scroll Logic - FRICTIONLESS
  useEffect(() => {
      const container = getScrollContainer();
      
      const observer = new IntersectionObserver(
          (entries) => {
              if (entries[0].isIntersecting) {
                  const currentList = getActiveList();
                  
                  // Logic for Normal Lists
                  if (activeTab !== 'seasonal' && displayCount < currentList.length) {
                      setDisplayCount(prev => prev + 6);
                  } 
                  
                  // Logic for Seasonal Infinite Scroll (Fetch Next Month)
                  // CRITICAL CHECK: hasMoreSeasonal must be true AND no error
                  else if (activeTab === 'seasonal' && hasMoreSeasonal && !seasonalError) {
                      if (displayCount < currentList.length) {
                           setDisplayCount(prev => prev + 6);
                      } else if (!isSeasonalLoading) {
                           // Frictionless: Load next month automatically when sentinel is seen
                           const nextOffset = seasonalOffset + 1;
                           setSeasonalOffset(nextOffset);
                           fetchSeasonal(nextOffset, false);
                      }
                  }
              }
          },
          { 
              root: container || null,
              threshold: 0.1,
              rootMargin: '600px' // Huge margin to trigger load well before user hits bottom
          }
      );
      
      if (loadMoreRef.current) observer.observe(loadMoreRef.current);
      return () => observer.disconnect();
  }, [loadMoreRef, displayCount, activeTab, seasonalList, curatedList, aiMixesList, favorites, isSeasonalLoading, seasonalOffset, hasMoreSeasonal, seasonalError]);


  const handleToggleFav = (cocktail: CocktailSummary) => {
    setFavorites(prev => {
        const isAlreadyFav = prev.some(f => f.name === cocktail.name);
        const increment = isAlreadyFav ? -1 : 1;
        
        let next: CocktailSummary[];
        if (isAlreadyFav) {
            next = prev.filter(f => f.name !== cocktail.name);
        } else {
            next = [...prev, { ...cocktail, likes: (cocktail.likes || 0) + increment }];
        }
        
        localStorage.setItem('bartrender_fav_objects', JSON.stringify(next));
        FirebaseService.syncLike(sanitizeKey(cocktail.name), !isAlreadyFav).catch(e => console.warn(e));
        
        const updateFn = (list: CocktailSummary[]) => list.map(c => c.name === cocktail.name ? { ...c, likes: (c.likes || 0) + increment } : c);
        setCuratedList(updateFn);
        setSeasonalList(updateFn);
        setAiMixesList(updateFn);
        setSearchResults(updateFn);

        if (selectedCocktail && selectedCocktail.name === cocktail.name) {
            setSelectedCocktail(prevDetails => {
                if (!prevDetails) return null;
                return { ...prevDetails, likes: (prevDetails.likes || 0) + increment };
            });
        }
        return next;
    });
  };

  const popView = () => {
    setViewStack(prev => {
        if (view === AppView.SEARCH && isImageSearch) {
            return [AppView.HOME];
        }
        return prev.length > 1 ? prev.slice(0, -1) : prev;
    });
  };

  const handleToggleNonAlcoholic = () => {
    const newVal = !isNonAlcoholic;
    setIsNonAlcoholic(newVal);
    // IMMEDIATE CLEANUP
    setSeasonalList([]);
    setCuratedList([]);
    setAiMixesList([]);
    if (view === AppView.DETAILS && selectedCocktail) {
        fetchAndShowCocktailDetails(selectedCocktail, newVal, isShotsMode);
    }
  };

  const handleToggleShotsMode = () => {
    const newVal = !isShotsMode;
    setIsShotsMode(newVal);
    // IMMEDIATE CLEANUP
    setSeasonalList([]);
    setCuratedList([]);
    setAiMixesList([]);
    if (view === AppView.DETAILS && selectedCocktail) {
        fetchAndShowCocktailDetails(selectedCocktail, isNonAlcoholic, newVal);
    }
  };

  const pushView = (newView: AppView) => {
    setViewStack(prev => {
        if (prev[prev.length - 1] === newView) return prev;
        return [...prev, newView];
    });
  };

  const fetchSeasonal = async (offset = 0, reset = false) => {
    // If reset, clear list and start over
    if (reset) {
        setSeasonalList([]);
        setSeasonalOffset(0);
        setIsSeasonalLoading(true);
        setHasMoreSeasonal(true);
        setSeasonalError(false);
        
        const list = await getSeasonalCocktails(isShotsMode, isNonAlcoholic, 0);
        
        if (list.length === 0) {
            setSeasonalError(true);
            setHasMoreSeasonal(false); // STOP LOOP
        } else {
            setSeasonalList(list);
        }
        setIsSeasonalLoading(false);
        return;
    }

    if (!hasMoreSeasonal) return;

    setIsSeasonalLoading(true);
    const newItems = await getSeasonalCocktails(isShotsMode, isNonAlcoholic, offset);
    
    // CRITICAL FIX: If API fails or returns empty, stop the loop
    if (newItems.length === 0) {
        setHasMoreSeasonal(false);
        setIsSeasonalLoading(false);
        // Do NOT set error here, just stop loading more
        return; 
    }
    
    // Create Divider
    const nextMonthName = getMonthName(offset);
    const divider: CocktailSummary = {
        name: `divider-${offset}`,
        description: '',
        tags: [],
        isDivider: true,
        dividerTitle: `Heading into ${nextMonthName}...`,
        dividerMonth: nextMonthName
    };

    setSeasonalList(prev => [...prev, divider, ...newItems]);
    setIsSeasonalLoading(false);
  };

  const handleShare = async (cocktailName: string) => {
    const text = `Check out this amazing cocktail I found on BarTrender: ${cocktailName}! 🍸✨`;
    const url = window.location.href;
    try {
        await navigator.clipboard.writeText(`${text} ${url}`);
        if (navigator.share) { await navigator.share({ title: 'BarTrender', text, url }); } 
        else { alert("Link copied to clipboard! Ready to share."); }
    } catch (e) { alert(`Share this manually: ${text} ${url}`); }
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    if (isLoading) return; 
    setIsLoading(true);
    setSearchQuery(query);
    setIsImageSearch(false);
    if (view !== AppView.SEARCH) pushView(AppView.SEARCH);
    
    const allKnownCocktails = [...seasonalList, ...curatedList, ...aiMixesList, ...favorites].filter(c => !c.isDivider);
    
    const results = await searchCocktails(query, SearchType.SMART, isNonAlcoholic, isShotsMode, allKnownCocktails);
    setSearchResults(results);
    setIsLoading(false);
  };

  const handleSearchChange = (val: string) => {
      setSearchQuery(val);
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      if (val.trim().length > 2) {
          searchDebounceRef.current = setTimeout(() => { handleSearch(val); }, 1200);
      }
  };

  const fetchAndShowCocktailDetails = async (summary: CocktailSummary, currentNonAlc = isNonAlcoholic, currentShots = isShotsMode) => {
    if (summary.isDivider) return; // Ignore clicks on dividers
    setIsLoadingDetails(true);
    setSelectedCocktail({ 
      ...summary, 
      ingredients: (summary as any).ingredients || [], 
      tools: (summary as any).tools || [], 
      steps: (summary as any).steps || [], 
      glassType: (summary as any).glassType || '', 
      visualContext: (summary as any).visualContext || '' 
    } as CocktailFullDetails); 
    
    if (view !== AppView.DETAILS) pushView(AppView.DETAILS);
    
    const details = await getCocktailDetails(summary.name, currentNonAlc, currentShots, summary.tags);
    if (details) setSelectedCocktail({ ...details, isPremium: summary.isPremium, likes: summary.likes });
    setIsLoadingDetails(false);
  };

  const handleSelectCocktail = async (summary: CocktailSummary) => {
    if (summary.isDivider) return;
    const container = getScrollContainer();
    if (container) { scrollPositionsRef.current[activeTab] = container.scrollTop; }
    if (summary.isPremium && !isSubscribed && !devMode) {
      setPaywallReason('recipe');
      setPendingCocktailSummary(summary);
      pushView(AppView.PAYWALL);
      return;
    }
    fetchAndShowCocktailDetails(summary);
  };

  const handleSendMessage = async (text: string, forceGranted = false) => {
    if (!isSubscribed && !devMode && !forceGranted) {
      setPaywallReason('chat');
      setPendingChatMessage(text);
      pushView(AppView.PAYWALL);
      return;
    }
    setIsTyping(true);
    const updated = [...chatHistories[bartenderPersona], { role: 'user', text }];
    setChatHistories(prev => ({ ...prev, [bartenderPersona]: updated }));
    try {
      const response = await chatWithBartender(updated, text, bartenderPersona, isNonAlcoholic, isShotsMode);
      setChatHistories(prev => ({ ...prev, [bartenderPersona]: [...updated, { role: 'model', text: response.text, suggestionName: response.suggestionName }] }));
    } catch (err) {
      setChatHistories(prev => ({ ...prev, [bartenderPersona]: [...updated, { role: 'model', text: "Service unavailable." }] }));
    } finally { setIsTyping(false); }
  };

  const handlePaywallSuccess = () => {
    setIsSubscribed(true);
    popView(); 
    if (pendingCocktailSummary) {
      const summary = pendingCocktailSummary;
      setPendingCocktailSummary(null);
      fetchAndShowCocktailDetails(summary);
    } else if (pendingChatMessage) {
      const msg = pendingChatMessage;
      setPendingChatMessage(null);
      pushView(AppView.CHAT);
      handleSendMessage(msg, true);
    } else if (pendingPhoto) {
      const photo = pendingPhoto;
      setPendingPhoto(null);
      processIdentifiedCocktail(photo);
    }
  };

  const handlePaywallBack = () => {
    setPendingCocktailSummary(null);
    setPendingChatMessage(null);
    setPendingPhoto(null);
    popView();
  };

  const processIdentifiedCocktail = async (base64: string) => {
    setIsLoading(true);
    setIsImageSearch(true);
    setLastAnalyzedImage(base64);
    setSearchQuery("Analyzing image...");
    setViewStack([AppView.HOME, AppView.SEARCH]);
    const results = await identifyCocktail(base64, isNonAlcoholic, isShotsMode);
    setSearchResults(results);
    setIsLoading(false);
  };

  const capturePhoto = () => {
    const canvas = document.createElement('canvas');
    if (videoRef.current) {
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg');
      if (!isSubscribed && !devMode) {
          setPendingPhoto(base64);
          setPaywallReason('camera');
          pushView(AppView.PAYWALL);
          return;
      }
      processIdentifiedCocktail(base64);
    }
  };

  const handleCameraClick = () => pushView(AppView.CAMERA);

  const handleSubscribeClick = () => {
      if (!isSubscribed) {
          setPaywallReason('generic');
          pushView(AppView.PAYWALL);
      }
  };

  const searchHeaderContent = (
    <div className={`relative w-full h-10 rounded-2xl p-[1.5px] transition-all duration-300 ${ (isNonAlcoholic && isShotsMode) ? 'bg-gradient-to-r from-[#17B67F] to-[#F3415F]' : isNonAlcoholic ? 'bg-[#17B67F]' : isShotsMode ? 'bg-[#F3415F]' : 'bg-[#3d1a1a]' }`}>
        <div className="relative w-full h-full rounded-2xl overflow-hidden flex items-center pr-12 bg-[#1f0a0a]">
            <input 
                type="text" 
                value={searchQuery} 
                onChange={(e) => handleSearchChange(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)} 
                placeholder={isImageSearch ? "Analyzing image..." : placeholder} 
                className="w-full h-full bg-transparent pl-10 pr-2 text-white placeholder-stone-500 focus:outline-none text-[13px] font-medium" 
            />
            <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isNonAlcoholic ? 'text-[#17B67F]' : isShotsMode ? 'text-[#F3415F]' : 'text-stone-500'}`} size={16} />
            <button onClick={handleCameraClick} className={`absolute right-1 top-1 bottom-1 w-10 rounded-xl flex items-center justify-center text-white active:scale-90 transition-all ${ isShotsMode ? 'bg-[#F3415F]' : isNonAlcoholic ? 'bg-[#17B67F]' : 'bg-[#ec1337]' }`}>
                <Camera size={18} strokeWidth={2.5} />
            </button>
        </div>
    </div>
  );

  const getActiveTabColor = () => {
      if (isNonAlcoholic && isShotsMode) return 'from-[#17B67F] to-[#F3415F]';
      if (isNonAlcoholic) return 'from-[#17B67F] to-[#17B67F]';
      if (isShotsMode) return 'from-[#F3415F] to-[#F3415F]';
      return 'from-[#ec1337] to-[#ec1337]';
  };

  const getActiveIconColor = () => {
      if (isNonAlcoholic && isShotsMode) return 'text-[#17B67F]'; 
      if (isNonAlcoholic) return 'text-[#17B67F]';
      if (isShotsMode) return 'text-[#F3415F]';
      return 'text-[#ec1337]';
  };

  const handleTabChange = (newTab: HomeTab) => {
      if (activeTab === newTab) return;
      const container = getScrollContainer();
      if (container) { scrollPositionsRef.current[activeTab] = container.scrollTop; }
      setActiveTab(newTab);
  };

  const homeTabs = (
    <div className="flex items-center w-full overflow-x-auto hide-scrollbar">
      {(['seasonal', 'trending', 'ai-mixes', 'random', 'favorites'] as const).map(tab => {
        const isActive = activeTab === tab;
        const colorClass = isActive ? `bg-gradient-to-r ${getActiveTabColor()} bg-clip-text text-transparent` : 'text-stone-500';
        const underlineClass = isActive ? `bg-gradient-to-r ${getActiveTabColor()}` : 'bg-transparent';
        const iconColorClass = isActive ? getActiveIconColor() : 'text-stone-500';

        return (
            <button 
                key={tab} 
                onClick={() => handleTabChange(tab)} 
                className="flex-1 min-w-fit px-0 pb-2 pt-1 transition-all"
            >
                <div className="relative flex flex-col items-center gap-1 landscape:gap-0.5 lg:landscape:gap-1.5 w-max mx-auto px-1">
                    <div className={`${iconColorClass} transition-colors duration-300 landscape:hidden lg:landscape:block`}>
                        {tab === 'seasonal' ? <Calendar size={18} /> : 
                         tab === 'trending' ? <Flame size={18} /> : 
                         tab === 'ai-mixes' ? <Bot size={18} /> : 
                         tab === 'random' ? <Shuffle size={18} /> :
                         <Heart size={18} />} 
                    </div>
                    <span className="text-[10px] font-black uppercase whitespace-nowrap"><span className={colorClass}>{tab.replace('-', ' ')}</span></span>
                    <div className={`absolute -bottom-2.5 left-0 right-0 h-[3px] rounded-full transition-all duration-300 ${underlineClass} ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                </div>
            </button>
        );
      })}
    </div>
  );

  const getActiveList = () => {
    if (activeTab === 'favorites') return favorites;
    if (activeTab === 'seasonal') return seasonalList;
    if (activeTab === 'trending') return curatedList.sort((a,b) => (b.likes||0) - (a.likes||0));
    if (activeTab === 'ai-mixes') return aiMixesList;
    return [...curatedList].sort(() => 0.5 - Math.random());
  };
  
  const activeList = getActiveList();

  return (
    <>
      {showSplash && (
        <div className={`fixed inset-0 z-[100] bg-[#0f0505] flex flex-col items-center justify-center transition-opacity duration-1000 ${splashFading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <div className="flex flex-col items-center">
                <Wine size={64} className={`text-[#ec1337] mb-2 ${logoAnimating ? 'animate-bounce' : ''}`} strokeWidth={1.5} />
                <h1 className="text-5xl font-black text-white tracking-tighter mb-2">Bar<span className="text-[#ec1337]">Trender</span></h1>
                <p className="text-stone-500 text-xs font-bold uppercase tracking-[0.4em]">Intelligent Mixology</p>
                <p className="text-[#ec1337] text-[10px] font-mono mt-8 opacity-60">Powered by Google Gemini 3</p>
            </div>
        </div>
      )}
      
      {showAgeGate && !showSplash && (
        <AgeGate onEnter={() => setShowAgeGate(false)} />
      )}
      
      {devMode && <DevGrid />}

      <Layout 
        showBack={viewStack.length > 1} 
        onBack={popView} 
        title={view === AppView.HOME ? (activeTab === 'favorites' ? "My Favorites" : "BarTrender") : undefined} 
        isNonAlcoholic={isNonAlcoholic} onToggleNonAlcoholic={handleToggleNonAlcoholic}
        isShotsMode={isShotsMode} onToggleShotsMode={handleToggleShotsMode}
        isSubscribed={isSubscribed} onToggleSubscribe={handleSubscribeClick}
        devMode={devMode} onToggleDevMode={() => setDevMode(!devMode)}
        onOpenFavorites={() => setActiveTab('favorites')}
        onOpenChat={view === AppView.HOME ? () => pushView(AppView.CHAT) : undefined}
        stickyHeaderContent={view === AppView.HOME || view === AppView.SEARCH ? searchHeaderContent : undefined}
        tabsContent={view === AppView.HOME ? homeTabs : undefined}
        hideToolbar={view === AppView.PAYWALL || view === AppView.MIXING}
        hideModeBar={view === AppView.CAMERA}
        hideHeader={view === AppView.CAMERA}
      >
        {view === AppView.HOME && (
          <div className="px-4 pt-[210px] landscape:pt-[115px] lg:pt-[240px] lg:landscape:pt-[210px] pb-20 w-full mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 lg:landscape:grid-cols-4 gap-x-6 gap-y-3">
            
            {seasonalError && activeTab === 'seasonal' && (
                <div className="col-span-full py-10 flex flex-col items-center text-center px-6">
                    <AlertTriangle size={32} className="text-orange-500 mb-2" />
                    <p className="text-white font-bold mb-1">AI Connection Issue</p>
                    <p className="text-stone-500 text-xs max-w-xs">
                        The AI bartender is taking a break (Key not found or quota exceeded). <br/>
                        Please check your Vercel Environment Variable: <code className="bg-stone-800 px-1 rounded text-orange-300">VITE_API_KEY</code>
                    </p>
                </div>
            )}

            {isSeasonalLoading && activeTab === 'seasonal' && seasonalOffset === 0 ? (
                <div className="py-20 text-center col-span-full"><Loader2 className="animate-spin text-[#ec1337] mx-auto mb-4" size={40} /><p className="text-xs font-bold uppercase text-stone-500">Organic Curation...</p></div>
            ) : 
              activeList.length === 0 && activeTab === 'favorites' ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 px-10 py-20 col-span-full">
                    <HeartOff size={64} className="text-stone-600 mb-6" />
                    <p className="text-lg font-bold text-white mb-2">No favorites yet</p>
                    <p className="text-sm text-stone-400">Save your favorite cocktails to find them here.</p>
                </div>
              ) : (
              <React.Fragment>
                {activeList.slice(0, displayCount).map(c => {
                    if (c.isDivider) {
                        return <SeasonDivider key={c.name} title={c.dividerTitle || ""} devMode={devMode} />;
                    }
                    return (
                        <CocktailCard 
                            key={c.name} 
                            cocktail={c} 
                            isFav={favorites.some(f => f.name === c.name)} 
                            isShotsMode={isShotsMode} 
                            devMode={devMode} 
                            forceNoAlcoholTag={isNonAlcoholic}
                            forceShotTag={isShotsMode}
                            onSelect={handleSelectCocktail} 
                            onToggleFav={() => handleToggleFav(c)} 
                            onShare={handleShare} 
                        />
                    );
                })}
                {/* Frictionless Infinite Scroll Sentinel */}
                <div ref={loadMoreRef} className="h-20 w-full col-span-full flex items-center justify-center mt-4 mb-10 opacity-0 pointer-events-none">
                     {/* Hidden Trigger Area - The observer will hit this */}
                </div>
                {/* Visible Loading State (Only if taking time) */}
                {activeTab === 'seasonal' && isSeasonalLoading && (
                    <div className="col-span-full py-4 flex justify-center">
                        <Loader2 className="animate-spin text-[#ec1337]" size={24} />
                    </div>
                )}
              </React.Fragment>
              )
            }
          </div>
        )}

        {/* ... Rest of components (SEARCH, DETAILS, MIXING, CHAT, CAMERA, PAYWALL) stay exactly the same ... */}
        {view === AppView.SEARCH && (
          <div className="px-4 pt-[160px] landscape:pt-[120px] lg:pt-[160px] lg:landscape:pt-[180px] pb-20 w-full mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {isLoading ? <div className="py-20 text-center col-span-full"><Loader2 className="animate-spin text-[#ec1337] mx-auto mb-4" size={40} /><p className="text-xs font-bold uppercase text-stone-500">{isImageSearch ? "Analyzing Image..." : "Thinking..."}</p></div> : 
              searchResults.length > 0 ? (
                <React.Fragment>
                  {searchResults.map(c => (
                    <CocktailCard 
                        key={c.name} 
                        cocktail={c} 
                        isFav={favorites.some(f => f.name === c.name)} 
                        isShotsMode={isShotsMode} 
                        devMode={devMode} 
                        forceNoAlcoholTag={isNonAlcoholic}
                        forceShotTag={isShotsMode}
                        onSelect={handleSelectCocktail} 
                        onToggleFav={() => handleToggleFav(c)} 
                        onShare={handleShare} 
                    />
                  ))}
                </React.Fragment>
              ) : 
              <div className="text-center py-20 text-stone-500 flex flex-col items-center gap-4 col-span-full">
                  <Bot size={48} className="opacity-20" />
                  <p>No results found for "{searchQuery}"</p>
                  <Button variant="ghost" onClick={popView}>Back</Button>
              </div>
            }
          </div>
        )}

        {view === AppView.DETAILS && selectedCocktail && (
          <div className="h-full pt-[112px] landscape:pt-20 lg:landscape:pt-[112px]">
            <CocktailDetails 
                selectedCocktail={selectedCocktail} 
                unitSystem={unitSystem} onToggleUnit={() => setUnitSystem(unitSystem === 'US' ? 'Metric' : 'US')} 
                devMode={devMode} favorites={favorites.map(f => f.name)} isLoadingDetails={isLoadingDetails} 
                isSaving={false} onToggleFav={() => handleToggleFav(selectedCocktail)} onShare={handleShare} onValidate={() => {}} onStartMixing={() => { setMixingStep(0); pushView(AppView.MIXING); }} 
            />
          </div>
        )}

        {view === AppView.MIXING && selectedCocktail && (
          <MixingGuide selectedCocktail={selectedCocktail} mixingStep={mixingStep} unitSystem={unitSystem} devMode={devMode} onSetStep={setMixingStep} onFinish={() => setViewStack([AppView.HOME])} onBack={popView} onShare={handleShare} />
        )}

        {view === AppView.CHAT && (
          <div className="h-full pt-[115px] landscape:pt-20 lg:landscape:pt-[105px]">
              <BartenderChat 
                history={chatHistories[bartenderPersona]} persona={bartenderPersona} 
                isTyping={isTyping} devMode={devMode} onSendMessage={handleSendMessage} 
                onSwitchPersona={setBartenderPersona} onSelectCocktail={handleSelectCocktail} 
              />
          </div>
        )}

        {view === AppView.CAMERA && (
          <CameraView 
            videoRef={videoRef} 
            fileInputRef={fileInputRef} 
            onCapture={capturePhoto} 
            onClose={popView} 
            onFileUpload={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    const base64 = evt.target?.result as string;
                    if (!isSubscribed && !devMode) {
                        setPendingPhoto(base64);
                        setPaywallReason('camera');
                        pushView(AppView.PAYWALL);
                        return;
                    }
                    processIdentifiedCocktail(base64);
                };
                reader.readAsDataURL(file);
                }
            }} 
          />
        )}

        {view === AppView.PAYWALL && (
          <Paywall reason={paywallReason} onSuccess={handlePaywallSuccess} onBack={handlePaywallBack} />
        )}
      </Layout>
    </>
  );
}
