<script lang="ts">
    import { tripStore, type Trip, type DaySchedule, type Activity, generateId } from '../stores/tripStore.svelte';
    import MapField from '../components/MapField.svelte';
    import LocationSearch from '../components/LocationSearch.svelte';
    import { Plus, Trash2, GripVertical, MapPin, X, Check, MoreVertical, DollarSign, ExternalLink, Edit } from 'lucide-svelte';
    import { calculateDistance } from '../utils/distance';

    let { selectedTripId = $bindable(null) }: { selectedTripId: string | null } = $props();

    let trips = $derived(tripStore.trips);
    let selectedDayIndex = $state(0);
    
    let trip = $derived(selectedTripId ? tripStore.getTrip(selectedTripId) : null);
    let currentDay = $derived(trip ? trip.days[selectedDayIndex] : null);

    let mapCenter = $state<[number, number]>([51.505, -0.09]);
    let mapActivities = $derived(currentDay ? currentDay.activities : []);
    
    // Edit state
    let editingActivity = $state<Activity | null>(null);
    let isNewActivity = $state(false);

    // Context Menu State
    let contextMenu = $state({ visible: false, x: 0, y: 0, activity: null as Activity | null });
    
    // Expense Modal State
    let expenseModal = $state({ visible: false, cost: 0, activity: null as Activity | null });

    function openMenu(e: MouseEvent, act: Activity) {
        e.preventDefault();
        e.stopPropagation();
        focusActivity(act);
        
        // Calculate position (keep within bounds if possible, but simple for now)
        contextMenu = {
            visible: true,
            x: e.clientX,
            y: e.clientY,
            activity: act
        };
        
        // Close menu on outside click
        const close = () => {
            contextMenu.visible = false;
            window.removeEventListener('click', close);
        };
        // Timeout to avoid immediate close from current click
        setTimeout(() => window.addEventListener('click', close), 0);
    }

    function handleMenuAction(action: 'edit' | 'google' | 'expense') {
        if (!contextMenu.activity) return;
        const act = contextMenu.activity;
        
        if (action === 'edit') {
            // Create a copy for editing
            editingActivity = JSON.parse(JSON.stringify(act));
            isNewActivity = false;
        } else if (action === 'google') {
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(act.address || act.name)}`, '_blank');
        } else if (action === 'expense') {
            expenseModal = { visible: true, cost: act.actualCost || 0, activity: act };
        }
        
        contextMenu.visible = false;
    }

    function startAdding() {
        isNewActivity = true;
        editingActivity = {
            id: generateId(),
            name: '',
            address: '',
            lat: 0,
            lng: 0,
            estimatedCost: 0,
            actualCost: 0,
            category: 'food',
            transportType: 'walk',
            notes: '',
            completed: false
        };
    }

    function handleSearchResult(result: any) {
        if (!editingActivity) return;
        editingActivity.name = result.name;
        editingActivity.address = result.full_name;
        editingActivity.lat = result.lat;
        editingActivity.lng = result.lng;
        mapCenter = [result.lat, result.lng];
    }

    function saveEdit() {
        console.log('Saving activity:', selectedTripId)
        if (!editingActivity || !currentDay || !selectedTripId) return;
        console.log('Saving activity:', editingActivity);
        
        // Clone to ensure we store a plain object, not a proxy that might be cleared
        const activityToSave = JSON.parse(JSON.stringify(editingActivity));

        if (isNewActivity) {
            if (!activityToSave.name) return; // Validate name
            tripStore.addActivity(selectedTripId, selectedDayIndex, activityToSave);
        } else {
            tripStore.updateActivity(selectedTripId, selectedDayIndex, activityToSave);
        }
        editingActivity = null;
        isNewActivity = false;
    }

    function saveExpense() {
        if (expenseModal.activity && selectedTripId) {
             // We need to update the activity in the store. 
             // Since we don't have a direct "updateActivity" method that takes an object, 
             // we rely on the fact that objects in the store are mutable if retrieved directly.
             // However, to be safe and reactive with Svelte 5 runes, we might need to ensure we are updating the store correctly.
             // tripStore.getTrip returns the reactive object.
             
             // Find activity index
             const actIndex = currentDay?.activities.findIndex(a => a.id === expenseModal.activity!.id);
             if (actIndex !== undefined && actIndex !== -1 && currentDay) {
                 currentDay.activities[actIndex].actualCost = expenseModal.cost;
             }
        }
        expenseModal.visible = false;
    }

    let isCreating = $state(false);
    let newTripData = $state({ destination: '', startDate: '', endDate: '' });

    function createTrip() {
        if (!newTripData.destination) return;
        
        const start = new Date(newTripData.startDate);
        const end = new Date(newTripData.endDate);
        const dayCount = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        const days: DaySchedule[] = [];
        for (let i = 0; i < dayCount; i++) {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            days.push({
                date: d.toISOString().split('T')[0],
                activities: []
            });
        }

        const newTrip: Trip = {
            id: generateId(),
            destination: newTripData.destination,
            startDate: newTripData.startDate,
            endDate: newTripData.endDate,
            days
        };
        
        tripStore.addTrip(newTrip);
        selectedTripId = newTrip.id;
        isCreating = false;
        
        // Reset
        newTripData = { destination: '', startDate: '', endDate: '' };
    }

    function removeActivity(index: number) {
        if (selectedTripId) {
            tripStore.removeActivity(selectedTripId, selectedDayIndex, index);
            if (editingActivityId) editingActivityId = null;
        }
    }
    
    function focusActivity(act: Activity) {
        mapCenter = [act.lat, act.lng];
    }
    
    // Drag and Drop
    let draggingIndex: number | null = null;
    
    function onDragStart(e: DragEvent, index: number) {
        draggingIndex = index;
        if (e.dataTransfer) {
             e.dataTransfer.effectAllowed = 'move';
             e.dataTransfer.setData('text/plain', index.toString());
        }
    }
    
    function onDrop(e: DragEvent, index: number) {
        if (draggingIndex === null || !currentDay || !selectedTripId) return;
        
        // Basic reorder logic (would need a store method for cleaner impl)
        const from = draggingIndex;
        const to = index;
        if (from === to) return;

        const activities = [...currentDay.activities];
        const [moved] = activities.splice(from, 1);
        activities.splice(to, 0, moved);
        
        // We'd ideally update the store here properly, but for now we can mutate since it's a deep object in store
        // Better to add a 'reorderActivities' method to store, but for brevity:
        currentDay.activities = activities;
        
        draggingIndex = null;
    }
</script>

<div class="itinerary-view">
    {#if !trip}
        <div class="trip-list">
            <h2 class="section-title">My Trips</h2>
            {#if trips.length === 0 || isCreating}
                <div class="create-form card">
                    <h3>Plan a new trip</h3>
                    <div class="field">
                        <label for="destination">Destination</label>
                        <input id="destination" type="text" placeholder="e.g., Tokyo" bind:value={newTripData.destination} />
                    </div>
                    <div class="row">
                        <div class="field">
                            <label for="start">Start Date</label>
                            <input id="start" type="date" bind:value={newTripData.startDate} />
                        </div>
                        <div class="field">
                            <label for="end">End Date</label>
                            <input id="end" type="date" bind:value={newTripData.endDate} />
                        </div>
                    </div>
                    <div class="actions">
                        <button onclick={createTrip} class="primary">Create Trip</button>
                        {#if trips.length > 0}
                            <button class="secondary" onclick={() => isCreating = false}>Cancel</button>
                        {/if}
                    </div>
                </div>
            {:else}
                <div class="list-grid">
                    {#each trips as t}
                        <button class="trip-card" onclick={() => selectedTripId = t.id}>
                            <h3>{t.destination}</h3>
                            <p>{t.startDate} — {t.endDate}</p>
                        </button>
                    {/each}
                    <button class="add-trip-card" onclick={() => isCreating = true}>
                        <Plus size={32} />
                        <span>New Trip</span>
                    </button>
                </div>
            {/if}
        </div>
    {:else}
        <div class="trip-details">
            <header class="trip-header">
                <button class="back-btn" onclick={() => selectedTripId = null}>&larr; Trips</button>
                <h2>{trip.destination}</h2>
                <span class="dates">{trip.startDate} - {trip.endDate}</span>
            </header>
            
            <div class="content-split">
                <div class="itinerary-panel">
                    {#if !editingActivity}
                        <div class="days-nav">
                            {#each trip.days as day, i}
                                <button 
                                    class:active={selectedDayIndex === i}
                                    onclick={() => selectedDayIndex = i}
                                >
                                    <span class="day-label">Day {i + 1}</span>
                                    <span class="date-label">{day.date.slice(5)}</span>
                                </button>
                            {/each}
                        </div>
                        
                        <div class="day-header-info">
                            <span class="today-label">DAY {selectedDayIndex + 1}</span>
                            <span class="date-display">{currentDay?.date}</span>
                        </div>

                                            <div class="day-content">
                                                <div class="actions-bar">
                                                     <button class="add-act-btn" onclick={startAdding}>
                                                        <Plus size={18} />
                                                        <span>Add Activity</span>
                                                     </button>
                                                </div>
                                                
                                                <div class="timeline-list">
                                                    {#if currentDay && currentDay.activities.length === 0}
                                                        <div class="empty-state">No activities yet. Click 'Add Activity' to start planning!</div>
                                                    {/if}
                                                    
                                                    {#if currentDay}
                                                        {#each currentDay.activities as act, i (act.id)}                                        {@const nextAct = currentDay.activities[i + 1]}
                                        {@const distance = nextAct ? calculateDistance(act.lat, act.lng, nextAct.lat, nextAct.lng) : null}
                                        
                                        <div 
                                            class="timeline-item"
                                            draggable="true"
                                            role="listitem"
                                            ondragstart={(e) => onDragStart(e, i)}
                                            ondragover={(e) => e.preventDefault()}
                                            ondrop={(e) => onDrop(e, i)}
                                        >
                                            <div class="time-col">
                                                {#if i === 0}<span class="time-label start">start</span>{/if}
                                                {#if i === currentDay.activities.length - 1}<span class="time-label end">end</span>{/if}
                                            </div>

                                            <div class="visual-col">
                                                <div class="dot-container">
                                                    <div class="dot">
                                                        <div class="inner-dot"></div>
                                                    </div>
                                                </div>
                                                {#if i < currentDay.activities.length - 1}
                                                    <div class="line-container">
                                                        <div class="line"></div>
                                                        {#if distance}
                                                            <div class="distance-pill">{distance}</div>
                                                        {/if}
                                                    </div>
                                                {/if}
                                            </div>

                                            <div class="content-col">
                                                <!-- svelte-ignore a11y_click_events_have_key_events -->
                                                <!-- svelte-ignore a11y_no_static_element_interactions -->
                                                <div 
                                                    class="view-card"
                                                    onclick={(e) => openMenu(e, act)}
                                                >
                                                    <div class="card-header">
                                                        <span class="act-name">{act.name}</span>
                                                        {#if act.completed}
                                                            <Check size={16} class="check-icon" />
                                                        {/if}
                                                    </div>
                                                    {#if act.notes}
                                                        <p class="act-notes">{act.notes}</p>
                                                    {/if}
                                                    {#if act.estimatedCost > 0 || act.actualCost > 0}
                                                        <div class="cost-tag">
                                                            {#if act.actualCost > 0}
                                                                <span class="actual">${act.actualCost}</span>
                                                            {:else}
                                                                <span class="est">Est. ${act.estimatedCost}</span>
                                                            {/if}
                                                        </div>
                                                    {/if}
                                                </div>
                                            </div>
                                        </div>
                                    {/each}
                                {/if}
                            </div>
                        </div>
                    {:else}
                        <div class="edit-view">
                            <div class="edit-header-bar">
                                <button class="back-link" onclick={() => editingActivity = null}>&larr; Back to list</button>
                                <h3>{isNewActivity ? 'New Activity' : 'Edit Activity'}</h3>
                            </div>
                            
                            <div class="edit-form-content">
                                {#if isNewActivity}
                                    <div class="field search-field">
                                        <label>Search Location</label>
                                        <LocationSearch onselect={handleSearchResult} />
                                    </div>
                                {/if}

                                <div class="field">
                                    <label for="edit-name">Name</label>
                                    <input id="edit-name" type="text" bind:value={editingActivity.name} />
                                </div>

                                <div class="field">
                                    <label for="edit-category">Category</label>
                                    <select id="edit-category" bind:value={editingActivity.category}>
                                        <option value="transport">Transport</option>
                                        <option value="food">Food</option>
                                        <option value="stay">Stay</option>
                                        <option value="shopping">Shop</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>

                                <div class="row">
                                    <div class="field">
                                        <label for="edit-est">Est. Cost</label>
                                        <input id="edit-est" type="number" bind:value={editingActivity.estimatedCost} placeholder="0" />
                                    </div>
                                    <div class="field">
                                        <label for="edit-actual">Actual Cost</label>
                                        <input id="edit-actual" type="number" bind:value={editingActivity.actualCost} placeholder="0" />
                                    </div>
                                </div>

                                <div class="field">
                                    <label for="edit-notes">Notes</label>
                                    <textarea id="edit-notes" bind:value={editingActivity.notes} rows="5"></textarea>
                                </div>
                                
                                <div class="edit-footer">
                                    <button class="icon-btn danger delete-btn" onclick={() => {
                                        const idx = currentDay?.activities.findIndex(a => a.id === editingActivity!.id);
                                        if (idx !== undefined && idx !== -1) removeActivity(idx);
                                        editingActivity = null;
                                    }}>
                                        <Trash2 size={20} />
                                        <span>Delete Activity</span>
                                    </button>
                                    
                                    <div class="save-actions">
                                        <button class="secondary" onclick={() => editingActivity = null}>Cancel</button>
                                        <button class="primary" onclick={saveEdit}>Save Changes</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    {/if}
                </div>
                
                <div class="map-panel">
                    <MapField activities={mapActivities} center={mapCenter} />
                </div>
            </div>
        </div>
    {/if}

    {#if contextMenu.visible}
        <div 
            class="context-menu" 
            style="top: {contextMenu.y}px; left: {contextMenu.x}px;"
        >
            <button onclick={() => handleMenuAction('edit')}>
                <Edit size={16} />
                <span>Edit Plan</span>
            </button>
            <button onclick={() => handleMenuAction('google')}>
                <MapPin size={16} />
                <span>Google Maps</span>
            </button>
            <button onclick={() => handleMenuAction('expense')}>
                <DollarSign size={16} />
                <span>Add Expense</span>
            </button>
        </div>
    {/if}

    {#if expenseModal.visible}
        <div class="modal-overlay">
            <div class="modal">
                <h3>Add Expense</h3>
                <div class="field">
                    <label for="expense-cost">Actual Cost</label>
                    <input id="expense-cost" type="number" bind:value={expenseModal.cost} />
                </div>
                <div class="modal-actions">
                    <button class="secondary" onclick={() => expenseModal.visible = false}>Cancel</button>
                    <button class="primary" onclick={saveExpense}>Save</button>
                </div>
            </div>
        </div>
    {/if}
</div>

<style>
    .itinerary-view {
        height: 100%;
        display: flex;
        flex-direction: column;
        padding: 1rem;
        box-sizing: border-box;
    }
    
    /* Edit View Styles */
    .edit-view {
        display: flex;
        flex-direction: column;
        height: 100%;
        gap: 1rem;
        background: white;
        border-radius: 1rem;
        padding: 1rem;
        overflow-y: auto;
    }
    .edit-header-bar {
        display: flex;
        align-items: center;
        gap: 1rem;
        border-bottom: 1px solid #e4e4e7;
        padding-bottom: 1rem;
    }
    .edit-header-bar h3 { margin: 0; }
    .edit-form-content {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        flex: 1;
    }
    .edit-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid #e4e4e7;
    }
    .save-actions { display: flex; gap: 0.5rem; }
    .delete-btn { 
        display: flex; 
        align-items: center; 
        gap: 0.5rem; 
        padding: 0.5rem;
        font-weight: 500;
    }

    .section-title { margin-top: 0; }

    /* List Grid & Trip Cards (Same as before) */
    .list-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 1rem;
    }
    .trip-card, .add-trip-card {
        padding: 1.5rem;
        border-radius: 1rem;
        border: 1px solid #e4e4e7;
        background: white;
        text-align: left;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    .add-trip-card {
        align-items: center;
        justify-content: center;
        border-style: dashed;
        color: #71717a;
    }
    
    /* Create Form (Same as before) */
    .create-form {
        max-width: 400px;
        margin: 0 auto;
        padding: 2rem;
        background: white;
        border-radius: 1rem;
        border: 1px solid #e4e4e7;
    }
    .field { margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.5rem; }
    .row { display: flex; gap: 1rem; }
    input, select, textarea {
        padding: 0.5rem;
        border: 1px solid #e4e4e7;
        border-radius: 0.5rem;
        font-size: 1rem;
        background: transparent;
        color: inherit;
    }
    .actions { display: flex; gap: 1rem; margin-top: 1.5rem; }
    button.primary { background: #2563eb; color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.5rem; }
    button.secondary { background: transparent; border: 1px solid #e4e4e7; color: #71717a; padding: 0.5rem 1rem; border-radius: 0.5rem; }

    /* Trip Details */
    .trip-details { display: flex; flex-direction: column; height: 100%; gap: 1rem; }
    .trip-header { display: flex; align-items: center; gap: 1rem; }
    .back-btn { padding: 0.5rem; background: transparent; border: 1px solid #e4e4e7; }
    .content-split { display: flex; gap: 1rem; flex: 1; overflow: hidden; }
    .itinerary-panel { flex: 1; display: flex; flex-direction: column; gap: 1rem; overflow: hidden; }
    .map-panel { flex: 1; border-radius: 1rem; overflow: hidden; border: 1px solid #e4e4e7; }
    
    /* Days Nav */
    .days-nav { display: flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 0.5rem; }
    .days-nav button {
        background: white; border: 1px solid #e4e4e7; padding: 0.5rem 1rem; border-radius: 0.5rem;
        display: flex; flex-direction: column; align-items: center; min-width: 80px;
    }
    .days-nav button.active { background: #2563eb; color: white; border-color: #2563eb; }
    .date-label { font-size: 0.8rem; opacity: 0.8; }

    /* Timeline Styles */
    .day-header-info {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        padding: 0 0.5rem;
        border-bottom: 2px solid #f4f4f5;
        padding-bottom: 0.5rem;
    }
    .today-label {
        font-weight: 900;
        color: #b91c1c; /* Red-700 */
        font-size: 1.1rem;
        text-transform: uppercase;
    }
    .date-display {
        color: #71717a;
        font-size: 0.9rem;
    }

    .day-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        overflow-y: auto;
        padding-right: 0.5rem;
    }

    .actions-bar {
        padding-top: 1rem;
    }
    
    .add-act-btn {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.75rem;
        background: white;
        border: 1px dashed #a1a1aa;
        border-radius: 0.5rem;
        color: #71717a;
        cursor: pointer;
        transition: all 0.2s;
    }
    .add-act-btn:hover {
        border-color: #2563eb;
        color: #2563eb;
        background: #eff6ff;
    }

    .timeline-list {
        display: flex;
        flex-direction: column;
        padding-top: 1rem;
    }

    .timeline-item {
        display: flex;
        min-height: 80px; /* Space for the line */
    }

    .time-col {
        width: 60px;
        text-align: right;
        padding-right: 0.5rem;
        position: relative;
    }
    
    .time-label {
        font-size: 0.85rem;
        color: #a1a1aa;
        position: absolute;
        right: 10px;
        top: 0;
    }

    .visual-col {
        width: 40px;
        display: flex;
        flex-direction: column;
        align-items: center;
        position: relative;
    }
    
    .dot-container {
        height: 24px;
        width: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2;
    }
    
    .dot {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: 2px solid #b91c1c;
        background: white;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .inner-dot {
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background: #b91c1c;
    }
    
    .line-container {
        flex: 1;
        width: 2px;
        background: #e4e4e7;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 40px; /* Ensure visual spacing */
    }
    
    .distance-pill {
        background: white;
        border: 1px solid #e4e4e7;
        padding: 2px 6px;
        border-radius: 10px;
        font-size: 0.7rem;
        color: #71717a;
        position: absolute;
        z-index: 1;
        white-space: nowrap;
        left: 50%;
        transform: translateX(-50%);
    }

    .content-col {
        flex: 1;
        padding-bottom: 1.5rem;
        padding-left: 0.5rem;
    }
    
    /* View Card */
    .view-card {
        padding: 0.5rem;
        cursor: pointer;
        border-radius: 0.5rem;
        transition: background 0.2s;
    }
    .view-card:hover {
        background: #f4f4f5;
    }
    .card-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.25rem;
    }
    .act-name {
        font-weight: 600;
        font-size: 1rem;
    }
    .act-notes {
        font-size: 0.85rem;
        color: #71717a;
        margin: 0;
        margin-bottom: 0.25rem;
    }
    .cost-tag {
        font-size: 0.8rem;
    }
    .cost-tag .est { color: #a1a1aa; }
    .cost-tag .actual { color: #f59e0b; font-weight: 500; }
    
    :global(.check-icon) {
        color: #22c55e;
    }

    /* Icon Buttons (Used in Modal) */
    .icon-btn {
        padding: 0.25rem;
        background: transparent;
        border: none;
        border-radius: 0.25rem;
        cursor: pointer;
    }
    .icon-btn.success { color: #22c55e; }
    .icon-btn.success:hover { background: #dcfce7; }
    .icon-btn.danger { color: #ef4444; }
    .icon-btn.danger:hover { background: #fee2e2; }

    .full-width { flex: 1; }

    /* Dark Mode */
    @media (prefers-color-scheme: dark) {
        .trip-card, .add-trip-card, .create-form, .days-nav button, .edit-view, .view-card:hover, .add-act-btn {
            background: #18181b;
            border-color: #27272a;
            color: #f4f4f5;
        }
        .add-act-btn:hover {
            border-color: #3b82f6;
            color: #3b82f6;
            background: #27272a;
        }
        .edit-header-bar, .edit-footer { border-color: #27272a; }
        .day-header-info { border-bottom-color: #27272a; }
        .dot { background: #18181b; }
        .distance-pill { background: #18181b; border-color: #27272a; }
        .view-card:hover { background: #27272a; }
        input, select, textarea { color: white; border-color: #3f3f46; }
        .date-display, .act-notes { color: #a1a1aa; }
    }
    
    @media (max-width: 768px) {
        .map-panel { display: none; }
        .time-col { width: 35px; }
    }

    .context-menu {
        position: fixed;
        background: white;
        border: 1px solid #e4e4e7;
        border-radius: 0.5rem;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        z-index: 5000;
        min-width: 160px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }
    
    .context-menu button {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 1rem;
        background: transparent;
        border: none;
        width: 100%;
        text-align: left;
        cursor: pointer;
        color: #18181b;
        font-size: 0.9rem;
    }
    
    .context-menu button:hover {
        background: #f4f4f5;
    }

    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 6000;
    }
    
    .modal {
        background: white;
        padding: 2rem;
        border-radius: 1rem;
        width: 100%;
        max-width: 300px;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    }
    
    .modal h3 { margin: 0; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; }

    @media (prefers-color-scheme: dark) {
        .context-menu {
            background: #27272a;
            border-color: #3f3f46;
        }
        .context-menu button {
            color: #f4f4f5;
        }
        .context-menu button:hover {
            background: #3f3f46;
        }
        
        .modal {
            background: #18181b;
            color: #f4f4f5;
        }
    }
</style>
