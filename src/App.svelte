<script lang="ts">
    import AppShell from './lib/components/AppShell.svelte';
    import ItineraryView from './lib/views/ItineraryView.svelte';
    import FinanceView from './lib/views/FinanceView.svelte';
    import JournalView from './lib/views/JournalView.svelte';
    import MapField from './lib/components/MapField.svelte';
    import { tripStore } from './lib/stores/tripStore.svelte';

    let currentView = $state('itinerary');
    let selectedTripId = $state<string | null>(null);

    // Derived activities for the global map view
    let allActivities = $derived.by(() => {
        // If a specific trip is selected, show its activities
        // If not, show all activities from all trips? Or just maybe none/all?
        // Let's show all activities if no trip selected, or selected trip activities.
        if (selectedTripId) {
            const trip = tripStore.getTrip(selectedTripId);
            return trip ? trip.days.flatMap(d => d.activities) : [];
        } else {
            return tripStore.trips.flatMap(t => t.days.flatMap(d => d.activities));
        }
    });
</script>

<AppShell bind:view={currentView}>
    {#if currentView === 'itinerary'}
        <ItineraryView bind:selectedTripId />
    {:else if currentView === 'finance'}
        <FinanceView bind:selectedTripId />
    {:else if currentView === 'journal'}
        <JournalView bind:selectedTripId />
    {:else if currentView === 'map'}
        <div class="full-map-view">
             <!-- If in full map mode, we can add a selector or just show everything -->
             <div class="map-wrapper">
                 <MapField activities={allActivities} zoom={2} />
             </div>
        </div>
    {/if}
</AppShell>

<style>
    .full-map-view {
        height: 100%;
        width: 100%;
        display: flex;
        flex-direction: column;
    }
    .map-wrapper {
        flex: 1;
        width: 100%;
        height: 100%;
    }
</style>