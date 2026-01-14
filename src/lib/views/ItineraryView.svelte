<script lang="ts">
    import { tripStore, type Trip, type DaySchedule, type Activity, type Expense, type ExpenseCategory, generateId, currencies, currencySymbols, type Currency } from '../stores/tripStore.svelte';
    import MapField from '../components/MapField.svelte';
    import LocationSearch from '../components/LocationSearch.svelte';
    import { Plus, Trash2, GripVertical, MapPin, X, Check, MoreVertical, DollarSign, ExternalLink, Edit, Car, Utensils, Home, ShoppingCart, Package, Heart } from 'lucide-svelte';
    import { calculateDistance } from '../utils/distance';
    import { i18n } from '../stores/i18nStore.svelte';

    let { tripId }: { tripId: string | null } = $props();

    let selectedDayIndex = $state(0);
    let trip = $derived(tripId ? tripStore.getTrip(tripId) : null);
    let currentDay = $derived(trip ? trip.days[selectedDayIndex] : null);

    let mapCenter = $state<[number, number]>([51.505, -0.09]);
    let mapActivities = $derived(currentDay ? currentDay.activities : []);
    let showMap = $state(typeof window !== 'undefined' && window.innerWidth > 768);
    
    // Listen for window resize to toggle map visibility on mobile
    $effect.root(() => {
        if (typeof window === 'undefined') return;
        const handleResize = () => {
            showMap = window.innerWidth > 768;
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    });
    
    // Edit state
    let editingActivity = $state<Activity | null>(null);
    let isNewActivity = $state(false);

    // Context Menu State
    let contextMenu = $state({ visible: false, x: 0, y: 0, activity: null as Activity | null });
    
    // Expense Modal State
    let activityForExpenses = $state<Activity | null>(null);
    let showGeneralExpenseModal = $state(false);
    let expenseToEdit = $state<Expense | 'new' | null>(null);
    let currentExpenseData = $state({ name: '', amount: 0, category: 'other' as ExpenseCategory, currency: 'USD' as Currency });


    function openMenu(e: MouseEvent, act: Activity) {
        e.preventDefault();
        e.stopPropagation();
        focusActivity(act);
        
        // Calculate position
        let x = e.clientX;
        let y = e.clientY;
        
        // Adjust if close to right edge (assuming menu width approx 160px)
        const menuWidth = 160;
        if (typeof window !== 'undefined' && (x + menuWidth > window.innerWidth)) {
            x = window.innerWidth - menuWidth - 10; // 10px padding from edge
        }
        
        contextMenu = {
            visible: true,
            x: x,
            y: y,
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
    
    function openExpenseManager(activity: Activity) {
        activityForExpenses = activity;
        showGeneralExpenseModal = false;
        expenseToEdit = null; // Reset editor state
    }

    function openGeneralExpenseManager() {
        activityForExpenses = null;
        showGeneralExpenseModal = true;
        handleAddNewExpense(); // This sets expenseToEdit = 'new' and resets form data
    }

    function handleMenuAction(action: 'edit' | 'google') {
        if (!contextMenu.activity) return;
        const act = contextMenu.activity;
        
        if (action === 'edit') {
            // Create a copy for editing
            editingActivity = JSON.parse(JSON.stringify(act));
            isNewActivity = false;
        } else if (action === 'google') {
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(act.address || act.name)}`, '_blank');
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
            expenses: [],
            category: 'other',
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
        if (!editingActivity || !currentDay || !tripId) return;
        console.log('Saving activity:', editingActivity);
        
        // Clone to ensure we store a plain object, not a proxy that might be cleared
        const activityToSave = JSON.parse(JSON.stringify(editingActivity));

        if (isNewActivity) {
            if (!activityToSave.name) return; // Validate name
            tripStore.addActivity(tripId, selectedDayIndex, activityToSave);
        } else {
            tripStore.updateActivity(tripId, selectedDayIndex, activityToSave);
        }
        editingActivity = null;
        isNewActivity = false;
    }

    function handleEditExpense(expense: Expense) {
        expenseToEdit = expense;
        currentExpenseData = { name: expense.name || '', amount: expense.amount, category: expense.category, currency: expense.currency || trip?.currency || 'USD' };
    }

    function handleAddNewExpense() {
        expenseToEdit = 'new';
        const categoryLabel = categoryLabels[currentExpenseData.category as keyof typeof categoryLabels] || i18n.t(`cat.${currentExpenseData.category}`);
        currentExpenseData = { name: categoryLabel, amount: 0, category: 'other', currency: trip?.currency || 'USD' };
    }

    function onCategoryChange(newCategory: ExpenseCategory) {
        currentExpenseData.category = newCategory;
        // 更新預設名稱為新類別的標籤
        const categoryLabel = i18n.t(`cat.${newCategory}`);
        // 如果名稱仍然是舊的類別標籤，則更新為新的
        const oldCategoryLabel = i18n.t(`cat.${Object.keys(categoryColors).find(k => categoryLabels[k as keyof typeof categoryLabels] === currentExpenseData.name) || 'other'}`);
        if (currentExpenseData.name === oldCategoryLabel || currentExpenseData.name === '') {
            currentExpenseData.name = categoryLabel;
        }
    }

    function getExpenseNamesByCategory(category: ExpenseCategory): string[] {
        if (!trip) return [];
        const names = new Set<string>();
        // Iterate backwards to find most recent
        for (let i = trip.days.length - 1; i >= 0; i--) {
            const day = trip.days[i];
            for (let j = day.activities.length - 1; j >= 0; j--) {
                const act = day.activities[j];
                for (let k = act.expenses.length - 1; k >= 0; k--) {
                    const exp = act.expenses[k];
                    if (exp.category === category && exp.name) {
                        names.add(exp.name);
                        if (names.size >= 3) return Array.from(names);
                    }
                }
            }
        }
        // Also check general expenses
        if (trip.generalExpenses) {
             for (let k = trip.generalExpenses.length - 1; k >= 0; k--) {
                const exp = trip.generalExpenses[k];
                if (exp.category === category && exp.name) {
                    names.add(exp.name);
                    if (names.size >= 3) return Array.from(names);
                }
            }
        }
        return Array.from(names);
    }

    const categoryLabels = {
        transport: i18n.t('cat.transport'),
        food: i18n.t('cat.food'),
        stay: i18n.t('cat.stay'),
        shopping: i18n.t('cat.shopping'),
        medical: i18n.t('cat.medical'),
        other: i18n.t('cat.other')
    } as const;

    function saveExpense() {
        if ((!activityForExpenses && !showGeneralExpenseModal) || !trip || currentExpenseData.amount <= 0) return;

        const newExpenseData: Expense = {
            id: expenseToEdit === 'new' ? generateId() : (expenseToEdit as Expense).id,
            name: currentExpenseData.name || undefined,
            amount: currentExpenseData.amount,
            category: currentExpenseData.category,
            date: new Date().toISOString().split('T')[0],
            currency: currentExpenseData.currency
        };

        if (showGeneralExpenseModal) {
            if (expenseToEdit === 'new') {
                tripStore.addGeneralExpense(trip.id, newExpenseData);
            } else {
                tripStore.updateGeneralExpense(trip.id, newExpenseData);
            }
        } else if (activityForExpenses) {
            if (expenseToEdit === 'new') {
                tripStore.addExpense(trip.id, selectedDayIndex, activityForExpenses.id, newExpenseData);
            } else {
                tripStore.updateExpense(trip.id, selectedDayIndex, activityForExpenses.id, newExpenseData);
            }
        }
        expenseToEdit = null;
        if (showGeneralExpenseModal) {
            showGeneralExpenseModal = false;
        }
    }

    function deleteExpense(expenseId: string) {
        if (trip) {
            if (showGeneralExpenseModal) {
                tripStore.removeGeneralExpense(trip.id, expenseId);
            } else if (activityForExpenses) {
                tripStore.removeExpense(trip.id, selectedDayIndex, activityForExpenses.id, expenseId);
            }
        }
    }
    
    function formatExpenses(expenses: Expense[]): string {
        if (!expenses || expenses.length === 0) return '';
        const totals: Record<string, number> = {};
        expenses.forEach(e => {
            const curr = e.currency || trip?.currency || 'USD';
            totals[curr] = (totals[curr] || 0) + e.amount;
        });
        
        return Object.entries(totals)
            .map(([curr, amt]) => `${currencySymbols[curr as Currency] || '$'}${amt}`)
            .join(', ');
    }

    let isCreating = $state(false);
    let newTripData = $state({ destination: '', startDate: '', endDate: '', currency: 'TWD' as Currency });

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
                activities: [],
                journals: []
            });
        }

        const newTrip: Trip = {
            id: generateId(),
            destination: newTripData.destination,
            startDate: newTripData.startDate,
            endDate: newTripData.endDate,
            days,
            currency: newTripData.currency,
            generalExpenses: []
        };
        
        tripStore.addTrip(newTrip);
        isCreating = false;
        
        // Reset
        newTripData = { destination: '', startDate: '', endDate: '', currency: 'TWD' };
    }

    function removeActivity(index: number) {
        if (tripId) {
            tripStore.removeActivity(tripId, selectedDayIndex, index);
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
        if (draggingIndex === null || !currentDay || !tripId) return;
        
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

    const categoryIcons = {
        transport: Car,
        food: Utensils,
        stay: Home,
        shopping: ShoppingCart,
        medical: Heart,
        other: Package
    } as const;

    const categoryColors = {
        transport: '#f97316',
        food: '#ef4444',
        stay: '#8b5cf6',
        shopping: '#ec4899',
        medical: '#e91e63',
        other: '#64748b'
    } as const;
</script>

<div class="itinerary-view">
    {#if !trip}
        <div class="empty-state"><p>请选择行程</p></div>
    {:else}
        <div class="trip-details">
            <header class="trip-header">
                <h2>{trip.destination}</h2>
            </header>
            
            <div class="content-split">
                <div class="itinerary-panel">
                    {#if !editingActivity}
                        <div class="days-nav">
                            <button 
                                class:active={selectedDayIndex === -1}
                                onclick={() => selectedDayIndex = -1}
                            >
                                <span class="day-label" style="font-size: 0.8rem; white-space: nowrap;">通用</span>
                                <span class="date-label">行前/後</span>
                            </button>
                            {#each trip.days as day, i (day.date)}
                                <button  
                                    class:active={selectedDayIndex === i}
                                    onclick={() => selectedDayIndex = i}
                                >
                                    <span class="day-label">{i18n.day(i + 1)}</span>
                                    <span class="date-label">{day.date.slice(5)}</span>
                                </button>
                            {/each}
                        </div>
                        
                        {#if selectedDayIndex === -1}
                            <div class="day-header-info">
                                <span class="today-label">行程通用費用</span>
                                <span class="date-display">機票、保險、簽證...</span>
                            </div>
                            
                            <div class="day-content">
                                <div class="actions-bar">
                                     <button class="add-act-btn" onclick={openGeneralExpenseManager}>
                                        <Plus size={18} />
                                        <span>{i18n.t('modal.addNewExpense')}</span>
                                     </button>
                                </div>
                                <div class="timeline-list">
                                    {#if !trip.generalExpenses || trip.generalExpenses.length === 0}
                                        <div class="empty-state">尚無通用費用記錄</div>
                                    {:else}
                                        <div class="view-card default-cursor">
                                            <div class="card-header">
                                                <span class="act-name">費用清單</span>
                                                <div class="card-actions">
                                                    <span class="cost-tag actual">{formatExpenses(trip.generalExpenses)}</span>
                                                </div>
                                            </div>
                                            <div class="general-expense-list">
                                                {#each trip.generalExpenses as expense (expense.id)}
                                                    {@const color = categoryColors[expense.category]}
                                                    <div class="general-expense-item" style="border-left: 3px solid {color}">
                                                        <div class="general-expense-content">
                                                            {#if expense.name}
                                                                <div class="general-expense-name" style="color: {color}">{expense.name}</div>
                                                            {/if}
                                                            <div class="general-expense-cat">{i18n.t(`cat.${expense.category}`)}</div>
                                                        </div>
                                                        <div class="general-expense-amount">{currencySymbols[expense.currency || trip?.currency || 'USD']}{expense.amount}</div>
                                                        <div class="general-expense-actions">
                                                            <button class="icon-btn" onclick={() => { openGeneralExpenseManager(); handleEditExpense(expense); }}>
                                                                <Edit size={16} />
                                                            </button>
                                                            <button class="icon-btn danger" onclick={() => { showGeneralExpenseModal = true; deleteExpense(expense.id); }}>
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                {/each}
                                            </div>
                                        </div>
                                    {/if}
                                </div>
                            </div>
                        {:else}
                            <div class="day-header-info">
                                <span class="today-label">{i18n.day(selectedDayIndex + 1).toUpperCase()}</span>
                                <span class="date-display">{currentDay?.date}</span>
                                <button class="map-toggle-btn" onclick={() => showMap = !showMap} title={showMap ? i18n.t('trip.hideMap') : i18n.t('trip.showMap')}>
                                    <MapPin size={18} />
                                    <span>{showMap ? i18n.t('trip.hideMap') : i18n.t('trip.showMap')}</span>
                                </button>
                            </div>

                            <div class="day-content">
                                <div class="actions-bar">
                                     <button class="add-act-btn" onclick={startAdding}>
                                        <Plus size={18} />
                                        <span>{i18n.t('trip.addActivity')}</span>
                                     </button>
                                </div>
                                
                                <div class="timeline-list">
                                    {#if currentDay && currentDay.activities.length === 0}
                                        <div class="empty-state">{i18n.t('trip.emptyActivities')}</div>
                                    {/if}
                                    
                                    {#if currentDay}
                                        {#each currentDay.activities as act, i (act.id)}
                                            {@const nextAct = currentDay.activities[i + 1]}
                                            {@const distance = nextAct ? calculateDistance(act.lat, act.lng, nextAct.lat, nextAct.lng) : null}
                                            {@const hasExpenses = act.expenses.length > 0}
                                            
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
                                                    <div 
                                                        class="view-card"
                                                        role="button"
                                                        tabindex="0"
                                                        oncontextmenu={(e) => openMenu(e, act)}
                                                        onclick={() => focusActivity(act)}
                                                        onkeydown={(e) => {if(e.key === 'Enter') focusActivity(act)}}
                                                    >
                                                        <div class="card-header">
                                                            <span class="act-name">{act.name}</span>
                                                            <div class="card-actions">
                                                                {#if act.completed}
                                                                    <Check size={16} class="check-icon" />
                                                                {/if}
                                                                <button class="icon-btn expense-btn" onclick={(e) => {e.stopPropagation(); openExpenseManager(act)}}>
                                                                    <DollarSign size={16} />
                                                                </button>
                                                                <button class="icon-btn" onclick={(e) => openMenu(e, act)}>
                                                                    <MoreVertical size={16} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        {#if act.notes}
                                                            <p class="act-notes">{act.notes}</p>
                                                        {/if}
                                                        {#if act.estimatedCost > 0 || hasExpenses}
                                                            <div class="cost-tag">
                                                                {#if hasExpenses}
                                                                    <span class="actual">{formatExpenses(act.expenses)}</span>
                                                                {:else}
                                                                    <span class="est">Est. {currencySymbols[trip?.currency || 'USD']}{act.estimatedCost}</span>
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
                        {/if}
                    {:else}
                        <div class="edit-view">
                            <div class="edit-header-bar">
                                <button class="back-link" onclick={() => editingActivity = null}>&larr; {i18n.t('trip.backToList')}</button>
                                <h3>{isNewActivity ? i18n.t('trip.newActivity') : i18n.t('trip.editActivity')}</h3>
                            </div>
                            
                            <div class="edit-form-content">
                                {#if isNewActivity}
                                    <div class="field search-field">
                                        <label for="location-search">{i18n.t('trip.searchLocation')}</label>
                                        <div id="location-search"><LocationSearch onselect={handleSearchResult} /></div>
                                    </div>
                                {/if}

                                <div class="field">
                                    <label for="edit-name">{i18n.t('trip.name')}</label>
                                    <input id="edit-name" type="text" bind:value={editingActivity.name} />
                                </div>

                                <div class="field">
                                    <label for="edit-notes">{i18n.t('trip.notes')}</label>
                                    <textarea id="edit-notes" bind:value={editingActivity.notes} rows="5"></textarea>
                                </div>

                                {#if editingActivity && editingActivity.expenses.length > 0}
                                    <fieldset>
                                        <legend>{i18n.t('trip.expenses')}</legend>
                                        <div class="expense-list">
                                            {#each editingActivity.expenses as expense, i (expense.id)}
                                                {@const color = categoryColors[expense.category]}
                                                <div class="expense-item" style="border-left: 3px solid {color}">
                                                    <div class="expense-item-content">
                                                        {#if expense.name}
                                                            <span class="expense-item-name" style="color: {color}">{expense.name}</span>
                                                        {/if}
                                                        <span class="expense-item-category" style="color: {color}">{i18n.t(`cat.${expense.category}`)}</span>
                                                        <span class="expense-item-amount">{currencySymbols[expense.currency || trip?.currency || 'USD']}{expense.amount}</span>
                                                    </div>
                                                    <button class="icon-btn danger" onclick={() => editingActivity && tripStore.removeExpense(trip.id, selectedDayIndex, editingActivity.id, expense.id)}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            {/each}
                                        </div>
                                        <div class="total-actual-cost">
                                            <strong>{i18n.t('trip.totalActual')}</strong>
                                            <span>{formatExpenses(editingActivity.expenses)}</span>
                                        </div>
                                    </fieldset>
                                {/if}
                                
                                <div class="edit-footer">
                                    <button class="icon-btn danger delete-btn" onclick={() => {
                                        const idx = currentDay?.activities.findIndex(a => a.id === editingActivity!.id);
                                        if (idx !== undefined && idx !== -1) removeActivity(idx);
                                        editingActivity = null;
                                    }}>
                                        <Trash2 size={20} />
                                        <span>{i18n.t('trip.deleteActivity')}</span>
                                    </button>
                                    
                                    <div class="save-actions">
                                        <button class="secondary" onclick={() => editingActivity = null}>{i18n.t('trip.cancel')}</button>
                                        <button class="primary" onclick={saveEdit}>{i18n.t('trip.saveChanges')}</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    {/if}
                </div>
                
                {#if showMap}
                    <div class="map-panel">
                        <MapField activities={mapActivities} center={mapCenter} />
                    </div>
                {/if}
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
                <span>{i18n.t('trip.editPlan')}</span>
            </button>
            <button onclick={() => handleMenuAction('google')}>
                <MapPin size={16} />
                <span>{i18n.t('trip.googleMaps')}</span>
            </button>
        </div>
    {/if}

    {#if activityForExpenses || showGeneralExpenseModal}
        <div class="modal-overlay" role="dialog" tabindex="-1" onclick={() => { activityForExpenses = null; showGeneralExpenseModal = false; }} onkeydown={(e) => e.key === 'Escape' && (activityForExpenses = null, showGeneralExpenseModal = false)}>
            <div class="modal" role="presentation" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
                {#if expenseToEdit}
                    <div class="expense-form-header">
                        <h3>{expenseToEdit === 'new' ? i18n.t('modal.addExpense') : i18n.t('modal.editExpense')}</h3>
                    </div>
                    <div class="field">
                        <label for="expense-name">{i18n.t('trip.name')}</label>
                        <input id="expense-name" type="text" bind:value={currentExpenseData.name} placeholder={i18n.t('trip.name')} />
                        {#if getExpenseNamesByCategory(currentExpenseData.category).length > 0}
                            <div class="name-tags">
                                {#each getExpenseNamesByCategory(currentExpenseData.category) as name (name)}
                                    <button 
                                        class="name-tag" 
                                        onclick={() => currentExpenseData.name = name}
                                        type="button"
                                    >
                                        {name}
                                    </button>
                                {/each}
                            </div>
                        {/if}
                    </div>
                    <div class="form-row">
                        <div class="field amount-field">
                            <label for="expense-amount">{i18n.t('modal.amount')}</label>
                            <div class="input-with-icon">
                                <span class="currency-symbol">{currencySymbols[currentExpenseData.currency]}</span>
                                <input id="expense-amount" type="number" bind:value={currentExpenseData.amount} placeholder="0.00" />
                            </div>
                        </div>
                        <div class="field currency-field">
                            <label for="expense-currency">{i18n.t('trip.currency')}</label>
                            <select id="expense-currency" bind:value={currentExpenseData.currency}>
                                {#each currencies as c (c)}
                                    <option value={c}>{c}</option>
                                {/each}
                            </select>
                        </div>
                    </div>
                    <div class="field category-field">
                        <span style="font-size: 0.875rem; font-weight: 600; color: #71717a; display: block; margin-bottom: 0.5rem;">{i18n.t('finance.breakdown')}</span>
                        <div class="category-options">
                            {#each Object.entries(categoryColors) as [cat, color] (cat)}
                                {@const Icon = categoryIcons[cat as keyof typeof categoryIcons]}
                                <button
                                    class="category-btn {currentExpenseData.category === cat ? 'active' : ''}"
                                    onclick={() => onCategoryChange(cat as ExpenseCategory)}
                                    style={currentExpenseData.category === cat ? `background-color: ${color}20; border-color: ${color}; color: ${color};` : ''}
                                    title={i18n.t(`cat.${cat}`)}
                                    type="button"
                                >
                                    <Icon size={18} />
                                    <span>{i18n.t(`cat.${cat}`)}</span>
                                </button>
                            {/each}
                        </div>
                    </div>
                    <div class="expense-form-actions">
                        <button class="secondary" onclick={() => { expenseToEdit = null; if (showGeneralExpenseModal) showGeneralExpenseModal = false; }}>{i18n.t('trip.cancel')}</button>
                        <button class="primary" onclick={saveExpense} disabled={currentExpenseData.amount <= 0}>{i18n.t('modal.save')}</button>
                    </div>
                {:else}
                    <div class="modal-header">
                        <h3>{activityForExpenses.name} - {i18n.t('trip.expenses')}</h3>
                        <button class="close-btn" onclick={() => activityForExpenses = null}><X size={20}/></button>
                    </div>
                    <div class="expense-list-modal">
                        {#if activityForExpenses.expenses.length === 0}
                            <p class="empty-list">{i18n.t('modal.noExpenses')}</p>
                        {/if}
                        {#each activityForExpenses.expenses as expense (expense.id)}
                            {@const Icon = categoryIcons[expense.category]}
                            {@const color = categoryColors[expense.category]}
                            {@const categoryLabel = i18n.t(`cat.${expense.category}`)}
                            <div class="expense-item-modal" style="border-left: 4px solid {color}">
                                <div class="expense-details">
                                    {#if Icon}
                                        <div class="expense-icon" style="background-color: {color}20; color: {color}">
                                            <Icon size={20} />
                                        </div>
                                    {/if}
                                    <div class="expense-info">
                                        {#if expense.name && expense.name !== categoryLabel}
                                            <span class="expense-name" style="color: {color}">{expense.name}</span>
                                            <div class="expense-meta">
                                                <span class="expense-cat-badge" style="background-color: {color}15; color: {color}">{categoryLabel}</span>
                                                <span class="expense-date">{expense.date}</span>
                                            </div>
                                        {:else}
                                            <span class="expense-name" style="color: {color}">{categoryLabel}</span>
                                            <span class="expense-date">{expense.date}</span>
                                        {/if}
                                    </div>
                                </div>
                                <div class="expense-right">
                                    <div class="expense-amt" style="color: {color}">{currencySymbols[expense.currency || trip?.currency || 'USD']}{expense.amount}</div>
                                    <div class="expense-actions">
                                        <button class="icon-btn" onclick={() => handleEditExpense(expense)} aria-label={i18n.t('modal.editExpense')}><Edit size={16} /></button>
                                        <button class="icon-btn danger" onclick={() => deleteExpense(expense.id)} aria-label={i18n.t('trip.deleteActivity')}><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                     <div class="modal-actions">
                        <button class="primary" onclick={handleAddNewExpense}>{i18n.t('modal.addNewExpense')}</button>
                    </div>
                {/if}
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
        padding: 1.5rem;
        overflow-y: auto;
    }
    .edit-header-bar {
        display: flex;
        align-items: center;
        gap: 1rem;
        border-bottom: 2px solid #f4f4f5;
        padding-bottom: 1.25rem;
        margin-bottom: 0.5rem;
    }
    .edit-header-bar h3 { 
        margin: 0; 
        font-size: 1.25rem;
        color: #18181b;
    }
    .back-link {
        background: transparent;
        border: none;
        color: #71717a;
        cursor: pointer;
        font-size: 0.9rem;
        padding: 0;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        transition: color 0.2s;
    }
    .back-link:hover {
        color: #2563eb;
    }
    .edit-form-content {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        flex: 1;
    }

    /* Form Fields */
    .field {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .field label {
        font-size: 0.875rem;
        font-weight: 600;
        color: #71717a;
    }

    .field input,
    .field textarea,
    .field select {
        padding: 0.75rem;
        border: 1.5px solid #e2e8f0;
        border-radius: 0.75rem;
        font-size: 1rem;
        background: #f8fafc;
        color: #1e293b;
        font-family: inherit;
    }

    .field input:focus,
    .field textarea:focus,
    .field select:focus {
        outline: none;
        border-color: #2563eb;
        background: white;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }

    .field textarea {
        resize: vertical;
        min-height: 120px;
    }

    .search-field {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 0.75rem;
        padding: 1rem;
        gap: 0.75rem;
    }
    
    .edit-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 1rem;
        margin-top: 1.5rem;
        padding-top: 1.5rem;
        border-top: 2px solid #f4f4f5;
    }
    .save-actions { 
        display: flex; 
        gap: 0.75rem;
    }
    .delete-btn { 
        display: flex; 
        align-items: center; 
        gap: 0.5rem; 
        padding: 0.75rem 1rem;
        background: transparent;
        border: 1px solid #ef4444;
        color: #ef4444;
        border-radius: 0.75rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
    }
    .delete-btn:hover {
        background: #fee2e2;
    }

    .primary {
        padding: 0.75rem 1.5rem;
        background: #2563eb;
        color: white;
        border: none;
        border-radius: 0.75rem;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s;
    }
    .primary:hover {
        background: #1d4ed8;
    }
    .primary:disabled {
        background: #94a3b8;
        cursor: not-allowed;
        opacity: 0.7;
    }

    .secondary {
        padding: 0.75rem 1.5rem;
        background: transparent;
        border: 1px solid #e4e4e7;
        color: #71717a;
        border-radius: 0.75rem;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s;
    }
    .secondary:hover {
        background: #f4f4f5;
        border-color: #d4d4d8;
    }

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
    .day-label{ white-space: nowrap}
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
        justify-content: space-between;
        gap: 0.5rem;
        margin-bottom: 0.25rem;
    }
    .card-actions {
        display: flex;
        align-items: center;
        gap: 0.25rem;
    }
    .expense-btn:hover {
        color: #f59e0b;
        background: #fffbeb;
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
        padding: 0.5rem;
        background: transparent;
        border: none;
        border-radius: 0.5rem;
        cursor: pointer;
        transition: all 0.2s;
    }
    .icon-btn:hover {
        background: #f4f4f5;
    }
    
    fieldset { 
        border: 1px solid #e2e8f0;
        border-radius: 0.75rem;
        padding: 1rem;
        margin: 0;
        display: flex; 
        flex-direction: column; 
        gap: 0.75rem;
        background: #f8fafc;
    }
    legend { 
        font-size: 0.875rem; 
        font-weight: 700; 
        color: #18181b;
        text-transform: uppercase;
        padding: 0 0.5rem;
        margin-left: -0.5rem;
        letter-spacing: 0.5px;
    }
    .icon-btn.danger { color: #ef4444; }
    .icon-btn.danger:hover { background: #fee2e2; }

    /* Dark Mode */
    @media (prefers-color-scheme: dark) {
        .days-nav button, .edit-view, .view-card:hover, .add-act-btn {
            background: #18181b;
            border-color: #27272a;
            color: #f4f4f5;
        }
        .add-act-btn:hover {
            border-color: #3b82f6;
            color: #3b82f6;
            background: #27272a;
        }
        .icon-btn:hover {
             background: #27272a;
        }
        .edit-header-bar, .edit-footer { 
            border-color: #27272a; 
        }
        .day-header-info { border-bottom-color: #27272a; }
        .dot { background: #18181b; }
        .distance-pill { background: #18181b; border-color: #27272a; }
        .view-card:hover { background: #27272a; }

        .field input,
        .field textarea,
        .field select {
            background: #27272a;
            border-color: #3f3f46;
            color: #f4f4f5;
        }

        .field input:focus,
        .field textarea:focus,
        .field select:focus {
            background: #18181b;
            border-color: #3b82f6;
        }

        .field label {
            color: #a1a1aa;
        }

        .search-field {
            background: #27272a;
            border-color: #3f3f46;
        }

        .back-link {
            color: #a1a1aa;
        }
        .back-link:hover {
            color: #60a5fa;
        }

        .edit-header-bar h3 {
            color: #f4f4f5;
        }

        .secondary {
            border-color: #3f3f46;
            color: #a1a1aa;
        }
        .secondary:hover {
            background: #27272a;
            border-color: #3f3f46;
        }

        .delete-btn {
            border-color: #dc2626;
        }
        .delete-btn:hover {
            background: #7f1d1d;
        }

        fieldset {
            background: #27272a;
            border-color: #3f3f46;
        }

        legend {
            color: #f4f4f5;
        }

        .date-display, .act-notes { color: #a1a1aa; }
    }
    
    @media (max-width: 768px) {
        .content-split {
            flex-direction: column;
            gap: 0.5rem;
        }
        
        .map-panel {
            height: 300px;
            border-radius: 0.75rem;
        }

        .time-col { width: 35px; }
        
        .edit-view {
            padding: 1rem;
        }

        .edit-form-content {
            gap: 1rem;
        }

        .field input,
        .field textarea,
        .field select {
            font-size: 16px;
        }

        .edit-footer {
            flex-direction: column;
            gap: 0.75rem;
        }

        .save-actions {
            width: 100%;
            gap: 0.5rem;
        }

        .save-actions button {
            flex: 1;
        }

        .delete-btn {
            width: 100%;
        }

        .form-row {
            flex-direction: row;
            gap: 0.75rem;
        }

        .amount-field {
            flex: 2 !important;
        }

        .currency-field {
            flex: 1.2 !important;
        }

        .category-options {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.75rem;
        }

        .category-btn {
            padding: 0.75rem 0.5rem;
            min-height: 60px;
            font-size: 0.85rem;
        }

        .name-tags {
            /* width: 100%; */
            /* max-width: calc(100% - 100px); */
            /* padding: 0.25rem 0; */
            /* margin: 0.1rem 0 0.5rem 0; */
            /* gap: 0.4rem; */
        }

        .name-tag {
            padding: 0.3rem 0.65rem;
            font-size: 0.75rem;
            max-width: 100px;
        }

        .modal {
            max-width: 92%;
            max-height: 90vh;
            padding: 1.25rem;
            gap: 1rem;
        }
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
        padding: 1.5rem;
        border-radius: 1rem;
        width: 100%;
        max-width: 420px;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    }
    
    .modal h3 { margin: 0; }

    .expense-form-header {
        padding-bottom: 1rem;
        border-bottom: 2px solid #f4f4f5;
    }

    .expense-form-header h3 {
        margin: 0;
        font-size: 1.1rem;
        color: #18181b;
    }

    .form-row {
        display: flex;
        gap: 1rem;
    }

    .amount-field {
        flex: 2;
    }

    .currency-field {
        flex: 1;
    }

    .input-with-icon {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: #f8fafc;
        border: 1.5px solid #e2e8f0;
        border-radius: 0.75rem;
        padding: 0 0.75rem;
    }

    .currency-symbol {
        color: #71717a;
        font-weight: 600;
        font-size: 1.1rem;
    }

    .input-with-icon input {
        flex: 1;
        border: none;
        background: transparent;
        padding: 0.75rem 0;
        font-size: 1rem;
        color: #1e293b;
        outline: none;
    }

    .category-field {
        gap: 0.75rem !important;
    }

    .category-options {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.75rem;
    }

    .category-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 1rem 0.75rem;
        border: 1.5px solid #e2e8f0;
        border-radius: 0.75rem;
        background: #f8fafc;
        color: #64748b;
        cursor: pointer;
        font-size: 0.8rem;
        font-weight: 500;
        transition: all 0.2s;
        text-align: center;
        min-height: 70px;
    }

    .category-btn:hover {
        border-color: #d4d4d8;
        background: #f1f5f9;
    }

    .category-btn.active {
        font-weight: 600;
    }

    .name-tags {
        /* display: flex; */
        flex-wrap: nowrap;
        gap: 0.5rem;
        margin-top: 0.25rem;
        padding: 0.5rem 0;
        /* width: 90%; */
        /* overflow-x: auto; */
        /* overflow: hidden; */
        /* -webkit-overflow-scrolling: touch; */
        /* scrollbar-width: none; Firefox */
    }

    .name-tags::-webkit-scrollbar {
        display: none; /* Chrome, Safari, Edge */
    }

    .name-tag {
        padding: 0.4rem 0.85rem;
        background: #f1f5f9;
        border: 1px solid #e2e8f0;
        border-radius: 2rem;
        font-size: 0.85rem;
        color: #475569;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
        flex-shrink: 0;
        max-width: 150px;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .name-tag:hover {
        background: #e2e8f0;
        border-color: #cbd5e1;
        color: #1e293b;
    }

    .expense-form-actions {
        display: flex;
        gap: 0.75rem;
        padding-top: 1rem;
        border-top: 1px solid #f4f4f5;
    }

    .expense-form-actions .primary,
    .expense-form-actions .secondary {
        flex: 1;
        padding: 0.75rem;
    }
    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .close-btn {
        background: transparent;
        border: none;
        padding: 0.25rem;
        cursor: pointer;
    }
    .modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; }

    .expense-list-modal {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        max-height: 300px;
        overflow-y: auto;
        padding-right: 0.5rem;
    }
    .empty-list {
        text-align: center;
        color: #71717a;
        padding: 2rem 0;
    }
    .expense-item-modal {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        border-radius: 0.75rem;
        background: #f8fafc;
        gap: 1rem;
    }
    .expense-details {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex: 1;
    }
    .expense-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: 0.5rem;
        flex-shrink: 0;
    }
    .expense-info {
        display: flex;
        flex-direction: column;
        gap: 0.1rem;
    }
    .expense-name {
        font-weight: 700;
        font-size: 0.95rem;
    }
    .expense-meta {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    .expense-cat-badge {
        font-size: 0.75rem;
        padding: 0.1rem 0.4rem;
        border-radius: 0.25rem;
        font-weight: 500;
    }
    .expense-date {
        font-size: 0.75rem;
        color: #a1a1aa;
    }
    .expense-right {
        display: flex;
        align-items: center;
        gap: 1rem;
    }
    .expense-amt {
        font-weight: 700;
        font-size: 1.1rem;
        white-space: nowrap;
    }
    .expense-actions {
        display: flex;
        align-items: center;
        gap: 0.25rem;
    }

    .expense-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .expense-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 1rem;
        border-radius: 0.5rem;
        background: #f1f5f9;
        gap: 1rem;
    }

    .expense-item-content {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        flex: 1;
    }

    .expense-item-name {
        font-weight: 700;
        font-size: 0.9rem;
    }

    .expense-item-category {
        font-weight: 600;
        font-size: 0.85rem;
        text-transform: capitalize;
    }

    .expense-item-amount {
        font-weight: 600;
        color: #64748b;
        font-size: 0.9rem;
    }

    .total-actual-cost {
        display: flex;
        justify-content: space-between;
        padding-top: 0.75rem;
        border-top: 1px solid #e2e8f0;
        color: #18181b;
    }

    .default-cursor { cursor: default; }
    .general-expense-list { margin-top: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
    .general-expense-item { padding: 0.75rem 1rem; background: #f8fafc; border-radius: 0.5rem; display: flex; justify-content: space-between; align-items: center; }
    .general-expense-content { flex: 1; }
    .general-expense-name { font-weight: 700; }
    .general-expense-cat { font-size: 0.8rem; color: #64748b; text-transform: capitalize; }
    .general-expense-amount { font-weight: 700; margin-right: 1rem; color: #18181b; }
    .general-expense-actions { display: flex; gap: 0.25rem; }
    
    @media (prefers-color-scheme: dark) {
        .general-expense-item { background: #27272a; }
        .general-expense-cat { color: #a1a1aa; }
        .general-expense-amount { color: #f4f4f5; }

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

        .close-btn { color: inherit; }

        .expense-form-header {
            border-bottom-color: #27272a;
        }

        .input-with-icon {
            background: #27272a;
            border-color: #3f3f46;
        }

        .currency-symbol {
            color: #a1a1aa;
        }

        .input-with-icon input {
            color: #f4f4f5;
        }

        .category-btn {
            background: #27272a;
            border-color: #3f3f46;
            color: #a1a1aa;
        }

        .category-btn:hover {
            background: #3f3f46;
            border-color: #52525b;
        }

        .name-tags {
            display: flex;
            flex-wrap: nowrap;
            gap: 0.5rem;
            margin-top: 0.25rem;
            padding: 0.5rem 0;
            width: 100%;
            overflow-x: auto;
            overflow-y: hidden;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none; /* Firefox */
        }

        .name-tags::-webkit-scrollbar {
            display: none; /* Chrome, Safari, Edge */
        }

        .name-tag {
            padding: 0.4rem 0.85rem;
            background: #18181b;
            border-color: #3f3f46;
            color: #a1a1aa;
        }

        .name-tag:hover {
            background: #3f3f46;
            border-color: #52525b;
            color: #d4d4d8;
        }

        .expense-form-actions {
            border-top-color: #27272a;
        }

        .expense-item-modal {
            background: #27272a;
        }

        .expense-date {
            color: #71717a;
        }

        .expense-item {
            background: #27272a;
        }

        .expense-item-amount {
            color: #a1a1aa;
        }

        .total-actual-cost {
            border-top-color: #3f3f46;
            color: #f4f4f5;
        }
    }
</style>
