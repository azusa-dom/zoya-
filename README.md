<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Zoya 快去背单词 - Flashcard Learning App

A beautiful flashcard application for learning terminology with AI-powered content generation.

View your app in AI Studio: https://ai.studio/apps/drive/1ICyPqlUH_RkmsEKQ-NYx9HbxdEluHzwK

## Features

- 📚 Interactive flashcard learning with 3D flip animation
- 🤖 AI-powered content generation (Gemini API)
- 🎨 Beautiful, minimalist design
- 📝 Highlight and annotate important terms
- 📥 Import/Export cards in JSON format
- 🌐 Chinese translation support
- 🔄 Shuffle and navigate cards

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the root directory and set your Gemini API key:
   ```bash
   VITE_GEMINI_API_KEY=your_api_key_here
   ```

3. Run the app:
   ```bash
   npm run dev
   ```

## Import Format

The app supports importing cards via JSON file or pasted JSON content. Two formats are supported:

### Format 1: Array of Cards (Direct)

```json
[
  {
    "id": 1,
    "term": "Opportunity Cost (机会成本)",
    "chineseTranslation": "机会成本",
    "roots": "Latin: opportunitas + cost",
    "synonyms": ["Trade-off", "Alternative cost"],
    "layman": "鱼和熊掌不可兼得...",
    "example": "你今晚花2小时刷抖音...",
    "sentences": [
      "Every financial decision involves an opportunity cost.",
      "The opportunity cost of going to college..."
    ],
    "definition": "The potential benefits that an individual..."
  }
]
```

### Format 2: Object with Cards Field

```json
{
  "version": "1.0",
  "exportedAt": "2024-01-01T00:00:00.000Z",
  "cards": [
    {
      "id": 1,
      "term": "Opportunity Cost (机会成本)",
      "chineseTranslation": "机会成本",
      "roots": "Latin: opportunitas + cost",
      "synonyms": ["Trade-off", "Alternative cost"],
      "layman": "鱼和熊掌不可兼得...",
      "example": "你今晚花2小时刷抖音...",
      "sentences": [
        "Every financial decision involves an opportunity cost."
      ],
      "definition": "The potential benefits that an individual..."
    }
  ]
}
```

### Card Fields

- `id` (string | number): Unique identifier for the card
- `term` (string): The term name, e.g., "Opportunity Cost (机会成本)"
- `chineseTranslation` (string, optional): Chinese translation of the term
- `roots` (string): Etymology or word origin
- `synonyms` (string[]): Array of related terms
- `layman` (string): Simple explanation in Chinese
- `example` (string): Real-world scenario in Chinese
- `sentences` (string[]): Example sentences in English
- `definition` (string): Professional definition in English

## Export

The app supports two export formats:

1. **Full Card Export**: Exports all cards in the format shown in Format 2 above (suitable for re-importing)
2. **AI Dataset Export**: Exports cards in AI training dataset format with `input_text` and `output_text` fields

## License

MIT
