mapboxgl.accessToken = 'pk.eyJ1Ijoia2lyb25qaWdnIiwiYSI6ImNtaDc5enB6NzBxZXQya3NpbHh3cTdxaTUifQ.PvzCNIg-j8EbgpJqHZK7sQ';

// 50-ACRE SITE BOUNDARY COORDINATES
const boundary = [
    [36.914538383841084, -1.225346020052707],
    [36.920330936744762, -1.229591247180744],
    [36.918307510730465, -1.233122323950794],
    [36.912118207627906, -1.229789622280185],
    [36.914538383841084, -1.225346020052707]
];

// Calculate center point
const lngs = boundary.map(c => c[0]);
const lats = boundary.map(c => c[1]);
const PLOT_CENTER = [
    (Math.min(...lngs) + Math.max(...lngs)) / 2,
    (Math.min(...lats) + Math.max(...lats)) / 2
];

let map = null;
let isTouring = false;
let bounds = null;

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    setupEventListeners();
});

function createSimplePlotPin() {
    const pinContainer = document.createElement('div');
    pinContainer.style.cssText = `
        width: 32px;
        height: 40px;
        position: relative;
        cursor: pointer;
    `;
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 32 40');
    svg.setAttribute('width', '32');
    svg.setAttribute('height', '40');
    svg.style.cssText = `
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6));
    `;
    
    const head = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    head.setAttribute('cx', '16');
    head.setAttribute('cy', '12');
    head.setAttribute('r', '10');
    head.setAttribute('fill', '#ef4444');
    head.setAttribute('stroke', '#ffffff');
    head.setAttribute('stroke-width', '2');
    
    const body = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    body.setAttribute('points', '16,40 8,20 24,20');
    body.setAttribute('fill', '#ef4444');
    body.setAttribute('stroke', '#ffffff');
    body.setAttribute('stroke-width', '1');
    
    svg.appendChild(head);
    svg.appendChild(body);
    pinContainer.appendChild(svg);
    
    return pinContainer;
}

function initMap() {
    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center: PLOT_CENTER,
        zoom: 15.5,
        pitch: 60,
        bearing: 0,
        antialias: true
    });

    map.on('load', () => {
        console.log('Map loaded');
        
        map.addSource('mapbox-dem', {
            type: 'raster-dem',
            url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
            tileSize: 512,
            maxzoom: 14
        });
        map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });

        map.addLayer({
            id: 'sky',
            type: 'sky',
            paint: {
                'sky-type': 'atmosphere',
                'sky-atmosphere-sun': [0.0, 90.0],
                'sky-atmosphere-sun-intensity': 15
            }
        });

        // Add site boundary
        map.addSource('site-boundary', {
            type: 'geojson',
            data: {
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [boundary]
                }
            }
        });

        map.addLayer({
            id: 'boundary-fill',
            type: 'fill',
            source: 'site-boundary',
            paint: {
                'fill-color': '#f00',
                'fill-opacity': 0.12
            }
        });

        map.addLayer({
            id: 'boundary-line',
            type: 'line',
            source: 'site-boundary',
            paint: {
                'line-color': '#FF0000',
                'line-width': 6,
                'line-dasharray': [3, 2]
            }
        });

        // Calculate bounds for the property
        bounds = new mapboxgl.LngLatBounds();
        boundary.forEach(coord => bounds.extend(coord));
        map.fitBounds(bounds, { padding: 60, pitch: 60 });

        // Add simple red pin at center
        const plotPin = createSimplePlotPin();
        new mapboxgl.Marker({ element: plotPin, anchor: 'bottom' })
            .setLngLat(PLOT_CENTER)
            .addTo(map);

        hideLoading();
    });
}

