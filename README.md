
# 🍸 BarTrender - Intelligent Mixology Companion

**BarTrender** is a next-generation cocktail application powered by **Google Gemini 3**. It goes beyond simple recipes by offering an AI-driven mixology experience, including real-time visual recognition, personalized bartender chat personas, and generative media.

![Project Status](https://img.shields.io/badge/Status-Hackathon_Submission-orange)
![License](https://img.shields.io/badge/License-CC_BY--NC--ND_4.0-lightgrey)
![Author](https://img.shields.io/badge/Author-Open_to_Work-green)

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

## ⚠️ License & Rights

**© 2024 BarTrender.**

This project is submitted for **Hackathon Evaluation Purposes Only**.

This work is licensed under a <a rel="license" href="http://creativecommons.org/licenses/by-nc-nd/4.0/">Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International License</a>.

**You are free to:**
- **Share** — copy and redistribute the material in any medium or format.

**Under the following terms:**
- **Attribution** — You must give appropriate credit to the author.
- **NonCommercial** — You may NOT use this material for commercial purposes (selling, monetizing, or integrating into a paid product).
- **NoDerivatives** — If you remix, transform, or build upon the material, you may not distribute the modified material.

> **Note for Recruiters:** The source code serves as a portfolio piece demonstrating proficiency in React, TypeScript, AI Integration (Gemini/Vertex AI), and Firebase.

For any inquiries, collaboration, or hiring opportunities, please contact the repository owner directly.

---

*Made with 🍸 and Code.*
