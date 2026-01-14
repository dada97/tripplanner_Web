<script lang="ts">
    import { tripStore, type Trip, type Activity, currencySymbols, type ExpenseCategory, type Currency } from '../stores/tripStore.svelte';
    import PieChart from '../components/PieChart.svelte';
    import { TrendingUp, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-svelte';
    import { i18n } from '../stores/i18nStore.svelte';

    let { selectedTripId = $bindable() }: { selectedTripId: string | null } = $props();

    let trips = $derived(tripStore.trips);
    let trip = $derived(selectedTripId ? tripStore.getTrip(selectedTripId) : null);

    let viewMode = $state<'all' | 'daily'>('all');
    let selectedDayIndex = $state(0);
    let showDayPicker = $state(false);

    $effect(() => {
        // Reset selection when trip changes
        if (selectedTripId) {
            showDayPicker = false;
            
            // Auto-select today if applicable
            if (trip) {
                const today = new Date();
                const todayStr = today.toISOString().split('T')[0];
                const dayIndex = trip.days.findIndex(d => d.date === todayStr);
                
                if (dayIndex !== -1) {
                    viewMode = 'daily';
                    selectedDayIndex = dayIndex;
                } else {
                    selectedDayIndex = 0;
                    viewMode = 'all';
                }
            } else {
                selectedDayIndex = 0;
            }
        }
    });

    function nextDay() {
        if (trip && selectedDayIndex < trip.days.length - 1) {
            selectedDayIndex++;
        }
    }

    function prevDay() {
        if (selectedDayIndex > 0) {
            selectedDayIndex--;
        }
    }

    function selectDay(index: number) {
        selectedDayIndex = index;
        showDayPicker = false;
    }

    // Derived statistics
    let stats = $derived.by(() => {
        if (!trip) return null;

        let totalEstimated = 0;
        const expenseList: Array<any> = [];
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

        // Group expenses by date
        const expensesByDate: Record<string, typeof expenseList> = {};
        
        trip.days.forEach((day, index) => {
            // Filter by day if in daily mode
            if (viewMode === 'daily' && index !== selectedDayIndex) return;

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
                    
                    // Add to grouped list
                    if (!expensesByDate[day.date]) {
                        expensesByDate[day.date] = [];
                    }
                    expensesByDate[day.date].push({
                        ...expense,
                        activityName: act.name,
                        currency: curr as Currency
                    });
                });
            });
        });
        
        // Convert to array and sort dates descending
        const groupedExpenses = Object.entries(expensesByDate)
            .map(([date, items]) => ({
                date,
                items: items.sort((a, b) => b.amount - a.amount)
            }))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return {
            totalEstimated,
            actuals,
            groupedExpenses
        };
    });

    const categoryColors: Record<string, string> = {
        transport: '#3b82f6', // blue-500
        food: '#f59e0b',      // amber-500
        stay: '#8b5cf6',      // violet-500
        shopping: '#ec4899',  // pink-500
        other: '#6b7280'      // gray-500
    };

    let categoryLabels = $derived({
        transport: i18n.t('cat.transport'),
        food: i18n.t('cat.food'),
        stay: i18n.t('cat.stay'),
        shopping: i18n.t('cat.shopping'),
        other: i18n.t('cat.other')
    });
</script>

