import React, { useState, useEffect } from 'react';
import { CloudRain, Sun, Cloud, Wind, Droplets } from 'lucide-react';

export default function WeatherCard() {
    const [timeStr, setTimeStr] = useState('');
    const [dateStr, setDateStr] = useState('');

    useEffect(() => {
        const update = () => {
            const now = new Date();
            setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
            const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
            const dayName = days[now.getDay()];
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const dd = String(now.getDate()).padStart(2, '0');
            setDateStr(`${dayName} ${mm}-${dd}`);
        };
        update();
        const timer = setInterval(update, 10000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="opsai-weather-card">
            {/* Top Bar */}
            <div className="weather-top-row">
                <div className="weather-condition">
                    <CloudRain size={16} />
                    <span>Rainy</span>
                </div>
                <div className="weather-clock-block">
                    <span className="weather-clock-time">{timeStr || '12:00'}</span>
                    <span className="weather-clock-date">{dateStr || 'MON 08-17'}</span>
                </div>
            </div>

            {/* Middle Big Temperature & Details */}
            <div className="weather-main-row">
                <div className="weather-temp-wrap">
                    <span className="weather-temp-val">24°</span>
                    <span className="weather-stats">95% | 14km/h</span>
                </div>
                <div className="weather-location-wrap">
                    <span className="weather-location-name">Hyderabad</span>
                </div>
            </div>

            {/* Bottom 4-Day Mini Forecast */}
            <div className="weather-forecast-row">
                <div className="forecast-mini-col">
                    <span className="forecast-day">TUE</span>
                    <Cloud size={13} className="forecast-icon" />
                </div>
                <div className="forecast-mini-col">
                    <span className="forecast-day">WED</span>
                    <CloudRain size={13} className="forecast-icon" />
                </div>
                <div className="forecast-mini-col">
                    <span className="forecast-day">THU</span>
                    <Sun size={13} className="forecast-icon" />
                </div>
                <div className="forecast-mini-col">
                    <span className="forecast-day">FRI</span>
                    <CloudRain size={13} className="forecast-icon" />
                </div>
            </div>
        </div>
    );
}
