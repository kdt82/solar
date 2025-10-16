import useSWR from "swr";

type WeatherData = {
  temperature: number;
  weatherCode: number;
  timezone: string;
  timestamp: string;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useWeather() {
  const { data, error, isLoading } = useSWR<WeatherData>(
    "/api/weather",
    fetcher,
    {
      refreshInterval: 300000, // Refresh every 5 minutes
      revalidateOnFocus: false,
    }
  );

  return {
    weather: data,
    error,
    isLoading,
  };
}

export function getWeatherIcon(code: number): string {
  // WMO Weather interpretation codes
  if (code === 0) return "☀️"; // Clear sky
  if (code <= 3) return "⛅"; // Partly cloudy
  if (code <= 48) return "🌫️"; // Fog
  if (code <= 67) return "🌧️"; // Rain
  if (code <= 77) return "🌨️"; // Snow
  if (code <= 82) return "🌧️"; // Rain showers
  if (code <= 86) return "🌨️"; // Snow showers
  if (code <= 99) return "⛈️"; // Thunderstorm
  return "🌤️"; // Default
}
