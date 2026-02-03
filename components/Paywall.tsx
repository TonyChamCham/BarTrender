
import React, { useState } from 'react';
import { Lock, Gift, X, CheckCircle2 } from 'lucide-react';
import { Button } from './Button';
import { FirebaseService } from '../services/firebaseService';

interface PaywallProps {
  reason: 'recipe' | 'camera' | 'chat' | 'generic';
  onSuccess: () => void;
  onBack: () => void;
}

export const Paywall: React.FC<PaywallProps> = ({ reason, onSuccess, onBack }) => {
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);

  const benefits = [
    { id: 'camera', text: "Use the <strong class='text-white'>AI Camera</strong> to identify cocktails." },
    { id: 'recipe', text: "Unlock the catalogue of <strong class='text-white'>Premium Recipes</strong>." },
    { id: 'chat', text: "Chat with your <strong class='text-white'>AI Bartender</strong> for advice." },
    { id: 'generic', text: "Access <strong class='text-white'>Signature Mixes</strong> by BarTrender." }
  ].sort((a,b) => a.id === reason ? -1 : 1);

  const handleRedeemCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCodeInput.trim()) return;
    setIsRedeeming(true);
    try {
      const deviceId = localStorage.getItem('bt_device_id') || Math.random().toString(36).substring(7);
      localStorage.setItem('bt_device_id', deviceId);
      await FirebaseService.redeemPromoCode(promoCodeInput, deviceId);
      onSuccess();
    } catch (err: any) {
      alert(err.toString());
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <div className="h-full w-full bg-[#0f0505] relative overflow-hidden flex flex-col pt-32 landscape:pt-24 lg:pt-0 px-6 pb-6">
      {showPromoInput && (
        <div className="absolute inset-0 z-[110] bg-[#0f0505]/95 backdrop-blur-md flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-sm bg-[#1f0a0a] border border-[#3d1a1a] rounded-3xl p-6 relative">
            <button onClick={() => setShowPromoInput(false)} className="absolute top-4 right-4 text-stone-500"><X size={20} /></button>
            <Gift size={32} className="text-[#ec1337] mb-3 mx-auto" />
            <h3 className="text-xl font-bold text-white mb-6">Redeem Code</h3>
            <form onSubmit={handleRedeemCode} className="space-y-4">
              <input 
                type="text" 
                className="w-full bg-[#0f0505] border border-[#3d1a1a] rounded-xl p-4 text-center text-white uppercase tracking-widest font-mono" 
                placeholder="CODE-HERE" 
                value={promoCodeInput} 
                onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())} 
              />
              <Button fullWidth type="submit" isLoading={isRedeeming}>Unlock</Button>
            </form>
          </div>
        </div>
      )}

      {/* MAIN CONTENT WRAPPER */}
      {/* lg:justify-center to center vertically on tablet */}
      <div className="flex-1 flex flex-col items-center justify-start lg:justify-center min-h-0 w-full">
          
          {/* CONTENT CONTAINER */}
          {/* Mobile Landscape: Max width larger. Tablet: Scale up 125% (md: for portrait tablet, lg: for landscape) */}
          <div className="w-full max-w-sm landscape:max-w-4xl lg:max-w-sm flex flex-col landscape:flex-col lg:flex-col gap-6 md:transform md:scale-110 lg:scale-125 lg:origin-center transition-transform">
            
            {/* HEADER: TITLE + ICON */}
            {/* Mobile Landscape: Tighter vertical spacing (mt-0) to stay close to header */}
            <div className="flex flex-col landscape:flex-row lg:landscape:flex-col items-center justify-center gap-3 landscape:gap-4 lg:gap-3 landscape:mt-0">
                {/* ICON */}
                <div className="w-14 h-14 landscape:w-8 landscape:h-8 lg:landscape:w-16 lg:landscape:h-16 bg-gradient-to-br from-[#ec1337] to-[#a50d27] rounded-full flex items-center justify-center shadow-xl shadow-[#ec1337]/20 flex-shrink-0 transition-all">
                    <Lock className="text-white w-6 h-6 landscape:w-4 landscape:h-4 lg:landscape:w-7 lg:landscape:h-7" />
                </div>
                {/* TITLE */}
                <h2 className="text-xl landscape:text-lg lg:landscape:text-2xl font-black text-white leading-tight text-center">
                    Unlock Bar<span className="text-[#ec1337]">Trender</span> Premium
                </h2>
            </div>

            {/* SPLIT VIEW FOR MOBILE LANDSCAPE */}
            {/* landscape:items-stretch makes both children same height */}
            <div className="flex flex-col landscape:flex-row lg:landscape:flex-col gap-4 landscape:gap-6 lg:gap-6 w-full landscape:items-stretch lg:landscape:items-center">
                
                {/* LEFT: BENEFITS */}
                {/* Landscape: Takes 50% width. Flex column + justify-center to vertically center content if needed, or grow to match height */}
                <div className="w-full landscape:w-1/2 lg:landscape:w-full flex flex-col justify-center">
                    <div className="w-full h-full bg-[#161616] rounded-2xl border border-[#3d1a1a] p-4 text-left space-y-3 shadow-inner flex flex-col justify-center">
                        <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-0.5 px-1">Benefits included:</p>
                        {benefits.map(b => (
                        <div key={b.id} className="flex items-start gap-3">
                            <CheckCircle2 className="text-[#17B67F] flex-shrink-0 mt-0.5" size={16} />
                            <span className="text-stone-300 text-[13px] leading-snug whitespace-normal landscape:whitespace-nowrap lg:landscape:whitespace-normal" dangerouslySetInnerHTML={{ __html: b.text }} />
                        </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT: BUTTONS */}
                {/* Landscape: Takes 50% width. Justify center/between to fill height. */}
                <div className="w-full landscape:w-1/2 lg:landscape:w-full space-y-2 flex flex-col justify-between landscape:justify-between lg:landscape:justify-center">
                    <button onClick={onSuccess} className="w-full min-h-[52px] bg-[#161616] border border-[#3d1a1a] p-3 px-4 rounded-2xl flex items-center justify-between text-white font-bold active:scale-[0.98] transition-all hover:bg-[#1f0a0a]">
                        <span className="flex flex-col items-start">
                            <span className="text-sm font-black">24-Hour Pass</span>
                            <span className="text-[9px] text-stone-500 uppercase font-black tracking-tight">One day access</span>
                        </span>
                        <span className="text-emerald-400 text-lg font-black">$0.99</span>
                    </button>
                    
                    <button onClick={onSuccess} className="w-full min-h-[58px] bg-[#161616] border-2 border-[#ec1337] p-3 px-4 rounded-2xl flex items-center justify-between text-white font-bold relative shadow-lg active:scale-[0.98] transition-all hover:bg-[#1f0a0a]">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-[#ec1337] text-white text-[7px] px-2 py-0.5 rounded-b-lg font-black uppercase tracking-tighter">MOST POPULAR</div>
                        <span className="flex flex-col items-start mt-1">
                            <span className="text-sm font-black">Monthly Subscription</span>
                            <span className="text-[9px] text-stone-500 uppercase font-black tracking-tight">Full access</span>
                        </span>
                        <span className="text-emerald-400 text-lg font-black">$4.99</span>
                    </button>
                    
                    <button onClick={onSuccess} className="w-full min-h-[52px] bg-[#161616] border border-[#3d1a1a] p-3 px-4 rounded-2xl flex items-center justify-between text-white font-bold active:scale-[0.98] transition-all hover:bg-[#1f0a0a]">
                        <span className="flex flex-col items-start">
                            <span className="text-sm font-black">Yearly Access</span>
                            <span className="text-[9px] text-stone-500 uppercase font-black tracking-tight">Save 33%</span>
                        </span>
                        <span className="text-emerald-400 text-lg font-black">$39.99</span>
                    </button>
                </div>
            </div>

          </div>

      </div>
      
      {/* FOOTER - Always at bottom */}
      <div className="flex items-center justify-center gap-6 mt-auto flex-shrink-0 landscape:mt-2 lg:landscape:mt-auto py-4">
        <button onClick={() => alert("Restore Purchases request sent.")} className="text-stone-600 text-[10px] font-bold hover:text-stone-400 transition-colors">Restore Purchases</button>
        <div className="h-3 w-px bg-stone-800" />
        <button onClick={() => setShowPromoInput(true)} className="text-stone-600 text-[10px] font-bold hover:text-stone-400 transition-colors">Redeem Code</button>
      </div>
    </div>
  );
};
