const map = L.map('map').setView([0, 0], 2);
const server = "http://127.0.0.1:8000/ride-weather/";
const STEP_KM = 6;

/* --------------------
   Loading helpers
-------------------- */
function showLoading() {
    document.getElementById("loadingOverlay")?.classList.remove("hidden");
}
function hideLoading() {
    document.getElementById("loadingOverlay")?.classList.add("hidden");
}

/* --------------------
   Map setup
-------------------- */
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

/* --------------------
   Wind helpers
-------------------- */
function bearing(lat1, lon1, lat2, lon2) {
    const toRad = d => d * Math.PI / 180;
    const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
    const x =
        Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
        Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.cos(toRad(lon2 - lon1));
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function windType(rideDir, windFrom) {
    let diff = Math.abs(windFrom - rideDir);
    if (diff > 180) diff = 360 - diff;
    if (diff < 60) return "headwind";
    if (diff > 120) return "tailwind";
    return "crosswind";
}

/* --------------------
   Visual helpers
-------------------- */
function windArrowSize(speed) {
    return 12 + Math.min(speed, 40) / 40 * 20;
}

function tempColor(t) {
    if (t < 0) return '#7797acff';
    if (t < 5) return '#3498db';
    if (t < 10) return '#5dade2';
    if (t < 18) return '#27ae60';
    if (t < 25) return '#f39c12';
    return '#c0392b';
}

function precipColor(mm) {
    if (!mm) return 'rgba(0,0,0,0)';
    if (mm < 0.1) return 'rgba(180,220,255,0.25)';
    if (mm < 0.5) return 'rgba(120,180,255,0.35)';
    if (mm < 1.0) return 'rgba(70,140,255,0.5)';
    if (mm < 2.5) return 'rgba(30,90,200,0.65)';
    if (mm < 5.0) return 'rgba(0,50,150,0.75)';
    return 'rgba(0,20,100,0.9)';
}

/* --------------------
   SVG icons
-------------------- */
const windIcons = {
    headwind: new Image(),
    tailwind: new Image()
};
windIcons.headwind.src = 'media/headwind.svg';
windIcons.tailwind.src = 'media/tailwind.svg';

/* --------------------
   Map rendering
-------------------- */
function displayWeatherOnMap(data) {
    if (!data?.ride_weather?.length) return;

    map.eachLayer(l => {
        if (l instanceof L.Marker || l instanceof L.Polyline) {
            map.removeLayer(l);
        }
    });

    L.polyline(data.full_path, { color: 'blue' }).addTo(map);

    data.ride_weather.forEach(p => {
        L.marker([p.lat, p.lon]).addTo(map).bindPopup(`
            <b>Time:</b> ${p.timestamp}<br>
            <b>Temp:</b> ${p.weather.temperature} °C<br>
            <b>Wind:</b> ${p.weather.wind_speed_kmh} km/h<br>
            <b>Rain:</b> ${p.weather.precipitation} mm
        `);
    });

    map.fitBounds(data.full_path);
}

/* --------------------
   Custom plugin (wind + temp on top)
-------------------- */
const windTempPlugin = {
    id: 'windTemp',
    afterDatasetsDraw(chart) {
        const { ctx, scales: { x, yElevation } } = chart;
        const weather = chart.data.datasets.find(d => d.id === 'weather');
        if (!weather) return;

        ctx.save();
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        const yTop = yElevation.top + 8;

        weather.data.forEach(p => {
            const xPos = x.getPixelForValue(p.x);

            if (p.windType !== 'crosswind') {
                const img = windIcons[p.windType];
                const size = windArrowSize(p.windSpeed);
                if (img.complete) {
                    ctx.drawImage(img, xPos - size / 2, yTop, size, size);
                }
            }

            ctx.fillStyle = tempColor(p.temperature);
            ctx.fillText(`${Math.round(p.temperature)}°C`, xPos, yTop + 28);
        });

        ctx.restore();
    }
};

/* --------------------
   Form submit
-------------------- */
document.getElementById('rideForm').addEventListener('submit', async e => {
    e.preventDefault();
    showLoading();

    try {
        const gpxFile = document.getElementById('gpxFile').files[0];
        const rideDate = document.getElementById('rideDate').value;
        const startTime = document.getElementById('startTime').value;
        const endTime = document.getElementById('endTime').value;

        const formData = new FormData();
        formData.append("gpx_file", gpxFile);
        formData.append("start_time_str", `${rideDate} ${startTime}`);
        formData.append("end_time_str", `${rideDate} ${endTime}`);

        const res = await fetch(server, { method: "POST", body: formData });
        if (!res.ok) throw new Error("Server error");

        const data = await res.json();

        displayWeatherOnMap(data);
        plotChart(data);

    } catch (err) {
        console.error(err);
        alert(err.message);
    } finally {
        hideLoading();
    }
});

/* --------------------
   Chart
-------------------- */
function plotChart(data) {
    const ctx = document.getElementById('elevationChart').getContext('2d');
    if (window.chart) window.chart.destroy();

    const totalDistance = data.ride_weather.at(-1).distance_km;
    const blockCount = Math.ceil(totalDistance / STEP_KM);

    const elevation = data.elevation_profile.map((e, i) => ({
        x: i / (data.elevation_profile.length - 1) * totalDistance,
        y: e
    }));

    data.ride_weather.forEach((p, i) => {
        if (i === 0) p.windType = 'crosswind';
        else {
            const prev = data.ride_weather[i - 1];
            p.windType = windType(
                bearing(prev.lat, prev.lon, p.lat, p.lon),
                p.weather.wind_direction_deg
            );
        }
    });

    const precip = [];
    const weather = [];

    for (let i = 0; i < blockCount; i++) {
        const p = data.ride_weather[i] || data.ride_weather.at(-1);
        const start = i * STEP_KM;
        const end = start + STEP_KM;
        const center = start + STEP_KM / 2;

        precip.push({
            x: center,
            xMin: start,
            xMax: end,
            y: p.weather.precipitation
        });

        weather.push({
            x: center,
            temperature: p.weather.temperature,
            windSpeed: p.weather.wind_speed_kmh,
            windType: p.windType
        });
    }

    window.chart = new Chart(ctx, {
        plugins: [windTempPlugin],
        data: {
            datasets: [
                {
                    type: 'scatter',
                    id: 'weather',
                    data: weather,
                    parsing: false,
                    pointRadius: 0
                },
                {
                    type: 'bar',
                    label: 'Precipitation (mm)',
                    data: precip,
                    parsing: false,
                    yAxisID: 'yRain',
                    backgroundColor: c => precipColor(c.raw?.y),
                    barPercentage: 1,
                    categoryPercentage: 1
                },
                {
                    type: 'line',
                    label: 'Elevation (m)',
                    data: elevation,
                    parsing: false,
                    borderColor: 'green',
                    pointRadius: 0,
                    yAxisID: 'yElevation'
                }
            ]
        },
        options: {
            animation: false,
            scales: {
                x: {
                    type: 'linear',
                    min: 0,
                    title: { display: true, text: 'Distance (km)' }
                },
                yElevation: {
                    position: 'left',
                    title: { display: true, text: 'Elevation (m)' }
                },
                yRain: {
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    title: { display: true, text: 'Rain (mm)' }
                }
            }
        }
    });
}
