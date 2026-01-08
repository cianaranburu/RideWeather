// Wind calculations
export function bearing(lat1, lon1, lat2, lon2) {
    const toRad = d => d * Math.PI / 180;
    const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
    const x =
        Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
        Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.cos(toRad(lon2 - lon1));
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

export function windType(rideDir, windFrom) {
    let diff = Math.abs(windFrom - rideDir);
    if (diff > 180) diff = 360 - diff;
    if (diff < 60) return "headwind";
    if (diff > 120) return "tailwind";
    return "crosswind";
}

// Visual helpers
export function windArrowSize(speed) {
    return 12 + Math.min(speed, 40) / 40 * 20;
}

export function tempColor(t) {
    t = Math.round(t);
    if (t < 0) return '#7797ac';
    if (t < 5) return '#3498db';
    if (t < 10) return '#5dade2';
    if (t < 18) return '#27ae60';
    if (t < 25) return '#f39c12';
    return '#c0392b';
}

export function precipColor(mm) {
    if (!mm) return 'rgba(0,0,0,0)';
    if (mm < 0.1) return 'rgba(180,220,255,0.3)';
    if (mm < 0.5) return 'rgba(120,180,255,0.45)';
    if (mm < 1.0) return 'rgba(70,140,255,0.6)';
    if (mm < 2.5) return 'rgba(30,90,200,0.75)';
    return 'rgba(0,20,100,0.9)';
}
