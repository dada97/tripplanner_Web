<script lang="ts">
    import { tripStore, type Trip, type Activity, currencySymbols, type ExpenseCategory, type Currency } from '../stores/tripStore.svelte';
    import PieChart from '../components/PieChart.svelte';
    import { TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-svelte';

    let { selectedTripId = $bindable() }: { selectedTripId: string | null } = $props();

    let trips = $derived(tripStore.trips);
    let trip = $derived(selectedTripId ? tripStore.getTrip(selectedTripId) : null);

    // Derived statistics
    let stats = $derived.by(() => {
        if (!trip) return null;

        let totalEstimated = 0;
        // Group by currency
        const actuals: Record<string, { total: number, breakdown: Record<ExpenseCategory, number> }> = {};

        // Helper to init currency stats
        const getCurrencyStats = (currency: string) => {
            if (!actuals[currency]) {
                actuals[currency] = {
                    total: 0,
                    breakdown: {
                        transport: 0,
                        food: 0,
                        stay: 0,
                        shopping: 0,
                        other: 0
                    }
                };
            }
            return actuals[currency];
        };

        trip.days.forEach(day => {
            day.activities.forEach(act => {
                // Estimated is assumed to be in Trip Currency
                totalEstimated += act.estimatedCost || 0;

                act.expenses.forEach(expense => {
                    const curr = expense.currency || trip?.currency || 'USD';
                    const stats = getCurrencyStats(curr);
                    stats.total += expense.amount;
                    if (stats.breakdown[expense.category] !== undefined) {
                        stats.breakdown[expense.category] += expense.amount;
                    } else {
                        stats.breakdown.other += expense.amount;
                    }
                });
            });
        });

        return {
            totalEstimated,
            actuals
        };
    });

    const categoryColors: Record<string, string> = {
        transport: '#3b82f6', // blue-500
        food: '#f59e0b',      // amber-500
        stay: '#8b5cf6',      // violet-500
        shopping: '#ec4899',  // pink-500
        other: '#6b7280'      // gray-500
    };

    const categoryLabels: Record<string, string> = {
        transport: 'Transport',
        food: 'Food',
        stay: 'Accommodation',
        shopping: 'Shopping',
        other: 'Other'
    };
</script>

<div class="finance-view">
    {#if !trip}
        <div class="trip-selection">
            <h2>Select a Trip to View Finances</h2>
            {#if trips.length === 0}
                <p class="empty-msg">No trips found. Go to "My Trip" to create one.</p>
            {:else}
                <div class="grid">
                    {#each trips as t}
                        <button class="card" onclick={() => selectedTripId = t.id}>
                            <h3>{t.destination}</h3>
                            <div class="dates">{t.startDate}</div>
                        </button>
                    {/each}
                </div>
            {/if}
        </div>
    {:else}
        <header>
            <button class="back-link" onclick={() => selectedTripId = null}>&larr; All Trips</button>
            <h2>{trip.destination} Finances</h2>
        </header>

        <div class="dashboard-grid">
            <!-- Main Stats Cards -->
            <div class="stat-card">
                <div class="label">Total Estimated ({currencySymbols[trip.currency]})</div>
                <div class="value">
                    {currencySymbols[trip.currency]}{stats?.totalEstimated.toLocaleString()}
                </div>
            </div>
            
            <div class="stat-card">
                <div class="label">Total Actual Spent</div>
                <div class="value-list">
                    {#if stats && Object.keys(stats.actuals).length > 0}
                        {#each Object.entries(stats.actuals) as [curr, data]}
                            <div class="curr-total">
                                {currencySymbols[curr as Currency] || curr} {data.total.toLocaleString()}
                            </div>
                        {/each}
                    {:else}
                        <div class="curr-total">
                            {currencySymbols[trip.currency]}0
                        </div>
                    {/if}
                </div>
            </div>
        </div>

        <!-- Category Breakdown per Currency -->
        {#if stats}
            {#each Object.entries(stats.actuals) as [curr, data]}
                {#if data.total > 0}
                    {@const pieData = Object.entries(data.breakdown).reduce((acc, [cat, val]) => {
                        // @ts-ignore
                        acc[cat] = { actual: val, estimated: 0 }; 
                        return acc;
                    }, {} as any)}
                    <div class="breakdown-section card">
                        <h3>Category Breakdown ({curr})</h3>
                        <div class="breakdown-content">
                            <div class="chart-container">
                                <PieChart data={pieData} colors={categoryColors} currencySymbol={currencySymbols[curr as Currency] || '$'} />
                            </div>
                            <div class="breakdown-list">
                                {#each Object.entries(data.breakdown) as [cat, val]}
                                    <div class="breakdown-item">
                                        <div class="cat-info">
                                            <span class="cat-label" style="color: {categoryColors[cat]}">
                                                {categoryLabels[cat]}
                                            </span>
                                            <span class="cat-values">
                                                <span class="actual">{currencySymbols[curr as Currency] || '$'}{val.toLocaleString()}</span>
                                            </span>
                                        </div>
                                        <div class="mini-track">
                                            <div 
                                                class="mini-fill" 
                                                style="
                                                    width: {data.total ? (val / data.total * 100) : 0}%;
                                                    background-color: {categoryColors[cat]};
                                                "
                                            ></div>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        </div>
                    </div>
                {/if}
            {/each}
        {/if}
    {/if}
</div>

<style>
    .finance-view {
        padding: 1.5rem;
        height: 100%;
        overflow-y: auto;
        box-sizing: border-box;
    }

    .trip-selection {
        max-width: 600px;
        margin: 0 auto;
        text-align: center;
    }
    
    .empty-msg { color: #71717a; }

    .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 1rem;
        margin-top: 2rem;
    }
    
    .card {
        background: white;
        border: 1px solid #e4e4e7;
        border-radius: 0.75rem;
        padding: 1.25rem;
        text-align: left;
        cursor: pointer;
        transition: transform 0.2s;
    }
    
    .card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    header {
        margin-bottom: 2rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .back-link {
        align-self: flex-start;
        background: none;
        border: none;
        padding: 0;
        color: #71717a;
        cursor: pointer;
        font-size: 0.9rem;
    }
    
    .back-link:hover { color: #2563eb; }
    
    h2 { margin: 0; }

    .dashboard-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-bottom: 2rem;
    }
    
    .stat-card {
        background: white;
        padding: 1.5rem;
        border-radius: 1rem;
        border: 1px solid #e4e4e7;
    }
    
    .label { font-size: 0.9rem; color: #71717a; margin-bottom: 0.5rem; }
    .value { font-size: 2rem; font-weight: bold; color: #18181b; }
    .value-list { display: flex; flex-direction: column; gap: 0.25rem; }
    .curr-total { font-size: 1.5rem; font-weight: bold; color: #18181b; }
    
    .breakdown-section { margin-bottom: 2rem; cursor: default; }
    .breakdown-section:hover { transform: none; box-shadow: none; }
    .breakdown-section h3 { margin-top: 0; margin-bottom: 1.5rem; }
    
    .breakdown-content {
        display: flex;
        gap: 2rem;
        flex-wrap: wrap;
        align-items: center;
    }

    .chart-container {
        flex-shrink: 0;
    }

    .breakdown-list {
        flex: 1;
        min-width: 250px;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    
    .breakdown-item {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }
    
    .cat-info {
        display: flex;
        justify-content: space-between;
        font-size: 0.95rem;
    }
    
    .cat-label { font-weight: 500; }
    .cat-values { color: #71717a; font-size: 0.9rem; }
    .cat-values .actual { color: #18181b; font-weight: 500; }
    
    .mini-track {
        height: 6px;
        background: #f4f4f5;
        border-radius: 3px;
        overflow: hidden;
    }
    
    .mini-fill {
        height: 100%;
        border-radius: 3px;
    }

    @media (prefers-color-scheme: dark) {
        .card, .stat-card {
            background: #18181b;
            border-color: #27272a;
        }
        .value, .curr-total { color: #f4f4f5; }
        .label, .cat-values, .empty-msg { color: #a1a1aa; }
        .cat-values .actual { color: #f4f4f5; }
        .mini-track { background: #27272a; }
    }
</style>