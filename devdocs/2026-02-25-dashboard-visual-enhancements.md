# Dashboard Visual Enhancements & Data Sync Sync (2026-02-25)

## Overview
Enhanced the `SimplifiedDashboard` component to ensure accurate real-time data synchronization between the visual circles and the underlying data tables. Improved the aesthetic UI representing power flow by adding dynamic coloring, responsive shading, battery tracking in kW, and auto-greying features for idle states.

## Changes Implemented

### 1. Unified Solar Generation Sync
*   **Issue:** The Nelsons House orange circle was falling out of sync with the Solar Inverters table below it because it used a cached 30-second cloud reading (`raw_properties.GenerationPower`) while the table used 5-second local LAN polling (`nelson.generation`).
*   **Fix:** Updated `src/app/page.tsx` to strictly use the local LAN feed `(nelson?.generation ?? 0) * 1000` to power the visual dashboard, ensuring the top readout and bottom table are perfectly in phase.

### 2. Battery Current kW Readout
*   **Issue:** Users required a clear view of how much physical kW storage corresponded to the battery SOC. 
*   **Fix:** Appended a `kW` label beneath the `99%` readout. It operates between $0 - 27kW$ bounds ($100\%$ display vs. bottoming out at the $12\%$ grace-limit restriction).

### 3. Idle Grey-Out Mechanism for Solar Generation
*   **Feature:** Solar panels should reflect a disconnected or "sleeping" visual state if generation hits strictly $0.00kW$. 
*   **Mechanic:** Implemented `useState` and `useEffect` timers within the `<SimplifiedDashboard />` component. If output reaches $0.00kW$ for both Nelson or Granny flats, counting triggers. If $5$ full minutes pass with $0$ output, the orange circle elegantly switches to a muted `#64748b` grey.

### 4. Dynamic Property Usage Variables
*   **Feature:** Homes needed visual indicators based on heavy or light draw.
*   **Implementation:** Developed generic function handler `getUsageStyle(w: number)` for property draw circles.
    *   `< 1.50 kW`: Green theme (`#22c55e`).
    *   `1.50 - 2.50 kW`: Orange theme (`#f59e0b`).
    *   `> 2.50 kW`: Red theme (`#ef4444`).

### 5. UI/UX: 3D Depth & Gradient Modeling
*   **Enhancement:** Refined the flat mobile icons to provide a more defined, "app-like" structural depth without overriding the current theme variables or resorting to clip-art imagery (e.g., rigid houses or suns).
*   **CSS Upgrades:** Re-configured the `style{}` injection logic for colored circles to map robust `linear-gradient` shading across elements. Added `.midCard` drop styling. 
    *   `inset` white shadows define upper edges acting as rim-lighting.
    *   `textShadow` added to ensure foreground lettering (`"1.50 kW"`) retains contrast over variable gradient backgrounds.
    *   `box-shadow` drops added to create the floating "pill" aesthetics common in modern dashboards.
