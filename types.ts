
export interface Ingredient {
  name: string;
  amount: string;
  detail?: string; 
}

export interface StepIngredient {
  name: string;
  amount: string;
}

export interface MixingStep {
  title: string; 
  instruction: string;
  actionType: 'shake' | 'stir' | 'pour' | 'garnish' | 'muddle' | 'strain' | 'other';
  ingredientsInStep?: StepIngredient[];
  visualState: {
    background: string;
    glass: string;
    accessories: string;
    ingredients: string;
    action: string;
    result: string;
  }; 
}

export interface CocktailSummary {
  name: string;
  description: string;
  tags: string[];
  isPremium?: boolean; 
  specialLabel?: string;
  likes?: number; 
  color?: string; 
  isVegan?: boolean;
  isValidated?: boolean; 
  
  // New props for Infinite Scroll Dividers
  isDivider?: boolean;
  dividerTitle?: string;
  dividerMonth?: string;
}

export interface CocktailFullDetails extends CocktailSummary {
  ingredients: Ingredient[];
  tools: string[];
  steps: MixingStep[];
  glassType: string;
  visualContext: string; 
}

export interface PromoCode {
  code: string; 
  label: string; 
  durationDays: number; 
  maxUses: number; 
  currentUses: number;
  expiryDate?: number | null; 
  claimedBy: string[]; 
}

export interface BartenderChatResponse {
  text: string;
  suggestionName?: string;
}

export enum SearchType {
  NAME = 'NAME',
  INGREDIENT = 'INGREDIENT',
  STYLE = 'STYLE',
  CAMERA = 'CAMERA', 
  SMART = 'SMART', 
}

export enum AppView {
  HOME = 'HOME',
  SEARCH = 'SEARCH',
  DETAILS = 'DETAILS',
  MIXING = 'MIXING',
  PAYWALL = 'PAYWALL',
  GALLERY = 'GALLERY', 
  CHAT = 'CHAT',
  CAMERA = 'CAMERA',
  CATALOG = 'CATALOG', 
}
