# AoE2 Gwent

A card game inspired by Gwent, featuring Age of Empires 2 themed cards. Built with PixiJS, TypeScript, and Vite.

![Game Screenshot](./aoe-gwent/public/aoe_gwent_screenshot.png)

## About

This project combines the gameplay of Gwent card battles with the iconic units from Age of Empires II. Play tactical card battles using AoE2 themed units.

## Features

- Card-based strategy gameplay with Gwent-inspired mechanics
- Weather effects that impact the battlefield
- Smooth card animations powered by GSAP
- Bot opponent for single-player matches
- State machine architecture for robust game flow

## Tech Stack

- PixiJS 8.6 for high-performance 2D rendering
- TypeScript for type-safe development
- Vite for fast development and building
- GSAP for animations
- State machine pattern for game state management

## Installation

```bash
cd aoe-gwent
npm install
```

## Running the Game

### Development Mode

```bash
npm run dev
```

Then open your browser to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

## How to Play

1. Each player has a deck of cards representing AoE2 units
2. Cards are played in different rows (melee, ranged, siege)
3. Weather effects can influence card values
4. The player with the highest total score wins the round
5. Best of three rounds wins the match

## Project Structure

```
aoe-gwent/
├── src/
│   ├── entities/       # Game entities (Cards, Deck, Player)
│   ├── shared/         # Shared game logic and state management
│   ├── ui/             # UI components and scenes
│   ├── local-server/   # Bot AI and game server
│   └── plugins/        # PixiJS plugins and adapters
├── public/
│   └── sprites/        # Card sprites and game assets
└── index.html          # Entry point
```

## Assets

Card sprites and game assets are located in the `public/sprites` directory.

## License

This project is for educational and entertainment purposes.

## Acknowledgments

Inspired by GWENT: The Witcher Card Game and Age of Empires II by Ensemble Studios / Microsoft.

- Inspired by GWENT: The Witcher Card Game
- Age of Empires II by Ensemble Studios / Microsoft
