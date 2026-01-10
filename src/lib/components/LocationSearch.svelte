<script lang="ts">
    import { Search, Loader2 } from 'lucide-svelte';

    let query = $state('');
    let results = $state<any[]>([]);
    let loading = $state(false);
    let timer: any;
    
    let { onselect } = $props<{ onselect: (result: { name: string; lat: number; lng: number; full_name: string }) => void }>();

    function handleInput() {
        clearTimeout(timer);
        if (query.length < 3) {
            results = [];
            return;
        }
        
        timer = setTimeout(async () => {
            loading = true;
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&accept-language=zh-TW,en`);
                if (res.ok) {
                    results = await res.json();
                }
            } catch (e) {
                console.error(e);
            } finally {
                loading = false;
            }
        }, 500);
    }
    
    function select(item: any) {
        onselect({
            name: item.display_name.split(',')[0],
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            full_name: item.display_name
        });
        results = [];
        query = '';
    }
</script>

<div class="search-container">
    <div class="input-wrapper">
        <Search size={18} class="search-icon" />
        <input 
            type="text" 
            bind:value={query} 
            oninput={handleInput} 
            placeholder="Search places..."
        />
        {#if loading}
            <Loader2 size={18} class="loader" />
        {/if}
    </div>
    
    {#if results.length > 0}
        <ul class="results">
            {#each results as item}
                <li>
                    <button onclick={() => select(item)}>
                        {item.display_name}
                    </button>
                </li>
            {/each}
        </ul>
    {/if}
</div>

<style>
    .search-container {
        position: relative;
        width: 100%;
        max-width: 400px;
    }
    
    .input-wrapper {
        display: flex;
        align-items: center;
        background: white;
        border: 1px solid #e4e4e7;
        border-radius: 0.5rem;
        padding: 0.5rem 0.75rem;
        gap: 0.5rem;
    }
    
    .input-wrapper:focus-within {
        border-color: #2563eb;
        box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
    }
    
    input {
        border: none;
        outline: none;
        width: 100%;
        font-size: 0.95rem;
        background: transparent;
        color: inherit;
    }
    
    :global(.search-icon) {
        color: #71717a;
    }
    
    :global(.loader) {
        animation: spin 1s linear infinite;
        color: #2563eb;
    }
    
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    
    .results {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: white;
        border: 1px solid #e4e4e7;
        border-radius: 0.5rem;
        margin-top: 0.25rem;
        list-style: none;
        padding: 0;
        max-height: 300px;
        overflow-y: auto;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        z-index: 1000;
    }
    
    .results li button {
        width: 100%;
        text-align: left;
        padding: 0.75rem;
        background: transparent;
        border: none;
        cursor: pointer;
        font-size: 0.9rem;
        color: #18181b;
        border-bottom: 1px solid #f4f4f5;
    }
    
    .results li:last-child button {
        border-bottom: none;
    }
    
    .results li button:hover {
        background: #f4f4f5;
    }

    /* Dark mode */
    @media (prefers-color-scheme: dark) {
        .input-wrapper {
            background: #27272a;
            border-color: #3f3f46;
        }
        input {
            color: white;
        }
        .results {
            background: #27272a;
            border-color: #3f3f46;
        }
        .results li button {
            color: #f4f4f5;
            border-bottom-color: #3f3f46;
        }
        .results li button:hover {
            background: #3f3f46;
        }
    }
</style>
