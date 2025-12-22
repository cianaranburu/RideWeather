const map = L.map('map').setView([0, 0], 2);
const server = "https://rideweather-ikbh.onrender.com/ride-weather/"

// OpenStreetMap tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

document.getElementById('rideForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const gpxFile = document.getElementById('gpxFile').files[0];
    const rideDate = document.getElementById('rideDate').value;
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;

    if (!gpxFile || !rideDate || !startTime || !endTime) {
        alert("Please provide all fields!");
        return;
    }

    const startDateTime = `${rideDate} ${startTime}`;
    const endDateTime = `${rideDate} ${endTime}`;

    const formData = new FormData();
    formData.append("gpx_file", gpxFile);
    formData.append("start_time_str", startDateTime);
    formData.append("end_time_str", endDateTime);

    try {
        const response = await fetch(server, {
            method: "POST",
            body: formData
        });
        const data = await response.json();
        displayWeatherOnMap(data);
        plotElevationWithPrecipAndWind(data);
    } catch (err) {
        console.error(err);
        alert("Error fetching weather data");
    }
});

function displayWeatherOnMap(data) {
    if (!data || !data.ride_weather || data.ride_weather.length === 0) {
        alert("No weather data returned");
        return;
    }

    map.eachLayer(layer => {
        if (layer instanceof L.Marker || layer instanceof L.Polyline) {
            map.removeLayer(layer);
        }
    });

    L.polyline(data.full_path, { color: 'blue' }).addTo(map);

    data.ride_weather.forEach(point => {
        const { lat, lon, weather } = point;
        const popupText = `
            <b>Time:</b> ${weather.timestamp}<br>
            <b>Temp:</b> ${weather.temperature} °C<br>
            <b>Wind:</b> ${weather.wind_speed} m/s<br>
            <b>Precipitation:</b> ${weather.precipitation} mm
        `;
        L.marker([lat, lon]).addTo(map).bindPopup(popupText);
    });

    map.fitBounds(data.full_path);
}

function plotElevationWithPrecipAndWind(data) {
    if (!data || !data.elevation_profile || !data.ride_weather) return;

    const ctx = document.getElementById('elevationChart').getContext('2d');

    if (window.elevationChart && typeof window.elevationChart.destroy === 'function') {
        window.elevationChart.destroy();
    }

    const labels = data.full_path.map((_, i) => i + 1);

    const precipData = data.ride_weather.map(p => p.weather.precipitation || 0);

    window.elevationChart = new Chart(ctx, {
        data: {
            labels: labels,
            datasets: [
                {
                    type: 'bar',
                    label: 'Precipitation (mm)',
                    data: precipData,
                    backgroundColor: 'rgba(0,0,255,0.3)',
                    yAxisID: 'yPrecip'
                },
                {
                    type: 'line',
                    label: 'Elevation (m)',
                    data: data.elevation_profile,
                    borderColor: 'green',
                    backgroundColor: 'rgba(0,0,0,0)',
                    fill: false,
                    yAxisID: 'yElevation',
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                yElevation: {
                    type: 'linear',
                    position: 'left',
                    title: { display: true, text: 'Elevation (m)' }
                },
                yPrecip: {
                    type: 'linear',
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    title: { display: true, text: 'Precipitation (mm)' }
                },
                x: { display: false }
            },
            plugins: { legend: { display: true } },
            animation: false
        },
        plugins: [{
            id: 'windArrows',
            afterDatasetsDraw(chart) {
                const ctx = chart.ctx;
                const lineMeta = chart.getDatasetMeta(1); // elevation line

                data.ride_weather.forEach((point, i) => {
                    const chartIndex = Math.round(i * (lineMeta.data.length - 1) / (data.ride_weather.length - 1));
                    const x = lineMeta.data[chartIndex].x;
                    const y = lineMeta.data[chartIndex].y;

                    const windDir = Math.random() > 0.5 ? 1 : -1; // replace with actual calculation later
                    const arrowLength = 20;
                    ctx.save();
                    ctx.strokeStyle = 'red';
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(x + arrowLength * windDir, y);
                    ctx.lineTo(x + arrowLength * windDir - 5, y - 5);
                    ctx.moveTo(x + arrowLength * windDir, y);
                    ctx.lineTo(x + arrowLength * windDir - 5, y + 5);
                    ctx.stroke();
                    ctx.restore();
                });
            }
        }]
    });
}

