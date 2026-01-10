<script lang="ts">
    import { onMount } from 'svelte';
    import L from 'leaflet';
    import type { Activity } from '../stores/tripStore.svelte';

    let { activities = [], center = [51.505, -0.09], zoom = 13 }: { 
        activities?: Activity[]; 
        center?: [number, number]; 
        zoom?: number;
    } = $props();

    let mapElement: HTMLDivElement;
    let map: L.Map | undefined = $state();
    let markers: L.Marker[] = [];
    let routeLine: L.Polyline | undefined;

    onMount(() => {
        if (!mapElement) return;

        // Fix Leaflet's default icon path issues
        // @ts-ignore
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });

        map = L.map(mapElement).setView(center, zoom);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        return () => {
            map?.remove();
        };
    });

    // Watch center/zoom
    $effect(() => {
        if (map) {
            map.flyTo(center, zoom);
        }
    });

    // Watch activities
    $effect(() => {
        if (!map) return;
        
        // Clear existing markers and line
        markers.forEach(m => m.remove());
        markers = [];
        if (routeLine) {
            routeLine.remove();
            routeLine = undefined;
        }

        const latlngs: [number, number][] = [];

        activities.forEach((activity, index) => {
             const marker = L.marker([activity.lat, activity.lng])
                .addTo(map!)
                .bindPopup(`<b>${index + 1}. ${activity.name}</b><br>${activity.notes || ''}`);
             markers.push(marker);
             latlngs.push([activity.lat, activity.lng]);
        });

        if (latlngs.length > 1) {
            routeLine = L.polyline(latlngs, { 
                color: '#3b82f6', // Blue-500
                weight: 4,
                opacity: 0.7,
                dashArray: '10, 10', 
                lineCap: 'round'
            }).addTo(map!);
        }
    });
</script>

<div bind:this={mapElement} class="map-container"></div>

<style>
    .map-container {
        height: 100%;
        width: 100%;
        min-height: 300px;
        z-index: 0;
    }
</style>
