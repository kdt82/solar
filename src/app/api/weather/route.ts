import { NextResponse } from "next/server";

// Dapto, NSW, Australia coordinates
const LATITUDE = -34.4981;
const LONGITUDE = 150.7964;

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Using Open-Meteo API (free, no API key required)
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}&current=temperature_2m,weather_code&timezone=Australia/Sydney`;
    
    const response = await fetch(url, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      throw new Error(`Weather API returned ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json({
      temperature: data.current.temperature_2m,
      weatherCode: data.current.weather_code,
      timezone: data.timezone,
      timestamp: data.current.time,
    });
  } catch (error) {
    console.error("Weather API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch weather data" },
      { status: 500 }
    );
  }
}
