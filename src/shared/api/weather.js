import axios from "axios";

// Lat/Long for Nagercoil
const DEFAULT_LAT = 8.1833;
const DEFAULT_LNG = 77.4119;

export const getWeather = async (lat = DEFAULT_LAT, lng = DEFAULT_LNG) => {
    try {
        const response = await axios.get(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`
        );
        return response.data;
    } catch (error) {
        console.error("Error fetching weather:", error);
        return null; // Return null to fallback gracefully
    }
};

export const getWeatherCondition = (code) => {
    // WMO Weather interpretation codes (WW)
    // 0: Clear sky
    // 1, 2, 3: Mainly clear, partly cloudy, and overcast
    // 45, 48: Fog
    // 51, 53, 55: Drizzle
    // 61, 63, 65: Rain
    // 71, 73, 75: Snow fall
    // 95, 96, 99: Thunderstorm

    if (code === 0) return { label: "Clear", icon: "Sun" };
    if (code <= 3) return { label: "Cloudy", icon: "Cloud" };
    if (code === 45 || code === 48) return { label: "Fog", icon: "CloudFog" }; // CloudFog not in lucide standard set? Checking...
    if (code >= 51 && code <= 67) return { label: "Rain", icon: "CloudRain" };
    if (code >= 71 && code <= 77) return { label: "Snow", icon: "Snowflake" };
    if (code >= 80 && code <= 82) return { label: "Showers", icon: "CloudRain" };
    if (code >= 95) return { label: "Storm", icon: "CloudLightning" };

    return { label: "Unknown", icon: "Cloud" };
};
