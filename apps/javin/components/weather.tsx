"use client";

import { isWithinInterval } from "date-fns";

interface WeatherAtLocation {
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    precipitation: number;
    weather_code: number;
    cloud_cover: number;
    surface_pressure: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
  };
  current_units: {
    time: string;
    temperature_2m: string;
    relative_humidity_2m: string;
    apparent_temperature: string;
    precipitation: string;
    weather_code: string;
    cloud_cover: string;
    surface_pressure: string;
    wind_speed_10m: string;
    wind_direction_10m: string;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    precipitation_probability_max: number[];
    wind_speed_10m_max: number[];
    wind_direction_10m_dominant: number[];
    sunrise: string[];
    sunset: string[];
  };
  daily_units: {
    time: string;
    weather_code: string;
    temperature_2m_max: string;
    temperature_2m_min: string;
    precipitation_sum: string;
    precipitation_probability_max: string;
    wind_speed_10m_max: string;
    wind_direction_10m_dominant: string;
    sunrise: string;
    sunset: string;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
    apparent_temperature: number[];
    precipitation: number[];
    precipitation_probability: number[];
    weather_code: number[];
    cloud_cover: number[];
    surface_pressure: number[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];
  };
  hourly_units: {
    time: string;
    temperature_2m: string;
    relative_humidity_2m: string;
    apparent_temperature: string;
    precipitation: string;
    precipitation_probability: string;
    weather_code: string;
    cloud_cover: string;
    surface_pressure: string;
    wind_speed_10m: string;
    wind_direction_10m: string;
  };
}

