
import React from 'react';
import { Check, ChevronLeft, Share2 } from 'lucide-react';
import { SmartImage } from './SmartImage';
import { Button } from './Button';
import { CocktailFullDetails } from '../types';
import { sanitizeKey, generateImage } from '../services/geminiService';
import { convertUnitsInString, InstructionWithInlineIngredients } from './Helpers';

interface MixingGuideProps {
  selectedCocktail: CocktailFullDetails;
  mixingStep: number;
  unitSystem: 'US' | 'Metric';
  devMode: boolean;
  onSetStep: (step: number) => void;
  onFinish: () => void;
  onBack: () => void;
  onShare: (name: string) => void;
}

const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        if (type === 'light') navigator.vibrate(10);
        else if (type === 'medium') navigator.vibrate(25);
        else if (type === 'heavy') navigator.vibrate(50);
    }
};

export const MixingGuide: React.FC<MixingGuideProps> = ({
  selectedCocktail,
  mixingStep,
  unitSystem,
  devMode,
  onSetStep,
  onFinish,
  onBack,
  onShare
}) => {
  const isFinished = mixingStep >= selectedCocktail.steps.length;
  const isMetric = unitSystem === 'Metric';

  if (isFinished) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-[#0f0505] pt-20">
        <div className="w-32 h-32 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 mb-6 animate-pulse">
          <Check size={64} />
        </div>
        <h2 className="text-3xl font-black text-white mb-2">Cheers!</h2>
        <p className="text-stone-400 mb-8 max-w-[200px]">Your {selectedCocktail.name} is ready. Enjoy your drink!</p>
        <div className="w-full max-w-md space-y-3">
          <Button fullWidth onClick={() => onShare(selectedCocktail.name)} variant="secondary"><Share2 size={20} className="mr-2" /> Share Result</Button>
          <Button fullWidth onClick={() => { triggerHaptic('medium'); onFinish(); }}>Back to Home</Button>
        </div>
      </div>
    );
  }

  const currentStep = selectedCocktail.steps[mixingStep];
  const vs = currentStep.visualState;
  
  // Force opaque material for shakers
  const isShaker = vs.glass.toLowerCase().includes('shaker') || vs.accessories.toLowerCase().includes('shaker');
  const materialPrompt = isShaker ? "Solid OPAQUE stainless steel metal shaker. NOT transparent. NOT glass. Professional Bar Equipment." : "";

  const detailedPrompt = `High-end cocktail photography. 
  DRINK: ${selectedCocktail.name}.
  BACKGROUND: ${vs.background}.
  CONTAINER: ${vs.glass}. ${materialPrompt}
  EQUIPMENT IN USE: ${vs.accessories}.
  ACTION: ${vs.action}.
  EXPECTED RESULT: ${vs.result}.
  Realistic, detailed, cinematic lighting.`;

  return (
    <div className="w-full h-full flex flex-col landscape:flex-row bg-[#0f0505] overflow-hidden pt-[70px] pb-4 px-4 gap-4">
      
      {/* IMAGE CONTAINER 
          Updated logic based on user feedback:
          - min-h: 30vh (was 15vh)
          - max-h: 45vh (was 35vh)
      */}
      <div className="relative flex-shrink flex-grow-0 basis-auto landscape:flex-none landscape:w-1/2 rounded-3xl overflow-hidden border border-[#3d1a1a] bg-[#1f0a0a] shadow-2xl transition-all min-h-[30vh] max-h-[45vh] landscape:max-h-full landscape:h-full">
        <SmartImage 
          cacheKey={`cocktails/${sanitizeKey(selectedCocktail.name)}/steps/${mixingStep}`} 
          prompt={detailedPrompt} 
          alt="Mixing step" 
          className="w-full h-full object-cover" 
          devMode={devMode} 
          onRegenerate={(p, mod, src) => generateImage(p, `cocktails/${sanitizeKey(selectedCocktail.name)}/steps/${mixingStep}`, true, mod, src)} 
        />
        
        {/* Step Indicator Overlay */}
        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full z-10">
            <span className="text-xs font-black text-white uppercase tracking-widest">
                Step {mixingStep + 1} / {selectedCocktail.steps.length}
            </span>
        </div>
      </div>

      {/* TEXT & CONTROLS CONTAINER */}
      <div className="flex-grow landscape:w-1/2 flex flex-col justify-end gap-3 min-h-0">
        
        {/* INFO BOX */}
        <div className="flex-1 bg-[#1f0a0a] rounded-3xl border border-[#3d1a1a] p-4 landscape:p-6 overflow-hidden flex flex-col items-center landscape:items-start text-center landscape:text-left shadow-lg justify-center relative">
            
            {/* Title */}
            <h2 className="font-black text-[#ec1337] uppercase tracking-wide mb-1 leading-none text-[clamp(1rem,2vh,1.5rem)]">
                {currentStep.title}
            </h2>

            {/* Instruction Text */}
            <div className="flex-1 flex items-center justify-center w-full min-h-0">
                 <p className="text-white font-medium leading-tight text-[clamp(0.85rem,2vh,1.15rem)] overflow-y-auto max-h-full hide-scrollbar">
                    <InstructionWithInlineIngredients 
                        text={convertUnitsInString(currentStep.instruction, isMetric)}
                        ingredients={currentStep.ingredientsInStep}
                        isMetric={isMetric}
                    />
                 </p>
            </div>
        </div>

        {/* CONTROLS */}
        <div className="flex gap-4 flex-shrink-0 h-16 landscape:h-20">
            <button 
                onClick={() => { triggerHaptic('light'); mixingStep === 0 ? onBack() : onSetStep(mixingStep - 1); }} 
                className="h-full aspect-square rounded-full bg-[#1f0a0a] border border-[#3d1a1a] text-stone-400 flex items-center justify-center hover:bg-[#2a1010] hover:text-white active:scale-95 transition-all shadow-lg"
            >
                <ChevronLeft size={28} />
            </button>
            <Button 
                fullWidth 
                onClick={() => { triggerHaptic('medium'); onSetStep(mixingStep + 1); }} 
                className="flex-1 h-full text-xl rounded-2xl shadow-lg shadow-[#ec1337]/20"
            >
                {mixingStep === selectedCocktail.steps.length - 1 ? 'Finish Drink' : 'Next Step'}
            </Button>
        </div>

      </div>
    </div>
  );
};
