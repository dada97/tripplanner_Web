<script lang="ts">
    import type { ExpenseCategory } from "../stores/tripStore.svelte";

    type CategoryData = {
        [key in ExpenseCategory]: {
            estimated: number;
            actual: number;
        }
    };

    let { 
        data, 
        colors,
        currencySymbol = '$' 
    }: { 
        data: CategoryData, 
        colors: Record<string, string>,
        currencySymbol?: string
    } = $props();

    const radius = 80;
    const circumference = 2 * Math.PI * radius;

    let segments = $derived.by(() => {
        const total = Object.values(data).reduce((sum, item) => sum + item.actual, 0);
        if (total === 0) return [];

        let cumulative = 0;
        return Object.entries(data).map(([category, { actual }]) => {
            if (actual === 0) return null;
            
            const percentage = actual / total;
            const dasharray = `${percentage * circumference} ${circumference}`;
            const offset = -(cumulative * circumference);

            cumulative += percentage;

            return {
                category,
                dasharray,
                offset,
                color: colors[category]
            };
        }).filter((s): s is NonNullable<typeof s> => s !== null);
    });
</script>

<div class="pie-chart-container">
    <svg viewBox="-100 -100 200 200">
        {#each segments as segment}
            <circle 
                r={radius} 
                cx="0" 
                cy="0" 
                fill="transparent"
                stroke={segment.color}
                stroke-width="40"
                stroke-dasharray={segment.dasharray}
                stroke-dashoffset={segment.offset}
                transform="rotate(-90)"
            />
        {/each}
    </svg>
    <div class="center-label">
        <span>Total</span>
        <strong>{currencySymbol}{Object.values(data).reduce((sum, i) => sum + i.actual, 0).toLocaleString()}</strong>
    </div>
</div>

<style>
    .pie-chart-container {
        position: relative;
        width: 200px;
        height: 200px;
        margin: 1rem auto;
    }

    svg {
        width: 100%;
        height: 100%;
    }

    .center-label {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        display: flex;
        flex-direction: column;
    }

    .center-label span {
        font-size: 0.9rem;
        color: #71717a;
    }

    .center-label strong {
        font-size: 1.5rem;
        font-weight: bold;
    }

    @media (prefers-color-scheme: dark) {
        .center-label span { color: #a1a1aa; }
        .center-label strong { color: #f4f4f5; }
    }
</style>
