
import React from 'react';
import { Wine, ShieldCheck } from 'lucide-react';
import { Button } from './Button';

interface AgeGateProps {
  onEnter: () => void;
}

export const AgeGate: React.FC<AgeGateProps> = ({ onEnter }) => {
  return (
    <div className="fixed inset-0 z-[60] bg-[#0f0505] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full flex flex-col items-center">
            
            <div className="mb-8 relative">
                <div className="absolute inset-0 bg-[#ec1337] blur-[40px] opacity-20 rounded-full" />
                <Wine size={64} className="text-[#ec1337] relative z-10" strokeWidth={1.5} />
            </div>

            <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
                Welcome to Bar<span className="text-[#ec1337]">Trender</span>
            </h1>
            
            <p className="text-stone-400 text-sm mb-8 font-medium">
                The Intelligent Mixology Companion <br/>
                <span className="text-xs opacity-60 mt-1 block font-mono">Powered by Google Gemini 3</span>
            </p>

            <div className="bg-[#1f0a0a] border border-[#3d1a1a] p-6 rounded-3xl w-full mb-6 shadow-2xl">
                <ShieldCheck className="text-stone-500 mx-auto mb-3" size={32} />
                <h2 className="text-lg font-bold text-white mb-2">Legal Drinking Age</h2>
                <p className="text-stone-400 text-xs leading-relaxed mb-6">
                    By entering this application, you verify that you are of legal drinking age in your jurisdiction.
                    <br/><br/>
                    Excessive alcohol consumption is dangerous for your health. Please drink responsibly.
                </p>
                <Button fullWidth onClick={onEnter}>
                    I am of legal age. Enter.
                </Button>
            </div>
            
            <p className="text-[10px] text-stone-600 uppercase tracking-widest font-bold">
                Drink Responsibly
            </p>
        </div>
    </div>
  );
};
