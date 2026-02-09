
import React from 'react';
import { Citrus, Leaf, Candy, Cuboid, Cherry, Droplet, GlassWater as GlassIcon, Layers, Utensils } from 'lucide-react';
import { StepIngredient } from '../types';

export const formatLikes = (num?: number) => {
    if (num === undefined || num === null) return 0;
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num;
};

export const parseFraction = (str: string) => {
    const s = str.trim();
    if (s.includes(' ') && s.includes('/')) {
        const parts = s.split(/\s+/);
        const whole = parseFloat(parts[0]);
        const fracMatch = parts[1].match(/(\d+)\/(\d+)/);
        if (fracMatch) return whole + (parseInt(fracMatch[1]) / parseInt(fracMatch[2]));
    }
    const soloFracMatch = s.match(/(\d+)\/(\d+)/);
    if (soloFracMatch) return parseInt(soloFracMatch[1]) / parseInt(soloFracMatch[2]);
    return parseFloat(s);
};

export const convertUnitsInString = (text: string, toMetric: boolean) => {
    if (!toMetric) return text;
    let converted = text.replace(/([\d\s/.]+)\s*oz/gi, (match, amount) => {
        const val = parseFraction(amount);
        if (isNaN(val)) return match;
        return ` ${Math.round(val * 30)} ml`;
    });
    converted = converted.replace(/([\d\s/.]+)\s*cup[s]?/gi, (match, amount) => {
        const val = parseFraction(amount);
        if (isNaN(val)) return match;
        return ` ${Math.round(val * 240)} g/ml`;
    });
    return converted.replace(/\s\s+/g, ' ').trim();
};

// EXPORTED AS FALLBACK
export const getFallbackIcon = (name: string, type: 'ingredient' | 'tool' = 'ingredient', size: number = 20) => {
    const lower = name.toLowerCase();

    if (type === 'tool') {
        if (lower.includes('shaker')) return <Layers size={size} className="text-stone-400 flex-shrink-0" />;
        if (lower.includes('spoon') || lower.includes('stir')) return <Utensils size={size} className="text-stone-400 flex-shrink-0" />;
        return <Layers size={size} className="text-stone-400 flex-shrink-0" />;
    }

    if (lower.includes('lemon') || lower.includes('lime') || lower.includes('orange') || lower.includes('citrus') || lower.includes('juice')) 
        return <Citrus size={size} className="text-yellow-400 flex-shrink-0" />;
    if (lower.includes('mint') || lower.includes('basil') || lower.includes('leaf') || lower.includes('herb')) 
        return <Leaf size={size} className="text-[#17B67F] flex-shrink-0" />;
    if (lower.includes('sweet') || lower.includes('syrup') || lower.includes('sugar') || lower.includes('honey')) 
        return <Candy size={size} className="text-pink-400 flex-shrink-0" />;
    if (lower.includes('ice') || lower.includes('cube')) 
        return <Cuboid size={size} className="text-cyan-300 flex-shrink-0" />;
    if (lower.includes('cherry') || lower.includes('berry') || lower.includes('garnish')) 
        return <Cherry size={size} className="text-red-500 flex-shrink-0" />;
    if (lower.includes('water') || lower.includes('soda') || lower.includes('tonic')) 
        return <Droplet size={size} className="text-blue-400 flex-shrink-0" />;
    return <GlassIcon size={size} className="text-stone-400 flex-shrink-0" />;
};

export const RichTextRenderer = ({ text }: { text: string }) => {
    if (!text) return null;
    const parts = text.split(/(<(?:action|ing|tool)>.*?<\/(?:action|ing|tool)>)/g);
    return (
        <span>
            {parts.map((part, i) => {
                const match = part.match(/^<([a-z]+)>(.*?)<\/[a-z]+>$/);
                if (match) {
                    const tag = match[1];
                    const content = match[2];
                    let className = "font-bold ";
                    if (tag === 'action') className += "text-white uppercase tracking-wider font-black";
                    else if (tag === 'ing') className += "text-[#ec1337] underline decoration-1 underline-offset-2 decoration-[#ec1337]/50";
                    else if (tag === 'tool') className += "text-stone-400 italic";
                    return <span key={i} className={className}>{content}</span>;
                }
                return <span key={i}>{part}</span>;
            })}
        </span>
    );
};

// Helper pour échapper les caractères spéciaux dans une regex
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const InstructionWithInlineIngredients = ({ 
    text, 
    ingredients, 
    isMetric 
}: { 
    text: string, 
    ingredients?: StepIngredient[], 
    isMetric: boolean 
}) => {
    if (!ingredients || ingredients.length === 0) return <RichTextRenderer text={text} />;

    const termMap = new Map<string, StepIngredient>();
    const terms: string[] = [];

    ingredients.forEach(ing => {
        const fullName = ing.name.trim();
        termMap.set(fullName.toLowerCase(), ing);
        terms.push(fullName);

        const parts = fullName.split(' ');
        if (parts.length > 1) {
            const lastWord = parts[parts.length - 1];
            if (lastWord.length > 3) { 
                if (!termMap.has(lastWord.toLowerCase())) {
                    termMap.set(lastWord.toLowerCase(), ing);
                    terms.push(lastWord);
                }
            }
            const firstWord = parts[0];
            if (firstWord.length > 3 && !termMap.has(firstWord.toLowerCase())) {
                termMap.set(firstWord.toLowerCase(), ing);
                terms.push(firstWord);
            }
        }
    });

    terms.sort((a, b) => b.length - a.length);

    const pattern = new RegExp(`\\b(${terms.map(t => escapeRegExp(t)).join('|')})\\b`, 'gi');
    
    const parts = text.split(pattern);

    return (
        <span className="leading-relaxed">
            {parts.map((part, i) => {
                const lowerPart = part.toLowerCase();
                const matchedIng = termMap.get(lowerPart);
                
                if (matchedIng) {
                    return (
                        <span key={i} className="inline-flex items-center gap-1.5 bg-[#1f0a0a] border border-[#3d1a1a] rounded-lg px-2 py-0.5 mx-1 align-baseline shadow-sm transform translate-y-[1px]">
                            <span className="text-stone-200 font-bold text-[0.9em]">{matchedIng.name}</span>
                            <span className="h-3 w-px bg-[#ec1337]/50"></span>
                            <span className="text-[#ec1337] font-black text-[0.8em] whitespace-nowrap">
                                {convertUnitsInString(matchedIng.amount, isMetric)}
                            </span>
                        </span>
                    );
                }
                return <span key={i}>{part}</span>;
            })}
        </span>
    );
};
