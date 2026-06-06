# LisbonStartup_MonadMarketEcosytem

# 🚀 StartupMarket — Hackathon DApp

> A decentralized startup ecosystem built on Ethereum. Create startups, trade conviction tokens on a bonding curve, vote on milestones, and track rankings on a live leaderboard.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Smart Contract](#smart-contract)
- [Requirements](#requirements)
- [Installation](#installation)
- [Running the App](#running-the-app)
- [Features](#features)
- [Contract Reference](#contract-reference)

---

## Overview

StartupMarket is a one-day hackathon DApp deployed on **Remix VM (Osaka)** at:

```
0xd9145CCE52D386f254917e481eB44e9943F39138
```

It allows users to:
- 🚀 **Create** on-chain startups
- 💰 **Buy** conviction tokens via a linear bonding curve
- 📤 **Sell** tokens back to the curve for ETH
- 🏆 **View** a leaderboard ranked by token supply
- 🗳️ **Vote** on milestones with token-weighted governance

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Browser / UI                     │
│                                                     │
│   React 18 + Vite  ──►  src/App.jsx                │
│   CSS Variables    ──►  src/index.css               │
│   Entry Point      ──►  src/main.jsx                │
└───────────────────────────┬─────────────────────────┘
                            │  ethers.js v6
                            │  BrowserProvider + Signer
                            ▼
┌─────────────────────────────────────────────────────┐
│              Wallet Layer (MetaMask)                │
│                                                     │
│   window.ethereum  ──►  eth_requestAccounts        │
│   accountsChanged  ──►  auto-reload on switch      │
└───────────────────────────┬─────────────────────────┘
                            │  JSON-RPC
                            ▼
┌─────────────────────────────────────────────────────┐
│         Smart Contract — StartupMarket.sol          │
│                  Solidity ^0.8.20                   │
│                                                     │
│   ┌─────────────┐   ┌──────────────┐               │
│   │   Startup   │   │  Milestone   │               │
│   │  (struct)   │   │  (struct)    │               │
│   └──────┬──────┘   └──────┬───────┘               │
│          │                 │                        │
│   ┌──────▼─────────────────▼───────┐               │
│   │        Bonding Curve           │               │
│   │  price = BASE + SLOPE × supply │               │
│   └────────────────────────────────┘               │
└─────────────────────────────────────────────────────┘
```

### Data Flow

```
User Input
    │
    ▼
React State (useState)
    │
    ├──► Read calls  ──► readContract (provider) ──► view functions
    │         └── debounced 600ms for price previews
    │
    └──► Write calls ──► contract (signer) ──► tx.wait() ──► toast notify
```

---

## Project Structure

```
startupmarket/
│
├── src/
│   ├── App.jsx          # Main React component — all 5 tabs + wallet logic
│   ├── index.css        # Global styles — neon dark theme, CSS variables
│   └── main.jsx         # React root entry point
│
├── index.html           # Vite HTML shell
├── vite.config.js       # Vite + React plugin config
├── package.json         # Dependencies & scripts
├── README.md            # This file
│
└── contracts/           # (optional — for reference)
    └── StartupMarket.sol
```

---

## Smart Contract

| Property | Value |
|---|---|
| **Contract** | `StartupMarket` |
| **Address** | `0xd9145CCE52D386f254917e481eB44e9943F39138` |
| **Network** | Remix VM (Osaka) |
| **Compiler** | Solidity `^0.8.20` |
| **Bonding Curve** | Linear — `BASE_PRICE + SLOPE × supply` |

---

## Requirements

### Node & npm

| Tool | Minimum Version |
|---|---|
| Node.js | `>= 18.0.0` |
| npm | `>= 9.0.0` |

Check your versions:
```bash
node --version
npm --version
```

### npm Dependencies

| Package | Version | Purpose |
|---|---|---|
| `react` | `^18.3.1` | UI framework |
| `react-dom` | `^18.3.1` | React DOM renderer |
| `ethers` | `^6.13.2` | Ethereum / contract interaction |

### npm Dev Dependencies

| Package | Version | Purpose |
|---|---|---|
| `vite` | `^5.4.1` | Build tool & dev server |
| `@vitejs/plugin-react` | `^4.3.1` | JSX transform for Vite |

### Browser

| Requirement | Details |
|---|---|
| MetaMask | [metamask.io](https://metamask.io) — or any EIP-1193 wallet |
| Modern browser | Chrome, Firefox, Brave, Edge |

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-username/startupmarket.git
cd startupmarket
```

### 2. Install dependencies

```bash
npm install
```

This installs everything defined in `package.json`:

```bash
# Production dependencies
npm install react react-dom ethers

# Dev dependencies
npm install --save-dev vite @vitejs/plugin-react
```

### 3. Verify `package.json`

```json
{
  "name": "startupmarket",
  "version": "1.0.0",
  "scripts": {
    "dev":     "vite",
    "build":   "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "ethers":    "^6.13.2",
    "react":     "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite":                 "^5.4.1"
  }
}
```

### 4. Verify `vite.config.js`

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()]
})
```

### 5. Verify `index.html`

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>StartupMarket</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

---

## Running the App

### Development server

```bash
npm run dev
```

Opens at `http://localhost:5173`

### Production build

```bash
npm run build
```

Output in `/dist` — ready to deploy to GitHub Pages, Vercel, Netlify, etc.

### Preview production build locally

```bash
npm run preview
```

---

## Features

| Tab | Description |
|---|---|
| 🚀 **Create Startup** | Register a startup on-chain with name + description |
| 💰 **Buy Tokens** | Purchase conviction tokens — live price preview (debounced 600ms) |
| 📤 **Sell Tokens** | Sell tokens back to bonding curve for ETH — live return preview |
| 🏆 **Leaderboard** | All startups ranked by token supply with 🥇🥈🥉 medals |
| 🗳️ **Milestones** | Create milestones, vote For/Against, resolve with pass/fail badge |

---

## Contract Reference

### Write Functions

```solidity
createStartup(string name, string description)
buyTokens(uint256 startupId, uint256 amount)        // payable
sellTokens(uint256 startupId, uint256 amount)
createMilestone(uint256 startupId, string description)
vote(uint256 milestoneId, bool support)
resolveMilestone(uint256 milestoneId)
```

### Read Functions

```solidity
getLeaderboard()                                    // returns Startup[]
getBuyPrice(uint256 startupId, uint256 amount)      // returns uint256 (wei)
getSellReturn(uint256 startupId, uint256 amount)    // returns uint256 (wei)
getMyTokens(uint256 startupId)                      // returns uint256
getStartup(uint256 id)                              // returns Startup struct
getMilestone(uint256 id)                            // returns Milestone struct
startupCount()                                      // returns uint256
milestoneCount()                                    // returns uint256
```

### Events

```solidity
StartupCreated(uint256 id, string name, address founder)
TokensBought(uint256 startupId, address buyer, uint256 amount, uint256 ethPaid)
TokensSold(uint256 startupId, address seller, uint256 amount, uint256 ethReturned)
MilestoneCreated(uint256 milestoneId, uint256 startupId, string description)
VoteCast(uint256 milestoneId, address voter, bool support, uint256 weight)
MilestoneResolved(uint256 milestoneId, bool passed)
```

---

## License

MIT



