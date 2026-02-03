
import React from 'react';
import { Citrus, Leaf, Candy, Cuboid, Cherry, Droplet, GlassWater as GlassIcon } from 'lucide-react';

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

export const getIngredientIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('lemon') || lower.includes('lime') || lower.includes('orange') || lower.includes('citrus') || lower.includes('juice')) 
        return <Citrus size={20} className="text-yellow-400 flex-shrink-0" />;
    if (lower.includes('mint') || lower.includes('basil') || lower.includes('leaf') || lower.includes('herb')) 
        return <Leaf size={20} className="text-[#17B67F] flex-shrink-0" />;
    if (lower.includes('sweet') || lower.includes('syrup') || lower.includes('sugar') || lower.includes('honey')) 
        return <Candy size={20} className="text-pink-400 flex-shrink-0" />;
    if (lower.includes('ice') || lower.includes('cube')) 
        return <Cuboid size={20} className="text-cyan-300 flex-shrink-0" />;
    if (lower.includes('cherry') || lower.includes('berry') || lower.includes('garnish')) 
        return <Cherry size={20} className="text-red-500 flex-shrink-0" />;
    if (lower.includes('water') || lower.includes('soda') || lower.includes('tonic')) 
        return <Droplet size={20} className="text-blue-400 flex-shrink-0" />;
    return <GlassIcon size={20} className="text-stone-400 flex-shrink-0" />;
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
