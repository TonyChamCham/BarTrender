
import React from 'react';
import { Wine, ShieldCheck } from 'lucide-react';
import { Button } from './Button';

interface AgeGateProps {
  onEnter: () => void;
}

export const AgeGate: React.FC<AgeGateProps> = ({ onEnter }) => {
  return (
    <div className="fixed inset-0 z-[60] bg-[#0f0505] overflow-y-auto">
        <div className="min-h-full flex flex-col items-center justify-center p-12 landscape:py-4 lg:landscape:py-12">
            
            {/* 
                Main Container: 
                - Portrait: Stack vertical (flex-col)
                - Mobile Landscape: Side-by-side (flex-row)
                - Tablet Landscape (lg): Stack vertical (flex-col) like portrait
            */}
            <div className="max-w-md w-full flex flex-col items-center landscape:flex-row lg:landscape:flex-col landscape:max-w-3xl lg:landscape:max-w-md landscape:gap-10 lg:landscape:gap-0 landscape:items-center">
                
                {/* LEFT COL: Branding */}
                {/* Reset alignment to center on LG screens */}
                <div className="flex flex-col items-center landscape:items-start lg:landscape:items-center landscape:text-left lg:landscape:text-center landscape:flex-1 lg:landscape:flex-auto mb-8 landscape:mb-0 lg:landscape:mb-8">
                    <div className="mb-8 landscape:mb-4 lg:landscape:mb-8 relative">
                        <div className="absolute inset-0 bg-[#ec1337] blur-[40px] opacity-20 rounded-full" />
                        <Wine size={64} className="text-[#ec1337] relative z-10 landscape:w-12 landscape:h-12 lg:landscape:w-16 lg:landscape:h-16" strokeWidth={1.5} />
                    </div>

                    <h1 className="text-3xl landscape:text-2xl lg:landscape:text-3xl font-black text-white mb-2 tracking-tight text-center landscape:text-left lg:landscape:text-center">
                        Welcome to Bar<span className="text-[#ec1337]">Trender</span>
                    </h1>
                    
                    <p className="text-stone-400 text-sm mb-0 font-medium text-center landscape:text-left lg:landscape:text-center">
                        The Intelligent Mixology Companion <br/>
                        <span className="text-xs opacity-60 mt-1 block font-mono">Powered by Google Gemini 3</span>
                    </p>
                </div>

                {/* RIGHT COL: Verification Card */}
                {/* Reset width logic on LG screens */}
                <div className="w-full landscape:flex-1 lg:landscape:flex-auto landscape:max-w-sm lg:landscape:max-w-full">
                    <div className="bg-[#1f0a0a] border border-[#3d1a1a] p-6 landscape:p-5 lg:landscape:p-6 rounded-3xl w-full mb-6 landscape:mb-3 lg:landscape:mb-6 shadow-2xl">
                        <ShieldCheck className="text-stone-500 mx-auto mb-3" size={32} />
                        <h2 className="text-lg font-bold text-white mb-2 text-center">Legal Drinking Age</h2>
                        <p className="text-stone-400 text-xs leading-relaxed mb-6 text-center">
                            By entering this application, you verify that you are of legal drinking age in your jurisdiction.
                            <br/><br/>
                            Excessive alcohol consumption is dangerous for your health.
                        </p>
                        <Button fullWidth onClick={onEnter}>
                            I am of legal age. Enter.
                        </Button>
                    </div>
                    
                    <p className="text-[10px] text-stone-600 uppercase tracking-widest font-bold text-center">
                        Drink Responsibly
                    </p>
                </div>

            </div>
        </div>
    </div>
  );
};
