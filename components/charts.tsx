"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

/* ---------------------------------------------------------------- */
/* sparkline                                                        */
/* ---------------------------------------------------------------- */

export function Sparkline({
  data,
  width = 120,
  height = 36,
  tone = "auto",
  fill = true,
  strokeWidth = 1.6,
  responsive = false,
  className = "",
}: {
  data: number[];
  width?: number;
  height?: number;
  tone?: "auto" | "green" | "red" | "violet" | "cyan";
  fill?: boolean;
  strokeWidth?: number;
  /** Scale to the parent's width instead of rendering at a fixed pixel size. */
  responsive?: boolean;
  className?: string;
}) {
  const id = useId().replace(/[:]/g, "");
  const { path, area, color } = useMemo(() => {
    if (!data || data.length < 2) return { path: "", area: "", color: "#2fe3a0" };
    const min = Math.min(...data);
    const max = Math.max(...data);
    const span = max - min || 1;
    const step = width / (data.length - 1);
    const pts = data.map((v, i) => [i * step, height - 3 - ((v - min) / span) * (height - 6)]);
    let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
    for (let i = 1; i < pts.length; i++) {
      const [x, y] = pts[i];
      const [px, py] = pts[i - 1];
      const cx = (px + x) / 2;
      d += ` C ${cx.toFixed(2)} ${py.toFixed(2)}, ${cx.toFixed(2)} ${y.toFixed(2)}, ${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    const a = `${d} L ${width} ${height} L 0 ${height} Z`;
    const up = data[data.length - 1] >= data[0];
    const c = tone === "auto" ? (up ? "#2fe3a0" : "#ff5d7a") : tone === "green" ? "#2fe3a0" : tone === "red" ? "#ff5d7a" : tone === "violet" ? "#8b7bff" : "#4cc9f0";
    return { path: d, area: a, color: c };
  }, [data, width, height, tone]);

  if (!path) return <div style={{ width: responsive ? "100%" : width, height }} />;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      height={height}
      width={responsive ? "100%" : width}
      preserveAspectRatio={responsive ? "none" : undefined}
      className={`overflow-visible ${className}`}
    >
      <defs>
        <linearGradient id={`sg-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#sg-${id})`} />}
      <path d={path} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
        vectorEffect={responsive ? "non-scaling-stroke" : undefined} />
    </svg>
  );
}

/* ---------------------------------------------------------------- */
/* donut                                                            */
/* ---------------------------------------------------------------- */

export const PALETTE = ["#2fe3a0", "#8b7bff", "#4cc9f0", "#ffc061", "#ff5d7a", "#5b6a82"];

export function Donut({
  data,
  size = 168,
  thickness = 18,
  centerLabel,
  centerValue,
}: {
  data: Array<{ label: string; value: number; pct: number; color?: string }>;
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const total = data.reduce((s, d) => s + d.pct, 0) || 1;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,.05)" strokeWidth={thickness} />
        {data.map((d, i) => {
          const pct = d.pct / total;
          const dash = Math.max(0, pct * circumference - 3);
          const el = (
            <circle
              key={d.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={d.color ?? PALETTE[i % PALETTE.length]}
              strokeWidth={thickness}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="round"
              style={{ transition: "stroke-dasharray .8s ease, stroke-dashoffset .8s ease" }}
            />
          );
          offset += pct * circumference;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {centerValue && <div className="num text-[19px] font-semibold">{centerValue}</div>}
        {centerLabel && <div className="mt-0.5 text-[9.5px] uppercase tracking-[0.14em] text-muted">{centerLabel}</div>}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* price chart (lightweight-charts)                                 */
/* ---------------------------------------------------------------- */

export type ChartPoint = { t: number; v: number };

export function PriceChart({
  data,
  height = 300,
  tone = "auto",
  showTime = false,
  markers,
}: {
  data: ChartPoint[];
  height?: number;
  tone?: "auto" | "green" | "red";
  showTime?: boolean;
  markers?: Array<{ t: number; label: string; side: "BUY" | "SELL" }>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  const color = useMemo(() => {
    if (tone === "green") return "#2fe3a0";
    if (tone === "red") return "#ff5d7a";
    if (data.length > 1 && data[data.length - 1].v >= data[0].v) return "#2fe3a0";
    return "#ff5d7a";
  }, [tone, data]);

  useEffect(() => {
    let cancelled = false;
    let observer: ResizeObserver | null = null;
    (async () => {
      const lib = await import("lightweight-charts");
      if (cancelled || !ref.current) return;
      const chart = lib.createChart(ref.current, {
        width: ref.current.clientWidth,
        height,
        layout: {
          background: { type: lib.ColorType.Solid, color: "transparent" },
          textColor: "#6d778b",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          fontSize: 10,
        },
        grid: {
          vertLines: { color: "rgba(255,255,255,.035)" },
          horzLines: { color: "rgba(255,255,255,.035)" },
        },
        rightPriceScale: { borderColor: "rgba(255,255,255,.06)", scaleMargins: { top: 0.12, bottom: 0.08 } },
        timeScale: {
          borderColor: "rgba(255,255,255,.06)",
          timeVisible: showTime,
          secondsVisible: false,
          rightOffset: 3,
          barSpacing: 8,
        },
        crosshair: {
          vertLine: { color: "rgba(255,255,255,.18)", width: 1, style: 2, labelBackgroundColor: "#1a2230" },
          horzLine: { color: "rgba(255,255,255,.18)", width: 1, style: 2, labelBackgroundColor: "#1a2230" },
        },
        handleScroll: { mouseWheel: false, pressedMouseMove: true },
        handleScale: { mouseWheel: false, pinch: true },
      });
      const series = chart.addAreaSeries({
        lineColor: color,
        topColor: `${color}33`,
        bottomColor: `${color}00`,
        lineWidth: 2,
        priceLineColor: `${color}88`,
        priceLineStyle: 2,
        crosshairMarkerBorderColor: color,
        crosshairMarkerBackgroundColor: "#0a0f18",
      });
      chartRef.current = chart;
      seriesRef.current = series;
      observer = new ResizeObserver((entries) => {
        const w = entries[0]?.contentRect.width;
        if (w) chart.applyOptions({ width: w });
      });
      observer.observe(ref.current);
      setReady(true);
    })();
    return () => {
      cancelled = true;
      observer?.disconnect();
      chartRef.current?.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, showTime]);

  useEffect(() => {
    if (!ready || !seriesRef.current) return;
    seriesRef.current.applyOptions({ lineColor: color, topColor: `${color}33`, bottomColor: `${color}00`, priceLineColor: `${color}88` });
    const seen = new Set<number>();
    const points = data
      .filter((p) => {
        if (seen.has(p.t)) return false;
        seen.add(p.t);
        return true;
      })
      .map((p) => ({ time: p.t as any, value: p.v }))
      .sort((a, b) => (a.time as number) - (b.time as number));
    seriesRef.current.setData(points);
    if (markers?.length) {
      seriesRef.current.setMarkers(
        markers.map((m) => ({
          time: m.t as any,
          position: m.side === "BUY" ? "belowBar" : "aboveBar",
          color: m.side === "BUY" ? "#2fe3a0" : "#ff5d7a",
          shape: m.side === "BUY" ? "arrowUp" : "arrowDown",
          text: m.label,
        }))
      );
    } else {
      seriesRef.current.setMarkers([]);
    }
  }, [data, color, ready, markers]);

  return (
    <div className="relative w-full">
      {!ready && <div className="skeleton absolute inset-0 z-10 rounded-xl" style={{ height }} />}
      <div ref={ref} style={{ height }} className="w-full" />
    </div>
  );
}
