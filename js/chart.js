import { windArrowSize, tempColor, precipColor, windType, bearing } from './helpers.js';
import { windIcons } from './map.js';

const windTempPlugin = {
    id: 'windTemp',
    afterDatasetsDraw(chart) {
        const x = chart.scales.x;
        const yElevation = chart.scales.yElevation;
        if (!x || !yElevation) return;
        const weather = chart.data.weatherOverlay;
        if (!Array.isArray(weather)) return;

        const ctx = chart.ctx;
        ctx.save();
        ctx.font = '18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const yTop = yElevation.top + 6;

        weather.forEach(p => {
            const xPos = x.getPixelForValue(p.x);
            if (p.windType !== 'crosswind') {
                const img = windIcons[p.windType];
                const size = windArrowSize(p.windSpeed);
                if (img.complete) ctx.drawImage(img, xPos - size/2, yTop, size, size);
            }
            ctx.fillStyle = tempColor(Math.round(p.temperature));
            ctx.fillText(`${Math.round(p.temperature)}°C`, xPos, yTop + 26);
        });

        ctx.restore();
    }
};

export function plotChart(data, canvasId, stepKm = 6) {
    if (!data?.ride_weather?.length || !data?.elevation_profile?.length) return;
    const ctx = document.getElementById(canvasId).getContext('2d');
    if (window.chart) window.chart.destroy();

    const totalDistance = Math.ceil(data.ride_weather[data.ride_weather.length-1].distance_km);
    const blockCount = Math.ceil(totalDistance / stepKm);

    const elevation = data.elevation_profile.map((e,i) => ({
        x: i / (data.elevation_profile.length-1) * totalDistance, y: e
    }));

    const elevMin = Math.min(...data.elevation_profile);
    const elevMax = Math.max(...data.elevation_profile)+100;

    data.ride_weather.forEach((p,i)=>{
        if(i===0) p.windType='crosswind';
        else {
            const prev = data.ride_weather[i-1];
            p.windType = windType(bearing(prev.lat,prev.lon,p.lat,p.lon), p.weather.wind_direction_deg);
        }
    });

    const precip = [], weather=[];
    for(let i=0;i<blockCount;i++){
        const start=i*stepKm, end=Math.min(start+stepKm,totalDistance), center=start+(end-start)/2;
        const p = data.ride_weather.find(r=>r.distance_km>=center) || data.ride_weather[data.ride_weather.length-1];
        if(!p?.weather) continue;
        precip.push({x:center,xMin:start,xMax:end,y:p.weather.precipitation});
        weather.push({x:center,temperature:p.weather.temperature,windSpeed:p.weather.wind_speed_kmh,windType:p.windType});
    }

    window.chart = new Chart(ctx,{
        plugins:[windTempPlugin],
        data:{
            datasets:[
                {type:'line',label:'Elevation (m)',data:elevation,yAxisID:'yElevation',borderColor:'green',pointRadius:0,tension:0.15},
                {type:'bar',label:'Precipitation (mm)',data:precip,yAxisID:'yRain',backgroundColor:c=>precipColor(c.raw?.y),barPercentage:1,categoryPercentage:1,barThickness:'flex'}
            ],
            weatherOverlay: weather
        },
        options:{
            animation:false,
            plugins:{legend:{labels:{filter:item=>item.datasetId!=='weather'}}},
            scales:{
                x:{type:'linear',min:0,max:totalDistance,bounds:'data',offset:false,title:{display:true,text:'Distance (km)'}},
                yElevation:{position:'left',min:elevMin,max:elevMax,title:{display:true,text:'Elevation (m)'}},
                yRain:{position:'right',min:0,max:10,grid:{drawOnChartArea:false},title:{display:true,text:'Rain (mm)'}}
            }
        }
    });
}
