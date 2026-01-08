import { windType, bearing } from './helpers.js';

export const map = L.map('map').setView([0, 0], 2);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const windIcons = {
    headwind: new Image(),
    tailwind: new Image()
};
windIcons.headwind.src = 'media/headwind.svg';
windIcons.tailwind.src = 'media/tailwind.svg';

export function displayWeatherOnMap(data) {
    if (!Array.isArray(data?.full_path) || data.full_path.length === 0) return;

    map.eachLayer(l => {
        if (l instanceof L.Marker || l instanceof L.Polyline) map.removeLayer(l);
    });

    L.polyline(data.full_path, { color: 'blue' }).addTo(map);

    data.ride_weather?.forEach(p => {
        L.marker([p.lat, p.lon]).addTo(map).bindPopup(`
            <b>Time:</b> ${p.timestamp}<br>
            <b>Temp:</b> ${p.weather.temperature} °C<br>
            <b>Wind:</b> ${p.weather.wind_speed_kmh} km/h<br>
            <b>Rain:</b> ${p.weather.precipitation} mm
        `);
    });

    map.fitBounds(data.full_path);
}

export { windIcons };
