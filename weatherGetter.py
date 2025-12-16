import gpxpy
from datetime import datetime
import requests
import io

def interpolate_timestamps(points, start_time, end_time):
    total_points = len(points)
    return [
        start_time + (end_time - start_time) * i / (total_points - 1)
        for i in range(total_points)
    ]

def get_weather_open_meteo(lat, lon, timestamp):
    date_str = timestamp.strftime("%Y-%m-%d")
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "temperature_2m,windspeed_10m,precipitation",
        "start_date": date_str,
        "end_date": date_str,
        "timezone": "auto"
    }
    response = requests.get(url, params=params)
    if response.status_code == 200:
        data = response.json()
        hours = data["hourly"]["time"]
        temperatures = data["hourly"]["temperature_2m"]
        winds = data["hourly"]["windspeed_10m"]
        precip = data["hourly"]["precipitation"]
        closest_idx = min(range(len(hours)), key=lambda i: abs(datetime.fromisoformat(hours[i]) - timestamp))
        return {
            "temperature": temperatures[closest_idx],
            "wind_speed": winds[closest_idx],
            "precipitation": precip[closest_idx],
            "timestamp": timestamp.isoformat()
        }
    else:
        return {"error": f"API error: {response.status_code}"}

def get_ride_weather(file_obj, start_time_str, end_time_str):
    start_time = datetime.strptime(start_time_str, "%Y-%m-%d %H:%M")
    end_time = datetime.strptime(end_time_str, "%Y-%m-%d %H:%M")

    gpx_data = file_obj.read()
    gpx = gpxpy.parse(io.BytesIO(gpx_data).read().decode("utf-8"))

    points = []
    elevations = []

    for track in gpx.tracks:
        for segment in track.segments:
            for point in segment.points:
                points.append((point.latitude, point.longitude))
                elevations.append(point.elevation if point.elevation else 0)

    if not points:
        raise ValueError("No points found in GPX")

    timestamps = interpolate_timestamps(points, start_time, end_time)
    sample_every = max(1, len(points)//10)
    results = []

    for i in range(0, len(points), sample_every):
        lat, lon = points[i]
        ts = timestamps[i]
        weather = get_weather_open_meteo(lat, lon, ts)
        results.append({
            "lat": lat,
            "lon": lon,
            "timestamp": ts.isoformat(),
            "weather": weather
        })

    return {
        "ride_weather": results,
        "full_path": points,
        "elevation_profile": elevations
    }
