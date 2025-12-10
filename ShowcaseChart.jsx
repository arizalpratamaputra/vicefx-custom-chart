import React, { useEffect, useRef, useState } from "react";
import { createChart } from "lightweight-charts";

/**
 * ============================================================
 *  SHOWCASE CHART (OPTION A)
 *  Clean version of your custom chart logic:
 *  - synthetic OHLC generator
 *  - micro-tick animation
 *  - ghost-candle prediction
 *  - custom overlay (grid, labels, last price line)
 *  - lightweight-charts as renderer
 * ============================================================
 */

const ShowcaseChart = () => {
  // --- REFS ---
  const chartRef = useRef(null);
  const containerRef = useRef(null);
  const seriesRef = useRef(null);
  const ghostSeriesRef = useRef(null);

  const liveCandleRef = useRef(null);
  const animationFrame = useRef(null);
  const ghostQueueRef = useRef([]);

  const overlayCanvasRef = useRef(null);

  // --- STATE ---
  const [ready, setReady] = useState(false);
  const timeframe = 1; // 1s synthetic candles

  /** Synthetic OHLC generator */
  function generateNextOHLC(prev) {
    const base = prev.close;
    const noise = (Math.random() - 0.5) * 0.0005; // ~5 pipettes
    const close = base + noise;
    const high = Math.max(base, close) + Math.random() * 0.0003;
    const low = Math.min(base, close) - Math.random() * 0.0003;

    return {
      time: prev.time + timeframe,
      open: prev.close,
      high,
      low,
      close,
    };
  }

  /** Micro tick path generator */
  function generateMicroTicks(fromPrice, toPrice) {
    const count = 6;
    const ticks = [];
    for (let i = 1; i <= count; i++) {
      const t = i / count;
      const eased = fromPrice + (toPrice - fromPrice) * Math.sin((t * Math.PI) / 2);
      ticks.push(eased);
    }
    return ticks;
  }

  /** Initialize ghost queue (future bars) */
  function initGhostQueue(lastRealCandle, count = 6) {
    ghostQueueRef.current = [];
    let prev = { ...lastRealCandle };

    for (let i = 0; i < count; i++) {
      const g = generateNextOHLC(prev);
      prev = g;
      ghostQueueRef.current.push({
        ...g,
        open: g.open,
        high: g.high,
        low: g.low,
        close: g.close,
      });
    }
    ghostSeriesRef.current.setData(ghostQueueRef.current);
  }

  /** Shift ghost queue forward */
  function consumeGhost() {
    const last = ghostQueueRef.current.at(-1);
    initGhostQueue(last, 6);
  }

  /** Smooth animate micro ticks */
  function animateMicroTicks(candleTime, ticks) {
    let i = 0;
    const duration = 80;

    function step(ts, startTs, from) {
      if (!startTs) startTs = ts;

      const t = Math.min((ts - startTs) / duration, 1);
      const eased = from + (ticks[i] - from) * Math.sin((t * Math.PI) / 2);

      liveCandleRef.current.close = eased;
      liveCandleRef.current.high = Math.max(liveCandleRef.current.high, eased);
      liveCandleRef.current.low = Math.min(liveCandleRef.current.low, eased);

      seriesRef.current.update(liveCandleRef.current);
      drawOverlay();

      if (t < 1) {
        animationFrame.current = requestAnimationFrame((nts) =>
          step(nts, startTs, from)
        );
      } else {
        i++;
        if (i < ticks.length) {
          const nextFrom = liveCandleRef.current.close;
          setTimeout(() => {
            animationFrame.current = requestAnimationFrame((nts) =>
              step(nts, null, nextFrom)
            );
          }, 10);
        }
      }
    }

    const from = liveCandleRef.current.close;
    animationFrame.current = requestAnimationFrame((ts) =>
      step(ts, null, from)
    );
  }

  /** Candle update (flip + animation) */
  function updateCandle(newCandle) {
    // first init
    if (!liveCandleRef.current) {
      liveCandleRef.current = { ...newCandle };
      seriesRef.current.update(newCandle);
      initGhostQueue(newCandle, 6);
      drawOverlay();
      return;
    }

    // new bar (time changed)
    if (newCandle.time !== liveCandleRef.current.time) {
      // finalize old
      liveCandleRef.current.close = newCandle.open;
      seriesRef.current.update(liveCandleRef.current);

      // flip
      liveCandleRef.current = {
        time: newCandle.time,
        open: newCandle.open,
        high: newCandle.open,
        low: newCandle.open,
        close: newCandle.open,
      };
      seriesRef.current.update(liveCandleRef.current);

      consumeGhost();
      drawOverlay();
      return;
    }

    // same bar → micro-ticks
    if (newCandle.microTicks) {
      animateMicroTicks(newCandle.time, newCandle.microTicks);
    }
  }

  /** Overlay grid & labels & last price line */
  function drawOverlay() {
    const canvas = overlayCanvasRef.current;
    if (!canvas || !chartRef.current || !seriesRef.current) return;

    const ctx = canvas.getContext("2d");
    const { width, height } = canvas;

    ctx.clearRect(0, 0, width, height);

    const chart = chartRef.current;
    const series = seriesRef.current;
    const live = liveCandleRef.current;
    if (!live) return;

    const price = live.close;
    const y = series.priceToCoordinate(price);
    if (y == null) return;

    // horizontal price line
    ctx.strokeStyle = "#45caff";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
    ctx.stroke();

    // price label (right side)
    ctx.fillStyle = "#45caff";
    ctx.font = "12px monospace";
    const label = price.toFixed(5);
    ctx.fillText(label, width - ctx.measureText(label).width - 8, y - 6);

    // simple grid (horizontal)
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;

    for (let i = 0; i < 6; i++) {
      const gy = (height / 6) * i;
      ctx.beginPath();
      ctx.moveTo(0, gy + 0.5);
      ctx.lineTo(width, gy + 0.5);
      ctx.stroke();
    }
  }

  /** Resize overlay canvas */
  function resizeOverlay() {
    const canvas = overlayCanvasRef.current;
    const parent = containerRef.current;
    if (!canvas || !parent) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = parent.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    drawOverlay();
  }

  /** Setup chart */
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: { background: { color: "#0e1116" }, textColor: "#fff" },
      grid: { horzLines: { visible: false }, vertLines: { visible: false } },
      timeScale: { timeVisible: true, secondsVisible: true },
      rightPriceScale: { visible: true },
    });

    chartRef.current = chart;

    // ghost series (yellow)
    ghostSeriesRef.current = chart.addCandlestickSeries({
      upColor: "rgba(255,215,0,0.4)",
      downColor: "rgba(255,215,0,0.4)",
      borderVisible: false,
      wickUpColor: "rgba(255,215,0,0.4)",
      wickDownColor: "rgba(255,215,0,0.4)",
      priceLineVisible: false,
      lastValueVisible: false,
    });

    // live series (green/red)
    seriesRef.current = chart.addCandlestickSeries({
      upColor: "#2ecc71",
      downColor: "#e74c3c",
      borderVisible: false,
      wickUpColor: "#2ecc71",
      wickDownColor: "#e74c3c",
      priceLineVisible: false,
      lastValueVisible: false,
    });

    setReady(true);

    return () => {
      cancelAnimationFrame(animationFrame.current);
      chart.remove();
    };
  }, []);

  /** Setup overlay canvas */
  useEffect(() => {
    resizeOverlay();
    window.addEventListener("resize", resizeOverlay);
    return () => window.removeEventListener("resize", resizeOverlay);
  }, []);

  /** Synthetic realtime engine */
  useEffect(() => {
    if (!ready) return;
    if (!seriesRef.current) return;

    // initial candle
    const now = Math.floor(Date.now() / 1000);
    let last = {
      time: now - timeframe,
      open: 1.2345,
      high: 1.2345,
      low: 1.2345,
      close: 1.2345,
    };

    seriesRef.current.setData([last]);

    /** every second, create next candle */
    const interval = setInterval(() => {
      const next = generateNextOHLC(last);
      const microTicks = generateMicroTicks(next.open, next.close);

      updateCandle({
        ...next,
        microTicks,
      });

      last = next;
    }, 1000);

    return () => clearInterval(interval);
  }, [ready]);

  return (
    <div
      style={{
        width: "100%",
        height: "500px",
        position: "relative",
        background: "#0e1116",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <div
        ref={containerRef}
        style={{ width: "100%", height: "100%", position: "absolute" }}
      />

      {/* overlay */}
      <canvas
        ref={overlayCanvasRef}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
        }}
      />
    </div>
  );
};

export default ShowcaseChart;
