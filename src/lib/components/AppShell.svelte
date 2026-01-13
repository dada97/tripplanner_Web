<script lang="ts">
    import { Calendar, DollarSign } from 'lucide-svelte';
    import type { Snippet } from 'svelte';
    import { tripStore } from '../stores/tripStore.svelte';

    let { children, view = $bindable('itinerary') }: { children: Snippet, view: string } = $props();
    
    const tabs = [
        { id: 'itinerary', label: 'My Trip', icon: Calendar },
        { id: 'finance', label: 'Expenses', icon: DollarSign }
    ];

    // This is a simplification. In a real app, you'd get the current trip differently.
    let currentTrip = $derived(tripStore.trips[0]);
</script>

<div class="app-shell">
    <!-- Desktop Sidebar -->
    <aside class="sidebar">
        <div>
            <div class="logo">Travel Assistant</div>
            <nav>
                {#each tabs as tab}
                    <button 
                        class:active={view === tab.id} 
                        onclick={() => view = tab.id}
                    >
                        <tab.icon size={20} />
                        <span>{tab.label}</span>
                    </button>
                {/each}
            </nav>
        </div>
    </aside>

    <div class="main-content">
        <!-- Mobile Header -->
        <header class="mobile-header">
            <h1>{tabs.find(t => t.id === view)?.label}</h1>
        </header>

        <main>
            {@render children()}
        </main>

        <!-- Mobile Bottom Nav -->
        <nav class="bottom-nav">
             {#each tabs as tab}
                <button 
                    class:active={view === tab.id} 
                    onclick={() => view = tab.id}
                    aria-label={tab.label}
                >
                    <tab.icon size={24} />
                    <span class="sr-only">{tab.label}</span>
                </button>
            {/each}
        </nav>
    </div>
</div>

<style>
    .app-shell {
        display: flex;
        height: 100vh;
        width: 100%;
        overflow: hidden;
    }
    
    .sidebar {
        width: 250px;
        background: #f4f4f5;
        border-right: 1px solid #e4e4e7;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 1rem;
    }
    
    .logo {
        font-weight: bold;
        font-size: 1.25rem;
        margin-bottom: 2rem;
        padding: 0 0.5rem;
        color: #18181b;
    }
    
    .sidebar nav {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .sidebar button {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem;
        border-radius: 0.5rem;
        border: none;
        background: transparent;
        color: #71717a;
        cursor: pointer;
        text-align: left;
        width: 100%;
    }
    
    .sidebar button:hover {
        background: #e4e4e7;
        color: #18181b;
    }
    
    .sidebar button.active {
        background: #e4e4e7;
        color: #18181b;
        font-weight: 500;
    }

    .main-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        position: relative;
        overflow: hidden;
    }

    .mobile-header {
        display: none;
        padding: 1rem;
        border-bottom: 1px solid #e4e4e7;
        background: white;
        color: #18181b;
    }
    
    .mobile-header h1 {
        margin: 0;
        font-size: 1.1rem;
    }

    main {
        flex: 1;
        overflow-y: auto;
        padding: 0;
        position: relative;
    }

    .bottom-nav {
        display: none;
        height: 60px;
        background: white;
        border-top: 1px solid #e4e4e7;
        justify-content: space-around;
        align-items: center;
    }

    .bottom-nav button {
        background: transparent;
        border: none;
        color: #71717a;
        padding: 0.5rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }

    .bottom-nav button.active {
        color: #2563eb;
    }

    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border-width: 0;
    }

    @media (max-width: 768px) {
        .sidebar {
            display: none;
        }
        
        .mobile-header {
            display: block;
        }
        
        .bottom-nav {
            display: flex;
        }
    }
    
    /* Dark mode adjustments */
    @media (prefers-color-scheme: dark) {
        .sidebar {
            background: #18181b;
            border-right-color: #27272a;
        }
        .logo { color: #f4f4f5; }
        .sidebar button { color: #a1a1aa; }
        .sidebar button:hover, .sidebar button.active {
            background: #27272a;
            color: #f4f4f5;
        }
        .mobile-header {
            background: #18181b;
            border-bottom-color: #27272a;
            color: #f4f4f5;
        }
        .bottom-nav {
            background: #18181b;
            border-top-color: #27272a;
        }
        .bottom-nav button { color: #a1a1aa; }
        .bottom-nav button.active { color: #60a5fa; }
    }
</style>