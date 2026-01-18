# Mekong Farm Frontend

Frontend application for AI-Driven Salt Intrusion Map with Farm & Cooperative Management.

## Tech Stack

- **Vite** + **React 18** + **TypeScript**
- **Zustand** for state management
- **TanStack Query** for data fetching
- **Mapbox GL JS** for map visualization
- **Tailwind CSS** for styling
- **Lucide React** for icons

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up Mapbox token:
   - Create a `.env` file in the root directory
   - Add your Mapbox access token:
   ```
   VITE_MAPBOX_TOKEN=your_mapbox_token_here
   ```
   - Get your token from [Mapbox](https://account.mapbox.com/access-tokens/)

3. Run development server:
```bash
npm run dev
```

## Mock Data

The application currently uses mock data located in:
- `src/data/mockSaltIntrusion.ts` - Salt intrusion boundaries and risk surfaces
- `src/data/mockFarms.ts` - Farm and cooperative data

These will be replaced by API calls to the AI backend in the future.

## Features

- ✅ Interactive map with salt intrusion boundaries (1‰ and 4‰)
- ✅ Risk heatmap visualization
- ✅ Farm polygon display with risk-based coloring
- ✅ Time slider for forecast dates (up to 30 days)
- ✅ Filter farms by cooperative, production model, and risk level
- ✅ Click farms to view details
- ✅ Statistics dashboard
- ✅ Responsive sidebar with controls

## Project Structure

```
src/
├── components/     # React components
├── data/          # Mock data files
├── store/         # Zustand state management
├── types/         # TypeScript type definitions
└── App.tsx        # Main app component
```

## Future Integration

When the AI API is ready, replace mock data imports with API calls using TanStack Query.

