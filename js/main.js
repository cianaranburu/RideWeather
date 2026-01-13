import { displayWeatherOnMap } from './map.js';
import { plotChart } from './chart.js';

const server = "https://rideweather-sua8.onrender.com/";

document.getElementById('rideForm').addEventListener('submit', async e=>{
    e.preventDefault();
    document.getElementById("loadingOverlay")?.classList.remove("hidden");

    try{
        const gpxFile=document.getElementById('gpxFile')?.files[0];
        const rideDate=document.getElementById('rideDate')?.value;
        const startTime=document.getElementById('startTime')?.value;
        const endTime=document.getElementById('endTime')?.value;
        if(!gpxFile || !rideDate || !startTime || !endTime) throw new Error("Missing form fields");

        const formData = new FormData();
        formData.append("gpx_file", gpxFile);
        formData.append("start_time_str", `${rideDate} ${startTime}`);
        formData.append("end_time_str", `${rideDate} ${endTime}`);

        const res = await fetch(server,{method:'POST',body:formData});
        if(!res.ok) throw new Error("Server error");

        const data = await res.json();
        console.log("Weather data received:",data);

        displayWeatherOnMap(data);
        plotChart(data,'elevationChart');

    } catch(err){console.error(err);alert(err.message);}
    finally{document.getElementById("loadingOverlay")?.classList.add("hidden");}
});
