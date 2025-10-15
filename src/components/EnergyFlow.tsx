"use client";

import { motion } from "framer-motion";
import styles from "./EnergyFlow.module.css";

interface EnergyFlowProps {
  generation: number;
  consumption: number;
  grid: number;
}

export function EnergyFlow({ generation, consumption, grid }: EnergyFlowProps) {
  // Calculate which direction energy flows
  const gridDirection = grid > 0 ? "Export" : "Import";

  return (
    <div className={styles.container}>
      <div className={styles.title}>Energy Flow</div>

      <svg
        className={styles.diagram}
        viewBox="0 0 800 300"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Generation Source */}
        <g className={styles.sourceGroup}>
          <circle cx="120" cy="150" r="50" className={styles.circle} fill="#FFD700" />
          <g transform="translate(120, 150)" className={styles.icon}>
            <text x="0" y="0" textAnchor="middle" dominantBaseline="middle" fontSize="32">
              ☀️
            </text>
          </g>
          <text x="120" y="220" textAnchor="middle" className={styles.label}>
            Generation
          </text>
          <text x="120" y="245" textAnchor="middle" className={styles.value}>
            {generation.toFixed(2)} kW
          </text>
        </g>

        {/* Home Consumption */}
        <g className={styles.homeGroup}>
          <circle cx="400" cy="150" r="50" className={styles.circle} fill="#87CEEB" />
          <g transform="translate(400, 150)" className={styles.icon}>
            <text x="0" y="0" textAnchor="middle" dominantBaseline="middle" fontSize="32">
              🏠
            </text>
          </g>
          <text x="400" y="220" textAnchor="middle" className={styles.label}>
            Consumption
          </text>
          <text x="400" y="245" textAnchor="middle" className={styles.value}>
            {consumption.toFixed(2)} kW
          </text>
        </g>

        {/* Grid */}
        <g className={styles.gridGroup}>
          <circle cx="680" cy="150" r="50" className={styles.circle} fill="#90EE90" />
          <g transform="translate(680, 150)" className={styles.icon}>
            <text x="0" y="0" textAnchor="middle" dominantBaseline="middle" fontSize="32">
              🔌
            </text>
          </g>
          <text x="680" y="220" textAnchor="middle" className={styles.label}>
            {gridDirection}
          </text>
          <text x="680" y="245" textAnchor="middle" className={styles.value}>
            {Math.abs(grid).toFixed(2)} kW
          </text>
        </g>

        {/* Flow Lines with animated arrows */}
        {/* Generation to Home */}
        <line x1="170" y1="150" x2="350" y2="150" className={styles.flowLine} />
        <motion.polygon
          points="350,150 340,145 340,155"
          className={styles.flowArrow}
          fill={generation > 0 ? "#FFD700" : "#ccc"}
          animate={{ x: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Home to Grid */}
        <line
          x1="450"
          y1="150"
          x2="630"
          y2="150"
          className={styles.flowLine}
          stroke={gridDirection === "Export" ? "#90EE90" : "#FF6B6B"}
        />
        <motion.polygon
          points="630,150 620,145 620,155"
          className={styles.flowArrow}
          fill={gridDirection === "Export" ? "#90EE90" : "#FF6B6B"}
          animate={{ x: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
        />

        {/* Power values on lines */}
        <text x="260" y="135" className={styles.lineLabel}>
          {Math.min(generation, consumption).toFixed(2)} kW
        </text>
        <text x="540" y="135" className={styles.lineLabel}>
          {Math.abs(grid).toFixed(2)} kW
        </text>
      </svg>
    </div>
  );
}