function setupEventListeners() {
    const overviewBtn = document.getElementById('overviewBtn');
    const detailBtn = document.getElementById('detailBtn');
    const tourBtn = document.getElementById('tourBtn');
    const resetBtn = document.getElementById('resetBtn');
    const propertyToggle = document.getElementById('propertyToggle');
    const controlsToggle = document.getElementById('controlsToggle');
    const propertyInfo = document.getElementById('propertyInfo');
    const controlsInfo = document.getElementById('controlsInfo');

    overviewBtn.addEventListener('click', () => switchView('overview'));
    detailBtn.addEventListener('click', () => switchView('detail'));
    tourBtn.addEventListener('click', startTour);
    resetBtn.addEventListener('click', resetView);
    
    if (propertyToggle) {
        propertyToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            propertyInfo.classList.toggle('collapsed');
            propertyToggle.textContent = propertyInfo.classList.contains('collapsed') ? 'ℹ️ View Info' : '✖️ Close Info';
        });
    }
    
    if (controlsToggle) {
        controlsToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            controlsInfo.classList.toggle('collapsed');
            controlsToggle.textContent = controlsInfo.classList.contains('collapsed') ? '🎮 Map Controls' : '✖️ Close';
        });
    }
}

function switchView(view) {
    const overviewBtn = document.getElementById('overviewBtn');
    const detailBtn = document.getElementById('detailBtn');

    if (view === 'overview') {
        overviewBtn.classList.add('active');
        detailBtn.classList.remove('active');
        if (bounds) {
            map.fitBounds(bounds, { padding: 100, pitch: 50, duration: 1500 });
        }
    } else {
        detailBtn.classList.add('active');
        overviewBtn.classList.remove('active');
        map.flyTo({
            center: PLOT_CENTER,
            zoom: 16.5,
            pitch: 65,
            bearing: 45,
            duration: 1500
        });
    }
}

function startTour() {
    if (isTouring) return;
    
    const tourBtn = document.getElementById('tourBtn');
    
    isTouring = true;
    tourBtn.disabled = true;
    tourBtn.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="6" y="4" width="4" height="16"></rect>
            <rect x="14" y="4" width="4" height="16"></rect>
        </svg>
        Touring...
    `;

    // DRONE TOUR: Fly around the 50-acre boundary
    const tourStops = [
        // Start: Northeast corner (wide view)
        { center: [36.9203, -1.2256], zoom: 15, pitch: 50, bearing: 0, duration: 3500 },
        // Fly to East side
        { center: [36.9193, -1.2296], zoom: 15.5, pitch: 55, bearing: 90, duration: 3500 },
        // Southeast corner
        { center: [36.9183, -1.2331], zoom: 15.5, pitch: 58, bearing: 135, duration: 3500 },
        // Southwest corner
        { center: [36.9131, -1.2308], zoom: 15.5, pitch: 60, bearing: 180, duration: 3500 },
        // West side
        { center: [36.9135, -1.2273], zoom: 15.5, pitch: 58, bearing: 225, duration: 3500 },
        // Northwest corner
        { center: [36.9145, -1.2253], zoom: 15.5, pitch: 55, bearing: 270, duration: 3500 },
        // Return to center (final view)
        { center: PLOT_CENTER, zoom: 16, pitch: 60, bearing: 0, duration: 3000 }
    ];

    let currentStop = 0;
    const flyToNext = () => {
        if (currentStop < tourStops.length) {
            const stop = tourStops[currentStop];
            map.flyTo({ 
                ...stop, 
                essential: true,
                // Smooth easing to prevent blurring
                easing: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
            });
            currentStop++;
            
            // Wait longer to let tiles load
            const waitTime = stop.duration + 800;
            setTimeout(flyToNext, waitTime);
        } else {
            endTour();
        }
    };
    flyToNext();
}

function endTour() {
    isTouring = false;
    const tourBtn = document.getElementById('tourBtn');
    tourBtn.disabled = false;
    tourBtn.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        Start Tour
    `;
}

function resetView() {
    if (bounds) {
        map.fitBounds(bounds, {
            padding: 60,
            pitch: 60,
            bearing: 0,
            duration: 2000
        });
    }
}

function hideLoading() {
    const loading = document.getElementById('loading');
    loading.classList.add('hidden');
}