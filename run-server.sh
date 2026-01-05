#!/bin/bash

echo "Activating virtual environment..."
source ~/Documents/github/rideWeather/venv/bin/activate

echo "Starting FastAPI server..."
cd ~/Documents/github/rideWeather/RideWeather
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
