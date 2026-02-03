
import React, { useState } from 'react';
import { Grid, Trash2, Settings, X, Wrench } from 'lucide-react';
import { FirebaseService } from '../services/firebaseService';

export const DevGrid: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [showGrid, setShowGrid] = useState(false);
    const [isCleaning, setIsCleaning] = useState(false);

    const handleCleanup = async () => {
        if (!confirm("Run Database Cleanup? This will delete recursive duplicates and convert units.")) return;
        setIsCleaning(true);
        try {
            const res = await FirebaseService.runDatabaseCleanup();
            alert(res);
        } catch (e: any) {
            alert("Error: " + e.message);
        } finally {
            setIsCleaning(false);
        }
    };

    const toggleMenu = () => setIsOpen(!isOpen);

    return (
        <>
            {/* FAB Button */}
            <div className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-3 pointer-events-auto">
                
                {isOpen && (
                    <div className="flex flex-col gap-3 items-end animate-in slide-in-from-bottom-5 fade-in duration-200">
                        {/* CLEANUP BUTTON */}
                        <div className="flex items-center gap-2">
                            <span className="bg-black/80 text-white text-[10px] px-2 py-1 rounded-md font-bold uppercase">Cleanup DB</span>
                            <button 
                                onClick={handleCleanup}
                                disabled={isCleaning}
                                className="w-12 h-12 bg-red-600 rounded-full text-white shadow-lg flex items-center justify-center hover:bg-red-500 active:scale-95 transition-all border-2 border-white/10"
                            >
                                <Trash2 size={20} className={isCleaning ? "animate-spin" : ""} />
                            </button>
                        </div>

                        {/* GRID TOGGLE */}
                        <div className="flex items-center gap-2">
                            <span className="bg-black/80 text-white text-[10px] px-2 py-1 rounded-md font-bold uppercase">{showGrid ? "Hide Grid" : "Show Grid"}</span>
                            <button 
                                onClick={() => setShowGrid(!showGrid)}
                                className={`w-12 h-12 rounded-full text-white shadow-lg flex items-center justify-center active:scale-95 transition-all border-2 border-white/10 ${showGrid ? 'bg-emerald-600' : 'bg-stone-700'}`}
                            >
                                <Grid size={20} />
                            </button>
                        </div>
                    </div>
                )}

                {/* MAIN TOGGLE */}
                <button 
                    onClick={toggleMenu}
                    className={`w-14 h-14 rounded-full text-white shadow-2xl flex items-center justify-center transition-all active:scale-90 border-4 border-[#0f0505] ${isOpen ? 'bg-stone-600 rotate-90' : 'bg-purple-600 hover:bg-purple-500'}`}
                >
                    {isOpen ? <X size={24} /> : <Wrench size={24} />}
                </button>
            </div>

            {/* THE GRID OVERLAY */}
            {showGrid && (
                <div className="fixed inset-0 z-[9998] pointer-events-none" style={{ zIndex: 9998 }}>
                    {/* Main Grid 100px */}
                    <div 
                        className="absolute inset-0 opacity-20"
                        style={{
                            backgroundImage: `linear-gradient(to right, #ec1337 1px, transparent 1px), linear-gradient(to bottom, #ec1337 1px, transparent 1px)`,
                            backgroundSize: '100px 100px'
                        }}
                    />
                    {/* Sub Grid 10px */}
                    <div 
                        className="absolute inset-0 opacity-10"
                        style={{
                            backgroundImage: `linear-gradient(to right, #00ffff 1px, transparent 1px), linear-gradient(to bottom, #00ffff 1px, transparent 1px)`,
                            backgroundSize: '10px 10px'
                        }}
                    />
                    
                    {/* Center Rulers */}
                    <div className="absolute top-0 bottom-0 left-1/2 w-px bg-yellow-400 opacity-50"></div>
                    <div className="absolute left-0 right-0 top-1/2 h-px bg-yellow-400 opacity-50"></div>
                    
                    {/* Screen Info */}
                    <div className="fixed top-2 left-2 bg-black/80 text-green-400 font-mono text-xs p-1 pointer-events-auto">
                        {window.innerWidth}px x {window.innerHeight}px
                    </div>
                </div>
            )}
        </>
    );
};
