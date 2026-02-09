
import React, { useState, useEffect } from 'react';
import { FirebaseService } from '../services/firebaseService';
import { getFallbackIcon } from './Helpers';

interface IngredientIconProps {
    name: string;
    type?: 'ingredient' | 'tool' | 'glass';
    size?: number;
    className?: string;
}

export const IngredientIcon: React.FC<IngredientIconProps> = ({ 
    name, 
    type = 'ingredient', 
    size = 20,
    className = ""
}) => {
    const [iconUrl, setIconUrl] = useState<string | null>(null);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        let isMounted = true;
        
        const fetchIcon = async () => {
            // Clean Name Logic
            let cleanName = name.toLowerCase().trim();
            
            // Si c'est un verre, on enlève le mot "glass" pour correspondre aux fichiers (ex: "Coupe Glass" -> "coupe")
            if (type === 'glass') {
                cleanName = cleanName.replace(/ glass/g, '').trim();
            }

            // Normalisation standard (espaces -> underscores, caractères spéciaux)
            let normalized = cleanName.replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            
            // --- LOGIQUE DE TEST ---
            if (type === 'tool' && normalized.includes('shaker')) {
                normalized = 'cobbler_shaker_Export';
            }
            // -----------------------

            // Choix du dossier
            let folder = 'images/icons/ingredients';
            if (type === 'tool') folder = 'images/icons/tools';
            if (type === 'glass') folder = 'images/icons/tools'; // Les verres sont souvent rangés avec les outils

            const path = `${folder}/${normalized}.svg`;
            
            try {
                const url = await FirebaseService.getFileUrl(path);
                if (isMounted && url) setIconUrl(url);
                else if (isMounted) setHasError(true);
            } catch (e) {
                if (isMounted) setHasError(true);
            }
        };

        fetchIcon();
        return () => { isMounted = false; };
    }, [name, type]);

    if (iconUrl && !hasError) {
        return (
            // Agrandissement de 60% (scale-150 / 1.6x) uniquement pour les icônes SVG chargées
            <img 
                src={iconUrl} 
                alt={name} 
                style={{ width: size, height: size }}
                className={`flex-shrink-0 object-contain opacity-90 scale-[1.6] ${className}`}
                onError={() => setHasError(true)}
            />
        );
    }

    return (
        <div className={className}>
            {getFallbackIcon(name, type === 'glass' ? 'tool' : (type as 'ingredient' | 'tool'), size)}
        </div>
    );
};
