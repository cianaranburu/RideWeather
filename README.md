Ride Weather Planner
Description

This web application allows you to upload a GPX file and get weather forecasts (temperature, wind, precipitation) along the ride.
It displays the route on a map, plots an elevation profile, shows precipitation as bars, and indicates wind direction with arrows.

Requirements

Python 3.10+ (tested with 3.14)

pip

Node.js/npm (optional, only if you want to serve the frontend via HTTP)

Internet connection (for Open-Meteo API and Leaflet tiles)

Project Structure

/prueba
main.py -> FastAPI backend
weatherGetter.py -> GPX parsing and weather fetching
index.html -> Frontend HTML
script.js -> Frontend JavaScript
style.css -> Optional CSS for styling
venv/ -> Python virtual environment

Setup Instructions (Windows)

Open PowerShell as Administrator.

Navigate to the project folder:
cd "C:\Users<your_username>\Desktop\prueba"

Create a virtual environment (if not already done):
python -m venv venv

Allow script execution in PowerShell (one-time, if blocked):
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

Activate the virtual environment:
.\venv\Scripts\Activate.ps1
Your prompt should now show (venv).

Install required Python packages:
pip install fastapi uvicorn gpxpy requests

Run the FastAPI server:
uvicorn main:app --reload
The server will run at: http://127.0.0.1:8000

Open the frontend:

Open index.html directly in a browser (Chrome/Edge/Firefox).

Or use a simple HTTP server (optional but recommended):
npx http-server .
Then open http://localhost:8080
 (or the port shown).

Usage

Select your ride date.

Enter start time and end time.

Upload a GPX file.

Click Get Weather.

Map shows the ride path and markers with weather info.

Elevation profile below the map shows:

Elevation (green line)

Precipitation (blue bars)

Wind arrows (red) on elevation points

Troubleshooting

CORS errors: Make sure you are running the backend on http://127.0.0.1:8000
 and opening the frontend via HTTP (not file://) if using fetch.

PowerShell script blocked: Run Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass before activating the venv.

Module not found: Ensure your virtual environment is activated, then pip install fastapi uvicorn gpxpy requests.

Notes

For testing precipitation, upload a GPX file and pick a date/time where rain is forecasted.

Wind direction is currently randomized; future versions can compute actual tailwind/headwind.

Elevation profile scales dynamically to your ride.
