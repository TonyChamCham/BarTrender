
# 🍸 BarTrender - Intelligent Mixology Companion

**BarTrender** is a next-generation cocktail application powered by **Google Gemini 3**. It goes beyond simple recipes by offering an AI-driven mixology experience, including real-time visual recognition, personalized bartender chat personas, and generative media.

![Project Status](https://img.shields.io/badge/Status-Portfolio_Showcase-blueviolet)
![AI Model](https://img.shields.io/badge/AI-Gemini_3_Pro_%2F_Flash-blue)
![Tech](https://img.shields.io/badge/Stack-React_%7C_Vite_%7C_Firebase-orange)

## ✨ Key Features

### 🧠 AI-Powered Core
- **Smart Recipe Generation:** Uses `gemini-3-pro-preview` to generate precise recipes, steps, and history for any cocktail requested, including custom creations.
- **Visual Recognition (AI Vision):** Snap a photo of a drink, and the app identifies it and provides the recipe using multimodal AI.
- **Generative Imagery:** Automatically generates photorealistic 8k images for cocktails using `gemini-2.5-flash-image` and `imagen-3`.
- **Cinematic Backgrounds:** Uses **Google Veo** (`veo-3.1`) to generate seamless looping videos for bartender personas.

### 🍹 Dynamic Experience
- **Smart Modes:**
  - **No Alcohol Mode:** Instantly converts any recipe into a balanced mocktail.
  - **Shot Mode:** Filters and suggests only shooter-style drinks.
- **Seasonal Engine:** Automatically detects the current month/season (e.g., Valentine's, Halloween, Summer) to curate relevant suggestions.
- **Smart Search:** Hybrid search combining local fuzzy logic (Levenshtein distance) and Firestore global search.

### 💬 AI Bartender Chat
Interact with distinct AI personalities, each with their own prompt engineering and style:
- **The Gentleman:** Classic, refined, vintage.
- **Reina:** Mysterious, Tokyo nightlife vibe.
- **Sunny:** Tropical, energetic Tiki expert.
- **Raven:** Goth, dry humor, dark aesthetics.
- And many more (Robot, Wasteland, Science, etc.).

## 🛠 Tech Stack

- **Frontend:** React 18, TypeScript, Vite
- **Styling:** Tailwind CSS (Custom dark UI design)
- **Backend / DB:** Firebase Firestore (Real-time DB), Firebase Storage (Assets & Cache)
- **Authentication:** Firebase Auth (Anonymous login)
- **AI SDK:** `@google/genai` (Official Google GenAI SDK)
- **Icons:** Lucide React + Custom SVG integration

## 📂 Project Structure

```
src/
├── components/       # UI Components (Cards, Chat, Camera, etc.)
├── services/         # Logic layer
│   ├── geminiService.ts    # AI Interaction (Text, Vision, Image, Video)
│   ├── firebaseService.ts  # Database & Storage methods
│   └── adminData.ts        # Curated cocktail lists
├── types.ts          # TypeScript interfaces
└── images/           # Assets (Icons handling)
```

## 🎨 Asset Management

The app uses a hybrid asset system:
- **SmartImage:** A component that tries to fetch images from Firebase Cache first, and falls back to AI Generation if missing.
- **IngredientIcon:** Handles SVG icons for tools and ingredients, with automatic mapping (e.g., "Coupe Glass" -> `coupe.svg`).

## ⚠️ Legal & License

**© 2024 BarTrender. All Rights Reserved.**

This repository is a **portfolio demonstration**. The code, design, and intellectual property belong to the author.

- **You may** view the code for educational purposes or hiring evaluation.
- **You may NOT** copy, distribute, modify, or use this code for commercial or non-commercial purposes without explicit written permission.
- **You may NOT** use this application to train AI models.

For any inquiries or hiring opportunities, please contact the repository owner directly.

---

*Made with 🍸 and Code.*