<div class="finance-view">
    {#if !trip}
        <div class="trip-selection">
            <h2>{i18n.t('finance.selectTrip')}</h2>
            {#if trips.length === 0}
                <p class="empty-msg">{i18n.t('finance.noTrips')}</p>
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
            <div class="header-top">
                <button class="back-link" onclick={() => selectedTripId = null}>&larr; {i18n.t('finance.back')}</button>
                <h2>{trip.destination} {i18n.t('finance.finances')}</h2>
            </div>
            
            <div class="view-controls">
                <div class="toggle-group">
                    <button 
                        class="toggle-btn {viewMode === 'all' ? 'active' : ''}"
                        onclick={() => viewMode = 'all'}
                    >
                        {i18n.t('finance.view.all')}
                    </button>
                    <button 
                        class="toggle-btn {viewMode === 'daily' ? 'active' : ''}"
                        onclick={() => viewMode = 'daily'}
                    >
                        {i18n.t('finance.view.daily')}
                    </button>
                </div>

                {#if viewMode === 'daily'}
                    <div class="day-navigator">
                        <button 
                            class="nav-btn" 
                            disabled={selectedDayIndex === 0}
                            onclick={prevDay}
                        >
                            <ChevronLeft size={20} />
                        </button>
                        
                        <div class="current-day-display">
                            <button 
                                class="day-toggle" 
                                onclick={() => showDayPicker = !showDayPicker}
                            >
                                <span class="day-label">{i18n.t('finance.day')} {selectedDayIndex + 1}</span>
                                <span class="date-label">{trip.days[selectedDayIndex].date}</span>
                            </button>

                            {#if showDayPicker}
                                <div class="day-picker-dropdown">
                                    {#each trip.days as day, i}
                                        <button 
                                            class="day-option {i === selectedDayIndex ? 'selected' : ''}"
                                            onclick={() => selectDay(i)}
                                        >
                                            <span class="day-num">{i18n.t('finance.day')} {i + 1}</span>
                                            <span class="day-date">{day.date}</span>
                                        </button>
                                    {/each}
                                </div>
                                <div class="backdrop" onclick={() => showDayPicker = false}></div>
                            {/if}
                        </div>

                        <button 
                            class="nav-btn" 
                            disabled={selectedDayIndex === trip.days.length - 1}
                            onclick={nextDay}
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                {/if}
            </div>
        </header>

        <div class="dashboard-grid">
            <!-- Main Stats Cards -->
            <div class="stat-card">
                <div class="label">{i18n.t('finance.totalEstimated')} ({currencySymbols[trip.currency]})</div>
                <div class="value">
                    {currencySymbols[trip.currency]}{stats?.totalEstimated.toLocaleString()}
                </div>
            </div>
            
            <div class="stat-card">
                <div class="label">{i18n.t('finance.totalActual')}</div>
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
                        <h3>{i18n.t('finance.breakdown')} ({curr})</h3>
                        <div class="breakdown-content">
                            <div class="chart-container">
                                <PieChart data={pieData} colors={categoryColors} currencySymbol={currencySymbols[curr as Currency] || '$'} />
                            </div>
                            <div class="breakdown-list">
                                {#each Object.entries(data.breakdown) as [cat, val]}
                                    <div class="breakdown-item">
                                        <div class="cat-info">
                                            <span class="cat-label" style="color: {categoryColors[cat]}">
                                                {categoryLabels[cat as keyof typeof categoryLabels]}
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

            <!-- Detailed Expense List -->
            {#if stats.groupedExpenses.length > 0}
                <div class="expense-details-section card">
                    <h3>{i18n.t('finance.detailed')}</h3>
                    <div class="expense-table">
                        {#each stats.groupedExpenses as group}
                            <div class="date-group">
                                <div class="date-header">{group.date}</div>
                                {#each group.items as exp}
                                    <div class="expense-row">
                                        <div class="exp-main">
                                            <span class="exp-activity">{exp.activityName}</span>
                                            <span class="exp-cat" style="background-color: {categoryColors[exp.category]}15; color: {categoryColors[exp.category]}">
                                                {categoryLabels[exp.category as keyof typeof categoryLabels]}
                                            </span>
                                        </div>
                                        <div class="exp-amount">
                                            <span class="amt">{currencySymbols[exp.currency as Currency]}{exp.amount.toLocaleString()}</span>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}
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
        flex-direction: column; /* Mobile first: stack vertically */
        gap: 2rem;
        align-items: center;
    }

    .chart-container {
        flex-shrink: 0;
        display: flex;
        justify-content: center;
        width: 100%;
    }

    .breakdown-list {
        flex: 1;
        width: 100%;
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

    .expense-details-section {
        margin-bottom: 2rem;
        cursor: default;
    }

    .expense-details-section:hover {
        transform: none;
        box-shadow: none;
    }

    .expense-table {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .date-group {
        display: flex;
        flex-direction: column;
    }

    .date-header {
        font-size: 0.9rem;
        font-weight: 600;
        color: #71717a;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid #f4f4f5;
        margin-bottom: 0.5rem;
        background: white;
        position: sticky;
        top: 0;
    }

    .expense-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 0;
        border-bottom: 1px solid #f4f4f5;
    }

    .expense-row:last-child {
        border-bottom: none;
    }

    .exp-main {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .exp-activity {
        font-weight: 600;
        color: #18181b;
        font-size: 1rem;
    }

    .exp-cat {
        font-size: 0.75rem;
        padding: 0.15rem 0.5rem;
        border-radius: 9999px;
        width: fit-content;
        font-weight: 500;
        text-transform: capitalize;
    }

    .exp-amount {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.15rem;
    }

    .exp-amount .amt {
        font-weight: 700;
        color: #18181b;
        font-size: 1.1rem;
    }

    @media (min-width: 768px) {
        .breakdown-content {
            flex-direction: row; /* Desktop: side by side */
            align-items: flex-start; /* Align top */
        }

        .chart-container {
            width: auto;
        }
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
        
        .toggle-group { background: #27272a; border-color: #3f3f46; }
        .toggle-btn { color: #a1a1aa; }
        .toggle-btn.active { background: #3f3f46; color: #f4f4f5; }
        
        .nav-btn { background: #18181b; border-color: #27272a; color: #e4e4e7; }
        .nav-btn:disabled { background: #27272a; color: #52525b; border-color: #27272a; }
        .nav-btn:not(:disabled):hover { background: #27272a; }
        
        .day-toggle { background: #18181b; border-color: #27272a; color: #f4f4f5; }
        .day-toggle:hover { border-color: #3b82f6; background: #27272a; }
        .date-label { color: #a1a1aa; }
        
        .day-picker-dropdown { 
            background: #18181b; 
            border-color: #27272a; 
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
        }
        .day-option { color: #e4e4e7; }
        .day-option:hover { background: #27272a; }
        .day-option.selected { background: #1e3a8a; color: #60a5fa; }
        .day-option .day-date { color: #a1a1aa; }

        .expense-row { border-color: #27272a; }
        .exp-activity, .exp-amount .amt { color: #f4f4f5; }
        .date-header { 
            color: #a1a1aa; 
            border-bottom-color: #27272a; 
            background: #18181b; 
        }
    }

    .view-controls {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.25rem;
        margin-top: 1.5rem;
        width: 100%;
    }

    .toggle-group {
        display: flex;
        background: #f4f4f5;
        padding: 0.25rem;
        border-radius: 0.75rem;
        width: fit-content;
        border: 1px solid #e4e4e7;
    }

    .toggle-btn {
        padding: 0.5rem 1.25rem;
        border: none;
        background: transparent;
        border-radius: 0.5rem;
        font-size: 0.9rem;
        font-weight: 500;
        color: #71717a;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .toggle-btn.active {
        background: white;
        color: #18181b;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1);
    }

    .day-navigator {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        width: 100%;
        max-width: 400px;
    }

    .nav-btn {
        background: white;
        border: 1px solid #e4e4e7;
        padding: 0.6rem 0.8rem;
        cursor: pointer;
        color: #18181b;
        border-radius: 0.75rem;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
    }

    .nav-btn:disabled {
        background: #f4f4f5;
        color: #d4d4d8;
        border-color: #f4f4f5;
        cursor: not-allowed;
    }

    .nav-btn:not(:disabled):hover {
        background: #f4f4f5;
        border-color: #d4d4d8;
    }

    .current-day-display {
        position: relative;
        flex: 1;
        max-width: 200px;
    }

    .day-toggle {
        background: white;
        border: 1px solid #e4e4e7;
        padding: 0.5rem 1rem;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        border-radius: 0.75rem;
        width: 100%;
        transition: all 0.2s;
        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }

    .day-toggle:hover {
        border-color: #2563eb;
        background: #f8fafc;
    }

    .day-label {
        font-weight: 700;
        font-size: 0.95rem;
        color: #18181b;
    }

    .date-label {
        font-size: 0.75rem;
        color: #64748b;
        margin-top: 1px;
    }

    .day-picker-dropdown {
        position: absolute;
        top: calc(100% + 0.75rem);
        left: 50%;
        transform: translateX(-50%);
        background: white;
        border: 1px solid #e4e4e7;
        border-radius: 1rem;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        max-height: 240px;
        overflow-y: auto;
        z-index: 20;
        min-width: 220px;
        display: flex;
        flex-direction: column;
        padding: 0.5rem;
        animation: slideDown 0.2s ease-out;
    }

    @keyframes slideDown {
        from { opacity: 0; transform: translate(-50%, -10px); }
        to { opacity: 1; transform: translate(-50%, 0); }
    }

    .day-option {
        background: none;
        border: none;
        padding: 0.75rem 1rem;
        text-align: left;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-radius: 0.5rem;
        color: #18181b;
        transition: all 0.15s;
    }

    .day-option:hover {
        background: #f1f5f9;
    }

    .day-option.selected {
        background: #eff6ff;
        color: #2563eb;
        font-weight: 600;
    }

    .day-option .day-num { font-size: 0.9rem; }
    .day-option .day-date { font-size: 0.75rem; color: #64748b; }

    .backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10;
        background: rgba(0,0,0,0.02);
    }

    @media (min-width: 640px) {
        header {
            margin-bottom: 2.5rem;
        }

        .view-controls {
            margin-top: 2rem;
        }
    }
</style>