const SAMPLE: WeatherAtLocation = {
  current: {
    time: "2024-01-15T12:00",
    temperature_2m: 22.5,
    relative_humidity_2m: 65,
    apparent_temperature: 24.1,
    precipitation: 0.0,
    weather_code: 1,
    cloud_cover: 25,
    surface_pressure: 1013.2,
    wind_speed_10m: 3.2,
    wind_direction_10m: 180,
  },
  current_units: {
    time: "iso8601",
    temperature_2m: "°C",
    relative_humidity_2m: "%",
    apparent_temperature: "°C",
    precipitation: "mm",
    weather_code: "wmo code",
    cloud_cover: "%",
    surface_pressure: "hPa",
    wind_speed_10m: "m/s",
    wind_direction_10m: "°",
  },
  daily: {
    time: ["2024-01-15", "2024-01-16", "2024-01-17", "2024-01-18", "2024-01-19", "2024-01-20", "2024-01-21"],
    weather_code: [1, 2, 3, 0, 1, 2, 3],
    temperature_2m_max: [25.2, 23.8, 21.5, 24.1, 26.3, 22.7, 20.9],
    temperature_2m_min: [18.5, 16.2, 14.8, 17.3, 19.1, 15.6, 13.2],
    precipitation_sum: [0.0, 2.5, 8.3, 0.0, 0.0, 1.2, 5.7],
    precipitation_probability_max: [0, 15, 45, 0, 0, 25, 60],
    wind_speed_10m_max: [4.2, 5.1, 6.8, 3.5, 4.9, 5.7, 7.2],
    wind_direction_10m_dominant: [180, 200, 220, 160, 190, 210, 230],
    sunrise: ["06:30", "06:29", "06:28", "06:27", "06:26", "06:25", "06:24"],
    sunset: ["18:45", "18:46", "18:47", "18:48", "18:49", "18:50", "18:51"],
  },
  daily_units: {
    time: "iso8601",
    weather_code: "wmo code",
    temperature_2m_max: "°C",
    temperature_2m_min: "°C",
    precipitation_sum: "mm",
    precipitation_probability_max: "%",
    wind_speed_10m_max: "m/s",
    wind_direction_10m_dominant: "°",
    sunrise: "iso8601",
    sunset: "iso8601",
  },
  hourly: {
    time: [
      "2024-01-15T00:00", "2024-01-15T01:00", "2024-01-15T02:00", "2024-01-15T03:00", "2024-01-15T04:00", "2024-01-15T05:00",
      "2024-01-15T06:00", "2024-01-15T07:00", "2024-01-15T08:00", "2024-01-15T09:00", "2024-01-15T10:00", "2024-01-15T11:00",
      "2024-01-15T12:00", "2024-01-15T13:00", "2024-01-15T14:00", "2024-01-15T15:00", "2024-01-15T16:00", "2024-01-15T17:00",
      "2024-01-15T18:00", "2024-01-15T19:00", "2024-01-15T20:00", "2024-01-15T21:00", "2024-01-15T22:00", "2024-01-15T23:00",
    ],
    temperature_2m: [19.2, 18.8, 18.1, 17.5, 16.9, 16.3, 16.8, 18.2, 20.1, 22.3, 24.1, 25.2, 25.8, 25.5, 24.8, 23.9, 22.7, 21.2, 19.8, 18.9, 18.2, 17.8, 17.5, 17.2],
    relative_humidity_2m: [75, 78, 82, 85, 88, 90, 87, 80, 70, 60, 55, 50, 48, 52, 58, 65, 72, 78, 82, 85, 88, 90, 92, 94],
    apparent_temperature: [20.1, 19.7, 19.0, 18.4, 17.8, 17.2, 17.7, 19.1, 21.0, 23.2, 25.0, 26.1, 26.7, 26.4, 25.7, 24.8, 23.6, 22.1, 20.7, 19.8, 19.1, 18.7, 18.4, 18.1],
    precipitation: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    precipitation_probability: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    weather_code: [1, 1, 0, 0, 0, 0, 0, 1, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    cloud_cover: [25, 30, 20, 15, 10, 5, 10, 20, 35, 45, 30, 25, 20, 25, 30, 35, 40, 35, 30, 25, 20, 15, 10, 5],
    surface_pressure: [1012.5, 1012.8, 1013.0, 1013.2, 1013.5, 1013.8, 1014.0, 1013.8, 1013.5, 1013.2, 1013.0, 1012.8, 1012.5, 1012.2, 1012.0, 1011.8, 1011.5, 1011.8, 1012.0, 1012.2, 1012.5, 1012.8, 1013.0, 1013.2],
    wind_speed_10m: [2.1, 1.8, 1.5, 1.2, 0.9, 0.6, 0.8, 1.2, 1.8, 2.5, 3.2, 3.8, 4.2, 3.9, 3.5, 3.0, 2.5, 2.0, 1.8, 1.5, 1.2, 0.9, 0.6, 0.3],
    wind_direction_10m: [180, 185, 190, 195, 200, 205, 210, 215, 220, 225, 230, 235, 240, 235, 230, 225, 220, 215, 210, 205, 200, 195, 190, 185],
  },
  hourly_units: {
    time: "iso8601",
    temperature_2m: "°C",
    relative_humidity_2m: "%",
    apparent_temperature: "°C",
    precipitation: "mm",
    precipitation_probability: "%",
    weather_code: "wmo code",
    cloud_cover: "%",
    surface_pressure: "hPa",
    wind_speed_10m: "m/s",
    wind_direction_10m: "°",
  },
};

function n(value: number) {
  return Math.round(value * 10) / 10;
}

export function Weather({
  weatherAtLocation = SAMPLE,
}: {
  weatherAtLocation?: WeatherAtLocation;
}) {
  const hourlyTemps = [
    ...weatherAtLocation.hourly.temperature_2m.slice(0, 24),
  ];
  const hourlyTimes = [
    ...weatherAtLocation.hourly.temperature_2m.slice(0, 24),
  ];

  const isDay = isWithinInterval(new Date(weatherAtLocation.current.time), {
    start: new Date(weatherAtLocation.daily.sunrise[0]),
    end: new Date(weatherAtLocation.daily.sunset[0]),
  });

  const getWeatherIcon = (code: number) => {
    if (code === 0) return "☀️"; // Clear sky
    if (code <= 3) return "⛅"; // Partly cloudy
    if (code <= 48) return "☁️"; // Cloudy
    if (code <= 67) return "🌧️"; // Rain
    if (code <= 77) return "❄️"; // Snow
    if (code <= 82) return "🌨️"; // Snow showers
    if (code <= 86) return "🌨️"; // Snow showers
    return "🌤️"; // Default
  };

  const getWeatherDescription = (code: number) => {
    if (code === 0) return "Clear sky";
    if (code <= 3) return "Partly cloudy";
    if (code <= 48) return "Cloudy";
    if (code <= 67) return "Rain";
    if (code <= 77) return "Snow";
    if (code <= 82) return "Snow showers";
    if (code <= 86) return "Snow showers";
    return "Unknown";
  };

  const currentTimeIndex = weatherAtLocation.hourly.time.findIndex(
    (time) => new Date(time) >= new Date(weatherAtLocation.current.time),
  );

  const displayTimes = weatherAtLocation.hourly.time.slice(
    currentTimeIndex,
    currentTimeIndex + 12,
  );
  const displayTemperatures = weatherAtLocation.hourly.temperature_2m.slice(
    currentTimeIndex,
    currentTimeIndex + 12,
  );

  return (
    <div className="bg-gradient-to-br from-blue-400 to-blue-600 text-white p-6 rounded-xl shadow-lg">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Current Weather</h2>
          <p className="text-blue-100">
            {new Date(weatherAtLocation.current.time).toLocaleDateString()}
          </p>
        </div>
        <div className="text-right">
          <div className="text-4xl mb-2">
            {getWeatherIcon(weatherAtLocation.current.weather_code)}
          </div>
          <p className="text-sm text-blue-100">
            {getWeatherDescription(weatherAtLocation.current.weather_code)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
          <div className="text-3xl font-bold mb-1">
            {n(weatherAtLocation.current.temperature_2m)}
            {weatherAtLocation.current_units.temperature_2m}
          </div>
          <p className="text-sm text-blue-100">Temperature</p>
        </div>
        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
          <div className="text-3xl font-bold mb-1">
            {weatherAtLocation.current.relative_humidity_2m}
            {weatherAtLocation.current_units.relative_humidity_2m}
          </div>
          <p className="text-sm text-blue-100">Humidity</p>
        </div>
        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
          <div className="text-3xl font-bold mb-1">
            {n(weatherAtLocation.current.wind_speed_10m)}
            {weatherAtLocation.current_units.wind_speed_10m}
          </div>
          <p className="text-sm text-blue-100">Wind Speed</p>
        </div>
        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
          <div className="text-3xl font-bold mb-1">
            {weatherAtLocation.current.surface_pressure}
            {weatherAtLocation.current_units.surface_pressure}
          </div>
          <p className="text-sm text-blue-100">Pressure</p>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">12-Hour Forecast</h3>
        <div className="flex overflow-x-auto space-x-4 pb-2">
          {displayTimes.map((time, index) => (
            <div
              key={time}
              className="flex-shrink-0 bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center min-w-[80px]"
            >
              <div className="text-sm text-blue-100 mb-1">
                {new Date(time).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              <div className="text-2xl mb-1">
                {getWeatherIcon(weatherAtLocation.hourly.weather_code[currentTimeIndex + index])}
              </div>
              <div className="text-lg font-semibold">
                {n(displayTemperatures[index])}
                {weatherAtLocation.hourly_units.temperature_2m}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">7-Day Forecast</h3>
        <div className="space-y-2">
          {weatherAtLocation.daily.time.slice(0, 7).map((day, index) => (
            <div
              key={day}
              className="flex items-center justify-between bg-white/20 backdrop-blur-sm rounded-lg p-3"
            >
              <div className="flex items-center space-x-3">
                <div className="text-2xl">
                  {getWeatherIcon(weatherAtLocation.daily.weather_code[index])}
                </div>
                <div>
                  <div className="font-semibold">
                    {new Date(day).toLocaleDateString([], {
                      weekday: "long",
                    })}
                  </div>
                  <div className="text-sm text-blue-100">
                    {getWeatherDescription(weatherAtLocation.daily.weather_code[index])}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold">
                  {n(weatherAtLocation.daily.temperature_2m_max[index])}° / {n(weatherAtLocation.daily.temperature_2m_min[index])}°
                </div>
                <div className="text-sm text-blue-100">
                  {weatherAtLocation.daily.precipitation_probability_max[index]}% chance of rain
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
