"use client";

import { motion } from "framer-motion";
import styles from "./EnergyFlow.module.css";

interface PropertyEnergyFlowProps {
  label: string;
  generation: number;
  consumption: number;
  grid: number;
}

export function PropertyEnergyFlow({ label, generation, consumption, grid }: PropertyEnergyFlowProps) {
  const gridDirection = grid < 0 ? "Sell to Grid" : "Buy from Grid";
  const gridColor = grid < 0 ? "#4ade80" : "#f87171";

  return (
    <div className={styles.propertyFlow}>
      <h3 className={styles.propertyTitle}>{label}</h3>
      <svg className={styles.diagram} viewBox="0 0 600 180" preserveAspectRatio="xMidYMid meet">
        {/* Generation (Sun) */}
        <circle cx="100" cy="90" r="35" fill="#fbbf24" className={styles.circle} />
        <text x="100" y="95" textAnchor="middle" dominantBaseline="middle" fontSize="24">☀️</text>
        <text x="100" y="140" textAnchor="middle" className={styles.label}>Generation</text>
        <text x="100" y="158" textAnchor="middle" className={styles.value}>{generation.toFixed(2)} kW</text>

        {/* Line: Generation to Consumption */}
        <line x1="135" y1="90" x2="245" y2="90" stroke="#e5e7eb" strokeWidth="3" />
        
        {/* Animated dots: Generation to Consumption */}
        <motion.circle
          cx="135"
          cy="90"
          r="4"
          fill="#fbbf24"
          animate={{ cx: [135, 245] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
        <motion.circle
          cx="145"
          cy="90"
          r="4"
          fill="#fbbf24"
          animate={{ cx: [135, 245] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 0.4 }}
        />
        <motion.circle
          cx="155"
          cy="90"
          r="4"
          fill="#fbbf24"
          animate={{ cx: [135, 245] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 0.8 }}
        />

        {/* Consumption (House) */}
        <circle cx="280" cy="90" r="35" fill="#60a5fa" className={styles.circle} />
        <text x="280" y="95" textAnchor="middle" dominantBaseline="middle" fontSize="24">🏠</text>
        <text x="280" y="140" textAnchor="middle" className={styles.label}>Consumption</text>
        <text x="280" y="158" textAnchor="middle" className={styles.value}>{Math.abs(consumption).toFixed(2)} kW</text>

        {/* Line: Between Consumption and Grid */}
        <line x1="315" y1="90" x2="445" y2="90" stroke="#e5e7eb" strokeWidth="3" />
        
        {/* Animated dots with direction based on grid flow */}
        {grid < 0 ? (
          // Exporting to grid: dots move right (house -> grid)
          <>
            <motion.circle
              cx="315"
              cy="90"
              r="4"
              fill="#4ade80"
              animate={{ cx: [315, 445] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
            <motion.circle
              cx="325"
              cy="90"
              r="4"
              fill="#4ade80"
              animate={{ cx: [315, 445] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 0.4 }}
            />
            <motion.circle
              cx="335"
              cy="90"
              r="4"
              fill="#4ade80"
              animate={{ cx: [315, 445] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 0.8 }}
            />
          </>
        ) : (
          // Importing from grid: dots move left (grid -> house)
          <>
            <motion.circle
              cx="445"
              cy="90"
              r="4"
              fill="#f87171"
              animate={{ cx: [445, 315] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
            <motion.circle
              cx="435"
              cy="90"
              r="4"
              fill="#f87171"
              animate={{ cx: [445, 315] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 0.4 }}
            />
            <motion.circle
              cx="425"
              cy="90"
              r="4"
              fill="#f87171"
              animate={{ cx: [445, 315] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 0.8 }}
            />
          </>
        )}

        {/* Grid */}
        <circle cx="480" cy="90" r="35" fill={gridColor} className={styles.circle} />
        <text x="480" y="95" textAnchor="middle" dominantBaseline="middle" fontSize="24">⚡</text>
        <text x="480" y="140" textAnchor="middle" className={styles.label}>{gridDirection}</text>
        <text x="480" y="158" textAnchor="middle" className={styles.value}>{Math.abs(grid).toFixed(2)} kW</text>
      </svg>
    </div>
  );
}

interface CombinedEnergyFlowProps {
  generation: number;
  consumption: number;
  grid: number;
}

export function CombinedEnergyFlow({ generation, consumption, grid }: CombinedEnergyFlowProps) {
  const gridDirection = grid < 0 ? "Sell to Grid" : "Buy from Grid";
  const gridColor = grid < 0 ? "#4ade80" : "#f87171";

  return (
    <div className={styles.combinedFlow}>
      <h2 className={styles.combinedTitle}>Combined Energy Flow</h2>
      <svg className={styles.diagramLarge} viewBox="0 0 700 220" preserveAspectRatio="xMidYMid meet">
        {/* Generation (Sun) */}
        <circle cx="120" cy="110" r="45" fill="#fbbf24" className={styles.circle} />
        <text x="120" y="118" textAnchor="middle" dominantBaseline="middle" fontSize="32">☀️</text>
        <text x="120" y="175" textAnchor="middle" className={styles.labelLarge}>Total Generation</text>
        <text x="120" y="198" textAnchor="middle" className={styles.valueLarge}>{generation.toFixed(2)} kW</text>

        {/* Line: Generation to Consumption */}
        <line x1="165" y1="110" x2="285" y2="110" stroke="#e5e7eb" strokeWidth="4" />
        
        {/* Animated dots: Generation to Consumption */}
        <motion.circle
          cx="165"
          cy="110"
          r="5"
          fill="#fbbf24"
          animate={{ cx: [165, 285] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
        <motion.circle
          cx="175"
          cy="110"
          r="5"
          fill="#fbbf24"
          animate={{ cx: [165, 285] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 0.4 }}
        />
        <motion.circle
          cx="185"
          cy="110"
          r="5"
          fill="#fbbf24"
          animate={{ cx: [165, 285] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 0.8 }}
        />

        {/* Consumption (House) */}
        <circle cx="330" cy="110" r="45" fill="#60a5fa" className={styles.circle} />
        <text x="330" y="118" textAnchor="middle" dominantBaseline="middle" fontSize="32">🏠</text>
        <text x="330" y="175" textAnchor="middle" className={styles.labelLarge}>Total Consumption</text>
        <text x="330" y="198" textAnchor="middle" className={styles.valueLarge}>{Math.abs(consumption).toFixed(2)} kW</text>

        {/* Line: Between Consumption and Grid */}
        <line x1="375" y1="110" x2="515" y2="110" stroke="#e5e7eb" strokeWidth="4" />
        
        {/* Animated dots with direction based on grid flow */}
        {grid < 0 ? (
          // Exporting to grid: dots move right (house -> grid)
          <>
            <motion.circle
              cx="375"
              cy="110"
              r="5"
              fill="#4ade80"
              animate={{ cx: [375, 515] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
            <motion.circle
              cx="385"
              cy="110"
              r="5"
              fill="#4ade80"
              animate={{ cx: [375, 515] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 0.4 }}
            />
            <motion.circle
              cx="395"
              cy="110"
              r="5"
              fill="#4ade80"
              animate={{ cx: [375, 515] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 0.8 }}
            />
          </>
        ) : (
          // Importing from grid: dots move left (grid -> house)
          <>
            <motion.circle
              cx="515"
              cy="110"
              r="5"
              fill="#f87171"
              animate={{ cx: [515, 375] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
            <motion.circle
              cx="505"
              cy="110"
              r="5"
              fill="#f87171"
              animate={{ cx: [515, 375] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 0.4 }}
            />
            <motion.circle
              cx="495"
              cy="110"
              r="5"
              fill="#f87171"
              animate={{ cx: [515, 375] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 0.8 }}
            />
          </>
        )}

        {/* Grid */}
        <circle cx="560" cy="110" r="45" fill={gridColor} className={styles.circle} />
        <text x="560" y="118" textAnchor="middle" dominantBaseline="middle" fontSize="32">⚡</text>
        <text x="560" y="175" textAnchor="middle" className={styles.labelLarge}>{gridDirection}</text>
        <text x="560" y="198" textAnchor="middle" className={styles.valueLarge}>{Math.abs(grid).toFixed(2)} kW</text>
      </svg>
    </div>
  );
}
