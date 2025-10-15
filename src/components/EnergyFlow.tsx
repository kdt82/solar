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

        {/* Arrow: Generation to Consumption */}
        <line x1="135" y1="90" x2="245" y2="90" stroke="#fbbf24" strokeWidth="3" />
        <motion.polygon
          points="245,90 235,85 235,95"
          fill="#fbbf24"
          animate={{ x: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Consumption (House) */}
        <circle cx="280" cy="90" r="35" fill="#60a5fa" className={styles.circle} />
        <text x="280" y="95" textAnchor="middle" dominantBaseline="middle" fontSize="24">🏠</text>
        <text x="280" y="140" textAnchor="middle" className={styles.label}>Consumption</text>
        <text x="280" y="158" textAnchor="middle" className={styles.value}>{Math.abs(consumption).toFixed(2)} kW</text>

        {/* Arrow: Consumption to Grid */}
        <line x1="315" y1="90" x2="445" y2="90" stroke={gridColor} strokeWidth="3" />
        <motion.polygon
          points="445,90 435,85 435,95"
          fill={gridColor}
          animate={{ x: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
        />

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

        {/* Arrow: Generation to Consumption */}
        <line x1="165" y1="110" x2="285" y2="110" stroke="#fbbf24" strokeWidth="4" />
        <motion.polygon
          points="285,110 273,104 273,116"
          fill="#fbbf24"
          animate={{ x: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Consumption (House) */}
        <circle cx="330" cy="110" r="45" fill="#60a5fa" className={styles.circle} />
        <text x="330" y="118" textAnchor="middle" dominantBaseline="middle" fontSize="32">🏠</text>
        <text x="330" y="175" textAnchor="middle" className={styles.labelLarge}>Total Consumption</text>
        <text x="330" y="198" textAnchor="middle" className={styles.valueLarge}>{Math.abs(consumption).toFixed(2)} kW</text>

        {/* Arrow: Consumption to Grid */}
        <line x1="375" y1="110" x2="515" y2="110" stroke={gridColor} strokeWidth="4" />
        <motion.polygon
          points="515,110 503,104 503,116"
          fill={gridColor}
          animate={{ x: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
        />

        {/* Grid */}
        <circle cx="560" cy="110" r="45" fill={gridColor} className={styles.circle} />
        <text x="560" y="118" textAnchor="middle" dominantBaseline="middle" fontSize="32">⚡</text>
        <text x="560" y="175" textAnchor="middle" className={styles.labelLarge}>{gridDirection}</text>
        <text x="560" y="198" textAnchor="middle" className={styles.valueLarge}>{Math.abs(grid).toFixed(2)} kW</text>
      </svg>
    </div>
  );
}
