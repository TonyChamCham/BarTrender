
import React, { useEffect, useState } from 'react';
import { Image, ArrowLeft, Zap, ZapOff, HelpCircle, ScanLine, X } from 'lucide-react';

interface CameraViewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onCapture: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClose: () => void;
}

export const CameraView: React.FC<CameraViewProps> = ({
  videoRef,
  fileInputRef,
  onCapture,
  onFileUpload,
  onClose
}) => {
  const [flashOn, setFlashOn] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  
  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'environment',
                advanced: [{ torch: flashOn }] as any 
            } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        
        const track = stream.getVideoTracks()[0];
        if (track && (track.getCapabilities() as any).torch) {
            track.applyConstraints({
                advanced: [{ torch: flashOn }] as any
            }).catch(e => console.warn("Flash not supported", e));
        }

      } catch (err) {
        console.error("Failed to access camera", err);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => {
            track.stop();
        });
      }
    };
  }, [videoRef, flashOn]);

  const toggleFlash = () => setFlashOn(!flashOn);

  return (
    <div className="relative h-full bg-black flex flex-col overflow-hidden">
      {/* HEADER OVERLAY */}
      <div className="absolute top-0 left-0 right-0 p-6 pt-4 landscape:pt-2 z-30 flex items-center justify-between">
          <button onClick={onClose} className="p-2 bg-black/20 backdrop-blur-md rounded-full text-white active:scale-95 hover:bg-black/40 transition-colors">
            <ArrowLeft size={24} />
          </button>
          
          <div className="flex items-center gap-2 px-3 py-1 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
              <div className="w-2 h-2 rounded-full bg-[#ec1337] animate-pulse" />
              <span className="text-[10px] font-black tracking-widest text-white">LIVE AI</span>
          </div>

          <button onClick={() => setShowHelp(true)} className="p-2 bg-black/20 backdrop-blur-md rounded-full text-white active:scale-95 hover:bg-black/40 transition-colors">
            <HelpCircle size={24} />
          </button>
      </div>

      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted
        className="absolute inset-0 w-full h-full object-cover opacity-90" 
      />
      
      {/* SCANNER OVERLAY */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
        <div className="relative w-[85%] aspect-[3/4] landscape:w-auto landscape:h-[70%] landscape:aspect-[4/3] rounded-3xl">
            {/* CORNERS */}
            <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-[#ec1337] rounded-tl-3xl -mt-1 -ml-1 drop-shadow-lg shadow-[#ec1337]/50"></div>
            <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-[#ec1337] rounded-tr-3xl -mt-1 -mr-1 drop-shadow-lg shadow-[#ec1337]/50"></div>
            <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-[#ec1337] rounded-bl-3xl -mb-1 -ml-1 drop-shadow-lg shadow-[#ec1337]/50"></div>
            <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-[#ec1337] rounded-br-3xl -mb-1 -mr-1 drop-shadow-lg shadow-[#ec1337]/50"></div>
            
            {/* SCANNING ANIMATION */}
            <div className="absolute inset-x-0 h-[2px] bg-[#ec1337]/80 shadow-[0_0_15px_rgba(236,19,55,0.8)] animate-scan" style={{ top: '50%' }}></div>
            <div className="absolute inset-0 flex items-center justify-center">
                 <p className="text-[#ec1337] text-xs font-black uppercase tracking-[0.3em] animate-pulse">Scanning...</p>
            </div>
        </div>
      </div>
      
      {/* FOOTER CONTROLS */}
      {/* Tablet Landscape adjustment: md:landscape:pb-20 to raise buttons */}
      <div className="absolute bottom-0 left-0 right-0 p-8 pb-10 landscape:pb-5 md:landscape:pb-20 z-30 flex flex-col items-center gap-6 bg-gradient-to-t from-black/80 to-transparent">
        
        {/* PILL TEXT - Responsive Position */}
        {/* Tablet Portrait adjustment: md:top-[-81vh] to raise pill significantly in portrait mode on iPad-like screens */}
        <div className="px-5 py-2.5 bg-[#1f0a0a]/80 backdrop-blur-xl border border-[#3d1a1a] rounded-full shadow-xl absolute top-[-64vh] md:top-[-81vh] landscape:absolute landscape:top-[-58vh] lg:landscape:top-[-66vh]">
            <span className="text-stone-300 text-xs font-bold flex items-center gap-2">
                <ScanLine size={14} className="text-[#ec1337]" />
                Frame your cocktail to identify
            </span>
        </div>

        {/* BUTTONS ROW */}
        <div className="flex items-center justify-center gap-12 w-full">
            <button 
            onClick={() => fileInputRef.current?.click()} 
            className="p-4 bg-white/10 backdrop-blur-md rounded-full text-white border border-white/20 active:scale-90 transition-all hover:bg-white/20"
            >
            <Image size={24} />
            </button>
            
            <button 
            onClick={onCapture} 
            className="w-20 h-20 bg-[#ec1337] rounded-full border-[6px] border-white/20 shadow-[0_0_30px_rgba(236,19,55,0.4)] flex items-center justify-center active:scale-90 transition-all hover:scale-105" 
            >
                <div className="w-16 h-16 rounded-full border-2 border-white/30 bg-gradient-to-br from-[#ec1337] to-[#c4102e]"></div>
            </button>
            
            <button 
            onClick={toggleFlash}
            className={`p-4 backdrop-blur-md rounded-full border active:scale-90 transition-all ${flashOn ? 'bg-yellow-400/20 text-yellow-300 border-yellow-400/50 shadow-[0_0_15px_rgba(250,204,21,0.3)]' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}`}
            >
            {flashOn ? <Zap size={24} className="fill-current" /> : <ZapOff size={24} />}
            </button>
        </div>
      </div>
      
      {/* HELP MODAL */}
      {showHelp && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
           <div className="bg-[#1f0a0a] border border-[#3d1a1a] rounded-3xl p-6 max-w-sm w-full relative shadow-2xl">
              <button onClick={() => setShowHelp(false)} className="absolute top-4 right-4 text-stone-500 hover:text-white"><X size={20} /></button>
              <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#ec1337]/20 flex items-center justify-center text-[#ec1337]">
                      <ScanLine size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-white">How to use</h3>
              </div>
              <ul className="space-y-4 text-sm text-stone-300">
                  <li className="flex gap-3">
                      <span className="w-6 h-6 rounded-full bg-stone-800 flex items-center justify-center text-xs font-bold text-white shrink-0">1</span>
                      <span>Place your cocktail within the <span className="text-[#ec1337]">red frame</span>. Good lighting helps!</span>
                  </li>
                  <li className="flex gap-3">
                      <span className="w-6 h-6 rounded-full bg-stone-800 flex items-center justify-center text-xs font-bold text-white shrink-0">2</span>
                      <span>Press the <span className="font-bold text-white">Shutter</span> button to analyze.</span>
                  </li>
                  <li className="flex gap-3">
                      <span className="w-6 h-6 rounded-full bg-stone-800 flex items-center justify-center text-xs font-bold text-white shrink-0">3</span>
                      <span>Or use the <span className="font-bold text-white">Gallery</span> icon to upload an existing photo.</span>
                  </li>
              </ul>
              <button onClick={() => setShowHelp(false)} className="w-full mt-6 bg-[#ec1337] text-white font-bold py-3 rounded-xl active:scale-95 transition-transform">
                  Got it
              </button>
           </div>
        </div>
      )}

      <input 
        type="file" 
        ref={fileInputRef} 
        accept="image/*" 
        className="hidden" 
        onChange={onFileUpload} 
      />
      
      <style>{`
        @keyframes scan {
            0% { top: 10%; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 90%; opacity: 0; }
        }
        .animate-scan {
            animation: scan 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .animate-fade-in {
            animation: fadeIn 0.2s ease-out;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};
