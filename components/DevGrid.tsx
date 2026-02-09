
import React, { useState } from 'react';
import { Grid, Trash2, Settings, X, Wrench, FileCode, Save, RefreshCw, BarChart3 } from 'lucide-react';
import { FirebaseService } from '../services/firebaseService';
import { sanitizeKey } from '../services/geminiService';
import { ADMIN_COCKTAIL_DB } from '../services/adminData';

export const DevGrid: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [showGrid, setShowGrid] = useState(false);
    const [isCleaning, setIsCleaning] = useState(false);
    
    // EDITOR STATE
    const [showEditor, setShowEditor] = useState(false);
    const [editId, setEditId] = useState("");
    const [jsonContent, setJsonContent] = useState("");
    const [isLoadingJson, setIsLoadingJson] = useState(false);

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

    const handleAnalyzeAssets = async () => {
        console.log("--- STARTING ASSET ANALYSIS ---");
        
        const ingredients = new Set<string>();
        const tools = new Set<string>();
        const glasses = new Set<string>();

        // 1. Analyze Admin DB
        Object.values(ADMIN_COCKTAIL_DB).forEach(c => {
            c.ingredients.forEach(i => ingredients.add(i.name));
            c.tools.forEach(t => tools.add(t));
            if(c.glassType) glasses.add(c.glassType);
        });

        // 2. We could fetch from Firestore here if needed, but Admin DB is a good sample
        
        console.log("%c🧊 GLASSES:", "color: cyan; font-weight: bold; font-size: 12px;");
        console.log(Array.from(glasses).sort());

        console.log("%c🛠 TOOLS:", "color: orange; font-weight: bold; font-size: 12px;");
        console.log(Array.from(tools).sort());

        console.log("%c🍋 INGREDIENTS:", "color: lime; font-weight: bold; font-size: 12px;");
        console.log(Array.from(ingredients).sort());
        
        alert("Check your browser console (F12) for the full list of assets.");
    };

    const toggleMenu = () => setIsOpen(!isOpen);

    const loadCocktail = async () => {
        if (!editId) return;
        setIsLoadingJson(true);
        // Try sanitized key first as it is the standard ID
        const key = sanitizeKey(editId);
        const data = await FirebaseService.getCocktail(key);
        if (data) {
            setJsonContent(JSON.stringify(data, null, 2));
        } else {
            // Try exact id
            const exactData = await FirebaseService.getCocktail(editId);
            if (exactData) setJsonContent(JSON.stringify(exactData, null, 2));
            else alert("Cocktail not found in DB");
        }
        setIsLoadingJson(false);
    };

    const saveCocktail = async () => {
        try {
            const parsed = JSON.parse(jsonContent);
            if (!parsed.name) throw new Error("Missing name field");
            // Save using the sanitized key of the name in the JSON to ensure consistency
            const key = sanitizeKey(parsed.name);
            await FirebaseService.saveCocktail(parsed, key);
            alert("Saved successfully!");
        } catch (e: any) {
            alert("Invalid JSON: " + e.message);
        }
    };

    return (
        <>
            {/* FAB Button */}
            <div className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-3 pointer-events-auto">
                
                {isOpen && (
                    <div className="flex flex-col gap-3 items-end animate-in slide-in-from-bottom-5 fade-in duration-200">
                        {/* ASSET ANALYZER */}
                        <div className="flex items-center gap-2">
                            <span className="bg-black/80 text-white text-[10px] px-2 py-1 rounded-md font-bold uppercase">Log Assets</span>
                            <button 
                                onClick={handleAnalyzeAssets}
                                className="w-12 h-12 bg-pink-600 rounded-full text-white shadow-lg flex items-center justify-center hover:bg-pink-500 active:scale-95 transition-all border-2 border-white/10"
                            >
                                <BarChart3 size={20} />
                            </button>
                        </div>

                        {/* JSON EDITOR TOGGLE */}
                        <div className="flex items-center gap-2">
                            <span className="bg-black/80 text-white text-[10px] px-2 py-1 rounded-md font-bold uppercase">DB Editor</span>
                            <button 
                                onClick={() => { setShowEditor(true); setIsOpen(false); }}
                                className="w-12 h-12 bg-blue-600 rounded-full text-white shadow-lg flex items-center justify-center hover:bg-blue-500 active:scale-95 transition-all border-2 border-white/10"
                            >
                                <FileCode size={20} />
                            </button>
                        </div>

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

            {/* JSON EDITOR MODAL */}
            {showEditor && (
                <div className="fixed inset-0 z-[10000] bg-black/90 flex flex-col p-6 overflow-hidden">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-black text-white">Database JSON Editor</h2>
                        <button onClick={() => setShowEditor(false)} className="p-2 bg-[#1f0a0a] rounded-full text-stone-400"><X size={24} /></button>
                    </div>
                    
                    <div className="flex gap-2 mb-4">
                        <input 
                            className="flex-1 bg-[#1f0a0a] border border-[#3d1a1a] p-3 text-white rounded-xl"
                            placeholder="Cocktail ID/Name (ex: cupidsarrow)"
                            value={editId}
                            onChange={(e) => setEditId(e.target.value)}
                        />
                        <button onClick={loadCocktail} className="px-4 bg-blue-600 rounded-xl text-white font-bold flex items-center gap-2">
                            {isLoadingJson ? <RefreshCw className="animate-spin" size={18} /> : "Load"}
                        </button>
                    </div>

                    <textarea 
                        className="flex-1 bg-[#0f0505] border border-[#3d1a1a] p-4 font-mono text-xs text-green-400 rounded-xl focus:outline-none focus:border-blue-500 resize-none leading-relaxed"
                        value={jsonContent}
                        onChange={(e) => setJsonContent(e.target.value)}
                        spellCheck={false}
                    />

                    <div className="mt-4 flex justify-end">
                        <button onClick={saveCocktail} className="px-6 py-3 bg-[#ec1337] rounded-xl text-white font-bold flex items-center gap-2 shadow-lg hover:bg-red-600 active:scale-95 transition-all">
                            <Save size={18} /> Save to Firestore
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};
