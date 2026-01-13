from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from weatherGetter import get_ride_weather

app = FastAPI()


# Health check (IMPORTANT for Render)
@app.get("/")
def health_check():
    return {"status": "ok"}

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # replace with ["http://localhost:5500"] for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/ride-weather/")
async def ride_weather_endpoint(
    gpx_file: UploadFile = File(...),
    start_time_str: str = Form(...),
    end_time_str: str = Form(...)
):
    try:
        result = get_ride_weather(gpx_file.file, start_time_str, end_time_str)
        return result
    except Exception as e:
        print("Backend error:", e)
        return JSONResponse({"error": str(e)}, status_code=500)

