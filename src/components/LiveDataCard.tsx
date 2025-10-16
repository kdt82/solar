"use client";

import { motion } from "framer-motion";
import { useWeather, getWeatherIcon } from "@/hooks/useWeather";
import styles from "./LiveDataCard.module.css";

interface LiveDataCardProps {
  generation: number;
  consumption: number;
  grid: number;
}

export function LiveDataCard({ generation, consumption, grid }: LiveDataCardProps) {
  const { weather } = useWeather();
  const isExporting = grid < 0;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3>Live data</h3>
        {weather && (
          <div className={styles.weather}>
            <span className={styles.temp}>{Math.round(weather.temperature)}°C</span>
            <span className={styles.icon}>{getWeatherIcon(weather.weatherCode)}</span>
          </div>
        )}
      </div>

      <svg className={styles.diagram} viewBox="0 0 350 200" preserveAspectRatio="xMidYMid meet">
        {/* Generation Circle */}
        <circle cx="65" cy="80" r="30" fill="#fbbf24" className={styles.circle} />
        <text x="65" y="85" textAnchor="middle" dominantBaseline="middle" fontSize="28">☀️</text>
        <text x="65" y="125" textAnchor="middle" className={styles.value} fontWeight="600">
          {generation.toFixed(2)}
        </text>
        <text x="65" y="142" textAnchor="middle" className={styles.unit}>kW</text>

        {/* Consumption Circle */}
        <circle cx="175" cy="80" r="30" fill="#60a5fa" className={styles.circle} />
        <text x="175" y="85" textAnchor="middle" dominantBaseline="middle" fontSize="28">🏠</text>
        <text x="175" y="125" textAnchor="middle" className={styles.value} fontWeight="600">
          {Math.abs(consumption).toFixed(2)}
        </text>
        <text x="175" y="142" textAnchor="middle" className={styles.unit}>kW</text>

        {/* Grid Circle */}
        <circle cx="285" cy="80" r="30" fill={isExporting ? "#4ade80" : "#f87171"} className={styles.circle} />
        <text x="285" y="85" textAnchor="middle" dominantBaseline="middle" fontSize="28">⚡</text>
        <text x="285" y="125" textAnchor="middle" className={styles.value} fontWeight="600">
          {Math.abs(grid).toFixed(2)}
        </text>
        <text x="285" y="142" textAnchor="middle" className={styles.unit}>kW</text>

        {/* Connecting line path with dots */}
        <path
          d="M 95 80 L 145 80 M 205 80 L 255 80"
          stroke="#e5e7eb"
          strokeWidth="2"
          strokeDasharray="0"
          fill="none"
        />

        {/* Animated dots on lines */}
        {/* Generation to Consumption flow */}
        <motion.circle
          cx="95"
          cy="80"
          r="3"
          fill="#fbbf24"
          animate={{ cx: [95, 145] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
        <motion.circle
          cx="105"
          cy="80"
          r="3"
          fill="#fbbf24"
          animate={{ cx: [95, 145] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 0.4 }}
        />
        <motion.circle
          cx="115"
          cy="80"
          r="3"
          fill="#fbbf24"
          animate={{ cx: [95, 145] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 0.8 }}
        />

        {/* Consumption to/from Grid flow */}
        {isExporting ? (
          // Exporting: dots move right (house -> grid)
          <>
            <motion.circle
              cx="205"
              cy="80"
              r="3"
              fill="#4ade80"
              animate={{ cx: [205, 255] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
            <motion.circle
              cx="215"
              cy="80"
              r="3"
              fill="#4ade80"
              animate={{ cx: [205, 255] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 0.4 }}
            />
            <motion.circle
              cx="225"
              cy="80"
              r="3"
              fill="#4ade80"
              animate={{ cx: [205, 255] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 0.8 }}
            />
          </>
        ) : (
          // Importing: dots move left (grid -> house)
          <>
            <motion.circle
              cx="255"
              cy="80"
              r="3"
              fill="#f87171"
              animate={{ cx: [255, 205] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
            <motion.circle
              cx="245"
              cy="80"
              r="3"
              fill="#f87171"
              animate={{ cx: [255, 205] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 0.4 }}
            />
            <motion.circle
              cx="235"
              cy="80"
              r="3"
              fill="#f87171"
              animate={{ cx: [255, 205] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 0.8 }}
            />
          </>
        )}
      </svg>
    </div>
  );
}
