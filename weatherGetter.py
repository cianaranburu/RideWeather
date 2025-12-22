import gpxpy
from datetime import datetime
import requests
import io
import math


# -----------------------------
# Helpers
# -----------------------------

def haversine(lat1, lon1, lat2, lon2):
    """Distance between two lat/lon points in km"""
    R = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    )
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def interpolate_timestamps(points, start_time, end_time):
    total_points = len(points)
    return [
        start_time + (end_time - start_time) * i / (total_points - 1)
        for i in range(total_points)
    ]


def select_points_by_distance(points, distances, step_km):
    """Return indices of points every step_km"""
    selected = [0]
    last_km = 0.0

    for i, d in enumerate(distances):
        if d - last_km >= step_km:
            selected.append(i)
            last_km = d

    if selected[-1] != len(points) - 1:
        selected.append(len(points) - 1)

    return selected


# -----------------------------
# Weather API
# -----------------------------

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

    response = requests.get(url, params=params, timeout=10)

    if response.status_code != 200:
        return {"error": f"API error: {response.status_code}"}

    data = response.json()
    hours = data["hourly"]["time"]
    temperatures = data["hourly"]["temperature_2m"]
    winds = data["hourly"]["windspeed_10m"]
    precip = data["hourly"]["precipitation"]

    closest_idx = min(
        range(len(hours)),
        key=lambda i: abs(datetime.fromisoformat(hours[i]) - timestamp)
    )

    return {
        "temperature": temperatures[closest_idx],
        "wind_speed": winds[closest_idx],
        "precipitation": precip[closest_idx],
        "timestamp": timestamp.isoformat()
    }


# -----------------------------
# Main logic
# -----------------------------

def get_ride_weather(file_obj, start_time_str, end_time_str):
    start_time = datetime.strptime(start_time_str, "%Y-%m-%d %H:%M")
    end_time = datetime.strptime(end_time_str, "%Y-%m-%d %H:%M")

    gpx_data = file_obj.read()
    gpx = gpxpy.parse(io.BytesIO(gpx_data).read().decode("utf-8"))

    points = []
    elevations = []
    distances = [0.0]  # cumulative distance in km

    prev_lat = None
    prev_lon = None

    for track in gpx.tracks:
        for segment in track.segments:
            for point in segment.points:
                lat, lon = point.latitude, point.longitude
                points.append((lat, lon))
                elevations.append(point.elevation if point.elevation else 0)

                if prev_lat is not None:
                    d = haversine(prev_lat, prev_lon, lat, lon)
                    distances.append(distances[-1] + d)

                prev_lat, prev_lon = lat, lon

    if not points:
        raise ValueError("No points found in GPX")

    # Interpolate timestamps along full path
    timestamps = interpolate_timestamps(points, start_time, end_time)

    # -----------------------------
    # Distance-based sampling
    # -----------------------------
    STEP_KM = 6.0  # 🔧 change this to whatever you want

    selected_indices = select_points_by_distance(points, distances, STEP_KM)

    results = []

    for i in selected_indices:
        lat, lon = points[i]
        ts = timestamps[i]
        weather = get_weather_open_meteo(lat, lon, ts)

        results.append({
            "lat": lat,
            "lon": lon,
            "distance_km": round(distances[i], 2),
            "timestamp": ts.isoformat(),
            "weather": weather
        })

    return {
        "ride_weather": results,
        "full_path": points,
        "elevation_profile": elevations
    }
