"use client";

import { motion } from "framer-motion";
import { useWeather, getWeatherIcon } from "@/hooks/useWeather";
import { useState, useEffect } from "react";
import styles from "./LiveDataCard.module.css";

interface LiveDataCardProps {
  generation: number;
  consumption: number;
  grid: number;
  isOnline?: boolean;
}

// Helper function to determine if it's daytime
function isDaytime(): boolean {
  const now = new Date();
  const hour = now.getHours();
  // Simple approximation: daytime is 6am to 6pm
  // For more accuracy, you could use sunrise/sunset API
  return hour >= 6 && hour < 18;
}

export function LiveDataCard({ generation, consumption, grid, isOnline = true }: LiveDataCardProps) {
  const { weather } = useWeather();
  const isExporting = grid < 0;
  const hasGeneration = generation > 0.01; // Consider > 0.01 kW as active generation
  const [currentTime, setCurrentTime] = useState("");
  const [isDay, setIsDay] = useState(true);

  useEffect(() => {
    // Update time every second
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-AU', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }));
      setIsDay(isDaytime());
    };

    updateTime(); // Initial update
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleWrapper}>
          <h3>Live data</h3>
          <div className={`${styles.statusIndicator} ${isOnline ? styles.online : styles.offline}`} title={isOnline ? "Online" : "Offline"} />
        </div>
        <div className={styles.rightInfo}>
          {currentTime && (
            <span className={styles.time}>{currentTime}</span>
          )}
          {weather && (
            <div className={styles.weather}>
              <span className={styles.temp}>{Math.round(weather.temperature)}°C</span>
              <span className={styles.icon}>{getWeatherIcon(weather.weatherCode)}</span>
            </div>
          )}
        </div>
      </div>

      <svg className={styles.diagram} viewBox="0 0 350 220" preserveAspectRatio="xMidYMid meet">
        {/* Generation Circle */}
        <circle 
          cx="65" 
          cy="70" 
          r="30" 
          fill="#fbbf24" 
          className={styles.circle}
          style={{ opacity: hasGeneration ? 1 : 0.3 }}
        />
        <text 
          x="65" 
          y="75" 
          textAnchor="middle" 
          dominantBaseline="middle" 
          fontSize="28"
          style={{ opacity: hasGeneration ? 1 : 0.3 }}
        >
          {isDay ? "☀️" : "🌙"}
        </text>
        <text x="65" y="125" textAnchor="middle" className={styles.value} fontWeight="600">
          {generation.toFixed(2)}
        </text>
        <text x="65" y="148" textAnchor="middle" className={styles.unit}>kW</text>

        {/* Consumption Circle */}
        <circle cx="175" cy="70" r="30" fill="#60a5fa" className={styles.circle} />
        <text x="175" y="75" textAnchor="middle" dominantBaseline="middle" fontSize="28">🏠</text>
        <text x="175" y="125" textAnchor="middle" className={styles.value} fontWeight="600">
          {Math.abs(consumption).toFixed(2)}
        </text>
        <text x="175" y="148" textAnchor="middle" className={styles.unit}>kW</text>

        {/* Grid Circle */}
        <circle cx="285" cy="70" r="30" fill={isExporting ? "#4ade80" : "#f87171"} className={styles.circle} />
        <text x="285" y="75" textAnchor="middle" dominantBaseline="middle" fontSize="28">⚡</text>
        <text x="285" y="125" textAnchor="middle" className={styles.value} fontWeight="600">
          {Math.abs(grid).toFixed(2)}
        </text>
        <text x="285" y="148" textAnchor="middle" className={styles.unit}>kW</text>

        {/* Connecting line path with dots */}
        <path
          d="M 95 70 L 145 70 M 205 70 L 255 70"
          stroke="#e5e7eb"
          strokeWidth="2"
          strokeDasharray="0"
          fill="none"
        />

        {/* Animated dots on lines */}
        {/* Generation to Consumption flow - only show if generating */}
        {hasGeneration && (
          <>
            <motion.circle
              cx="95"
              cy="70"
              r="3"
              fill="#fbbf24"
              animate={{ cx: [95, 145] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
            <motion.circle
              cx="105"
              cy="70"
              r="3"
              fill="#fbbf24"
              animate={{ cx: [95, 145] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 0.4 }}
            />
            <motion.circle
              cx="115"
              cy="70"
              r="3"
              fill="#fbbf24"
              animate={{ cx: [95, 145] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 0.8 }}
            />
          </>
        )}

        {/* Consumption to/from Grid flow */}
        {isExporting ? (
          // Exporting: dots move right (house -> grid)
          <>
            <motion.circle
              cx="205"
              cy="70"
              r="3"
              fill="#4ade80"
              animate={{ cx: [205, 255] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
            <motion.circle
              cx="215"
              cy="70"
              r="3"
              fill="#4ade80"
              animate={{ cx: [205, 255] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 0.4 }}
            />
            <motion.circle
              cx="225"
              cy="70"
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
              cy="70"
              r="3"
              fill="#f87171"
              animate={{ cx: [255, 205] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
            <motion.circle
              cx="245"
              cy="70"
              r="3"
              fill="#f87171"
              animate={{ cx: [255, 205] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 0.4 }}
            />
            <motion.circle
              cx="235"
              cy="70"
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
