# VICEFX Custom Chart Engine — Showcase Edition

A clean and self-contained demonstration of a **custom high-performance candlestick chart engine** built on top of `lightweight-charts` with fully manual enhancements:

- ✔️ Synthetic live OHLC generator  
- ✔️ Smooth micro-tick price animation (sinusoidal easing)  
- ✔️ Ghost candles (predictive future bars)  
- ✔️ Custom overlay rendering (canvas grid, labels, last price line)  
- ✔️ Candlestick flip logic  
- ✔️ Zero dependencies on backend / context  
- ✔️ Lightweight, readable, and production-style code  
- ✔️ Perfect for demonstrating chart-engineering skills

This version is intentionally simplified and cleaned for professional review, derived from a much larger proprietary chart system built for **VICEFX**.


## 🚀 Features

### **1. Real-time Synthetic Candles**
A small OHLC generator simulates a real asset feed, updating every second.  
Useful for showing animation behavior without connecting to a backend.

### **2. Micro-Tick Animation**
Every price update generates a micro-tick path:

- Smooth sinusoidal easing  
- Zero-lag frame updates  
- Live candle high/low expansion  
- Very natural "breathing" price movement  

### **3. Ghost Candles**
Automatically created future candles used for visualizing trend momentum:

- Based on previous candle behavior  
- Updated every candle flip  
- Rendered beneath the main series (as transparent gold bars)

### **4. Custom Overlay Layer**
A fully manual canvas layer for:

- Horizontal grid lines  
- Live last-price line  
- Price label  
- Flexible styling independent of lightweight-charts  

Demonstrates the ability to blend DOM canvas rendering with third-party chart engines.

### **5. Clean Architecture**
Unlike the full VICEFX production chart:

- No context  
- No state managers  
- No backend polling  
- No trading UI  
- No drawing tools  

Just the core chart engine, isolated for clarity and review.

---

## 🧩 Tech Stack

| Technology | Usage |
|-----------|--------|
| **React** | Rendering + lifecycle |
| **lightweight-charts** | Candle rendering engine |
| **Canvas 2D** | Custom overlays |
| **ES6+ JavaScript** | Animation engine + utilities |

---

## 🛠 Installation

```bash
npm install
npm install lightweight-charts
