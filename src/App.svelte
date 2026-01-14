<script lang="ts">
    import AppShell from './lib/components/AppShell.svelte';
    import ItineraryView from './lib/views/ItineraryView.svelte';
    import FinanceView from './lib/views/FinanceView.svelte';
    import JournalView from './lib/views/JournalView.svelte';
    import MapField from './lib/components/MapField.svelte';
    import { tripStore, generateId } from './lib/stores/tripStore.svelte';
    import { i18n } from './lib/stores/i18nStore.svelte';
    import { Plus, Trash2, X, MapPin, Calendar, DollarSign } from 'lucide-svelte';

    let currentView = $state('itinerary');
    let selectedTripId = $state<string | null>(null);
    let showCreateForm = $state(false);
    let deleteConfirmTripId = $state<string | null>(null);
    let newTripData = $state({ destination: '', startDate: '', endDate: '', currency: 'TWD' as const });

    let selectedTrip = $derived(selectedTripId ? tripStore.getTrip(selectedTripId) : null);
    let trips = $derived(tripStore.trips);

    // Derived activities for the global map view
    let allActivities = $derived.by(() => {
        if (selectedTripId) {
            const trip = tripStore.getTrip(selectedTripId);
            return trip ? trip.days.flatMap(d => d.activities) : [];
        } else {
            return tripStore.trips.flatMap(t => t.days.flatMap(d => d.activities));
        }
    });

    function selectTrip(tripId: string) {
        selectedTripId = tripId;
        currentView = 'itinerary';
    }

    function backToTripList() {
        selectedTripId = null;
        currentView = 'itinerary';
    }

    function openCreateForm() {
        showCreateForm = true;
        newTripData = { destination: '', startDate: '', endDate: '', currency: 'TWD' };
    }

    function closeCreateForm() {
        showCreateForm = false;
        newTripData = { destination: '', startDate: '', endDate: '', currency: 'TWD' };
    }

    function createTrip() {
        if (!newTripData.destination || !newTripData.startDate || !newTripData.endDate) return;
        
        const start = new Date(newTripData.startDate);
        const end = new Date(newTripData.endDate);
        const dayCount = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        if (dayCount <= 0) return;
        
        const days = [];
        for (let i = 0; i < dayCount; i++) {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            days.push({
                date: d.toISOString().split('T')[0],
                activities: [],
                journals: []
            });
        }

        const newTrip = {
            id: generateId(),
            destination: newTripData.destination,
            startDate: newTripData.startDate,
            endDate: newTripData.endDate,
            days,
            currency: newTripData.currency,
            generalExpenses: []
        };
        
        tripStore.addTrip(newTrip);
        closeCreateForm();
    }

    function openDeleteConfirm(tripId: string) {
        deleteConfirmTripId = tripId;
    }

    function cancelDeleteConfirm() {
        deleteConfirmTripId = null;
    }

    function confirmDelete() {
        if (deleteConfirmTripId) {
            tripStore.removeTrip(deleteConfirmTripId);
            deleteConfirmTripId = null;
        }
    }
</script>

<AppShell bind:view={currentView} hasTrip={selectedTripId !== null} onBackTrip={backToTripList}>
    {#if !selectedTripId}
        <!-- Trip Selection View -->
        <div class="trip-list-view">
            <div class="trip-list-container">
                <div class="list-header">
                    <h1>{i18n.t('trip.myTrips')}</h1>
                    <button class="add-trip-btn" onclick={openCreateForm}>
                        <Plus size={20} />
                        <span>{i18n.t('trip.planNew')}</span>
                    </button>
                </div>
                {#if trips.length === 0}
                    <p class="empty-msg">{i18n.t('trip.empty')}</p>
                {:else}
                    <div class="trip-grid">
                        {#each trips as trip}
                            <div class="trip-card">
                                <button class="trip-content" onclick={() => selectTrip(trip.id)}>
                                    <div class="trip-header">
                                        <h2>{trip.destination}</h2>
                                    </div>
                                    <div class="trip-dates">{trip.startDate} ~ {trip.endDate}</div>
                                    <div class="trip-meta">
                                        <span>{trip.days.length} {i18n.t('trip.days')}</span>
                                    </div>
                                </button>
                                <button class="delete-trip-btn" onclick={() => openDeleteConfirm(trip.id)} title={i18n.t('trip.deleteTrip')}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>
    {:else if currentView === 'itinerary'}
        <ItineraryView tripId={selectedTripId} />
    {:else if currentView === 'finance'}
        <FinanceView tripId={selectedTripId} />
    {:else if currentView === 'journal'}
        <JournalView tripId={selectedTripId} />
    {:else if currentView === 'map'}
        <div class="full-map-view">
             <div class="map-wrapper">
                 <MapField activities={allActivities} zoom={2} />
             </div>
        </div>
    {/if}
</AppShell>

{#if showCreateForm}
    <div class="modal-overlay" role="dialog" tabindex="-1" onclick={closeCreateForm} onkeydown={(e) => e.key === 'Escape' && closeCreateForm()}>
        <div class="modal" role="presentation" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
            <div class="modal-header">
                <div>
                    <h2>{i18n.t('trip.planNewAdventure')}</h2>
                    <p class="modal-subtitle">{i18n.t('trip.fillBasicInfo')}</p>
                </div>
                <button class="close-btn" onclick={closeCreateForm}><X size={20} /></button>
            </div>
            <div class="modal-body">
                <div class="form-section">
                    <h3 class="section-title">{i18n.t('trip.basicInfo')}</h3>
                    <div class="form-group">
                        <label for="destination">{i18n.t('trip.destination')} <span class="required">*</span></label>
                        <div class="input-wrapper">
                            <MapPin size={16} class="input-icon" />
                            <input id="destination" type="text" bind:value={newTripData.destination} placeholder={i18n.lang === 'en' ? 'e.g. Tokyo' : '例如：東京'} />
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h3 class="section-title">{i18n.t('trip.dates')}</h3>
                    <div class="date-row">
                        <div class="form-group flex-1">
                            <label for="start-date">{i18n.t('trip.startDate')} <span class="required">*</span></label>
                            <div class="input-wrapper">
                                <Calendar size={16} class="input-icon" />
                                <input id="start-date" type="date" bind:value={newTripData.startDate} />
                            </div>
                        </div>
                        <div class="form-group flex-1">
                            <label for="end-date">{i18n.t('trip.endDate')} <span class="required">*</span></label>
                            <div class="input-wrapper">
                                <Calendar size={16} class="input-icon" />
                                <input id="end-date" type="date" bind:value={newTripData.endDate} />
                            </div>
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h3 class="section-title">{i18n.t('trip.otherSettings')}</h3>
                    <div class="form-group">
                        <label for="currency">{i18n.t('trip.currency')}</label>
                        <div class="input-wrapper">
                            <DollarSign size={16} class="input-icon" />
                            <select id="currency" bind:value={newTripData.currency}>
                                <option value="TWD">TWD - {i18n.lang === 'en' ? 'Taiwan Dollar' : '新台幣'}</option>
                                <option value="JPY">JPY - {i18n.lang === 'en' ? 'Japanese Yen' : '日圓'}</option>
                                <option value="USD">USD - {i18n.lang === 'en' ? 'US Dollar' : '美元'}</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="cancel-btn" onclick={closeCreateForm}>{i18n.t('trip.cancel')}</button>
                <button class="create-btn" onclick={createTrip} disabled={!newTripData.destination || !newTripData.startDate || !newTripData.endDate}>
                    <Plus size={18} />
                    <span>{i18n.t('trip.startYourPlan')}</span>
                </button>
            </div>
        </div>
    </div>
{/if}

{#if deleteConfirmTripId}
    <div class="modal-overlay" role="alertdialog" tabindex="-1" onclick={cancelDeleteConfirm} onkeydown={(e) => e.key === 'Escape' && cancelDeleteConfirm()}>
        <div class="confirm-modal" role="presentation" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
            <div class="confirm-icon"><Trash2 size={32} /></div>
            <h2>{i18n.lang === 'en' ? 'Confirm Delete Trip?' : '確認刪除行程？'}</h2>
            <div class="confirm-message">
                <p>{i18n.lang === 'en' ? 'This trip will be permanently deleted.' : '將永久刪除此行程。'}</p>
                <p class="warning">{i18n.lang === 'en' ? 'This action will also delete all associated activities, expenses, and journal entries. This cannot be undone.' : '此操作將一併刪除所有相關的活動、費用記錄和日記，且無法恢復。'}</p>
            </div>
            <div class="confirm-actions">
                <button class="cancel-btn" onclick={cancelDeleteConfirm}>{i18n.t('trip.cancel')}</button>
                <button class="delete-btn" onclick={confirmDelete}>{i18n.lang === 'en' ? 'Confirm Delete' : '確認刪除'}</button>
            </div>
        </div>
    </div>
{/if}

<style>
    .trip-list-view {
        height: 100%;
        display: flex;
        flex-direction: column;
        background: white;
    }

    .trip-list-container {
        flex: 1;
        padding: 2rem;
        overflow-y: auto;
    }

    .list-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
        gap: 1rem;
    }

    .trip-list-container h1 {
        margin: 0;
        color: #18181b;
        font-size: 1.875rem;
    }

    .add-trip-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1.25rem;
        background: #2563eb;
        color: white;
        border: none;
        border-radius: 0.75rem;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s;
        white-space: nowrap;
    }

    .add-trip-btn:hover {
        background: #1d4ed8;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
    }

    .empty-msg {
        text-align: center;
        color: #71717a;
        font-size: 1rem;
        margin-top: 2rem;
    }

    .trip-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 1.5rem;
    }

    .trip-card {
        background: white;
        border: 1px solid #e4e4e7;
        border-radius: 1rem;       
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        position: relative;
    }

    .trip-card:hover {
        border-color: #2563eb;
        box-shadow: 0 8px 16px rgba(37, 99, 235, 0.15);
        transform: translateY(-4px);
    }

    .trip-content {
        padding: 1.5rem;
        background: none;
        border: none;
        cursor: pointer;
        text-align: left;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        flex: 1;
    }

    .trip-header {
        margin: 0;
    }

    .trip-header h2 {
        margin: 0;
        font-size: 1.25rem;
        color: #18181b;
    }

    .trip-dates {
        color: #71717a;
        font-size: 0.875rem;
    }

    .trip-meta {
        color: #2563eb;
        font-size: 0.875rem;
        font-weight: 500;
    }

    .delete-trip-btn {
        position: absolute;
        top: 1rem;
        right: 1rem;
        background: transparent;
        border: none;
        color: #ef4444;
        cursor: pointer;
        padding: 0.5rem;
        border-radius: 0.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
    }

    .delete-trip-btn:hover {
        background: #fee2e2;
        transform: scale(1.1);
    }

    /* Modal Styles */
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
        padding: 1rem;
        backdrop-filter: blur(4px);
    }

    .modal {
        background: white;
        border-radius: 1.25rem;
        width: 100%;
        max-width: 500px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        display: flex;
        flex-direction: column;
    }

    .modal-header {
        padding: 1.5rem;
        border-bottom: 1px solid #e4e4e7;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .modal-header h2 {
        margin: 0;
        font-size: 1.25rem;
    }

    .close-btn {
        background: transparent;
        border: none;
        cursor: pointer;
        color: #71717a;
        padding: 0.25rem;
        border-radius: 0.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
    }

    .close-btn:hover {
        background: #f4f4f5;
        color: #18181b;
    }

    .modal-body {
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        max-height: 500px;
        overflow-y: auto;
    }

    .modal-subtitle {
        font-size: 0.875rem;
        color: #71717a;
        margin: 0.5rem 0 0 0;
        font-weight: 400;
    }

    .form-section {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding-bottom: 0.5rem;
    }

    .section-title {
        font-size: 0.95rem;
        font-weight: 700;
        color: #18181b;
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid #2563eb;
        display: inline-block;
    }

    .required {
        color: #ef4444;
        font-weight: 700;
        margin-left: 0.25rem;
    }

    .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .form-group label {
        font-size: 0.875rem;
        font-weight: 600;
        color: #71717a;
    }

    .input-wrapper {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        position: relative;
    }

    :global(.input-icon) {
        color: #2563eb;
        flex-shrink: 0;
        margin-left: 0.25rem;
    }

    .form-group input,
    .form-group select {
        flex: 1;
        padding: 0.75rem;
        border: 1.5px solid #e2e8f0;
        border-radius: 0.75rem;
        font-size: 1rem;
        background: #f8fafc;
        color: #1e293b;
        font-family: inherit;
    }

    .form-group input:focus,
    .form-group select:focus {
        outline: none;
        border-color: #2563eb;
        background: white;
    }

    .date-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
    }

    .flex-1 {
        flex: 1;
    }

    .modal-footer {
        padding: 1.5rem;
        border-top: 1px solid #e4e4e7;
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
    }

    .cancel-btn {
        padding: 0.75rem 1.5rem;
        background: transparent;
        border: 1px solid #e4e4e7;
        color: #71717a;
        border-radius: 0.75rem;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s;
    }

    .cancel-btn:hover {
        background: #f4f4f5;
        border-color: #d4d4d8;
    }

    .create-btn {
        padding: 0.75rem 1.5rem;
        background: #2563eb;
        color: white;
        border: none;
        border-radius: 0.75rem;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
    }

    .create-btn:hover:not(:disabled) {
        background: #1d4ed8;
    }

    .create-btn:disabled {
        background: #d4d4d8;
        cursor: not-allowed;
    }

    /* Confirm Modal */
    .confirm-modal {
        background: white;
        border-radius: 1.25rem;
        padding: 2rem;
        text-align: center;
        width: 100%;
        max-width: 400px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    }

    .confirm-icon {
        color: #ef4444;
        margin-bottom: 1rem;
        display: flex;
        justify-content: center;
    }

    .confirm-modal h2 {
        margin: 0 0 1rem 0;
        color: #18181b;
        font-size: 1.25rem;
    }

    .confirm-message {
        margin-bottom: 1.5rem;
        color: #71717a;
        font-size: 0.95rem;
        line-height: 1.6;
    }

    .confirm-message p {
        margin: 0.5rem 0;
    }

    .confirm-message .warning {
        color: #ef4444;
        font-weight: 500;
    }

    .confirm-actions {
        display: flex;
        gap: 0.75rem;
        justify-content: center;
    }

    .delete-btn {
        padding: 0.75rem 1.5rem;
        background: #ef4444;
        color: white;
        border: none;
        border-radius: 0.75rem;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s;
    }

    .delete-btn:hover {
        background: #dc2626;
    }

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

    @media (prefers-color-scheme: dark) {
        .trip-list-view {
            background: #18181b;
        }

        .trip-list-container h1 {
            color: #f4f4f5;
        }

        .add-trip-btn {
            background: #3b82f6;
        }

        .add-trip-btn:hover {
            background: #2563eb;
        }

        .trip-card {
            background: #27272a;
            border-color: #3f3f46;
        }

        .trip-card:hover {
            border-color: #60a5fa;
            box-shadow: 0 8px 16px rgba(96, 165, 250, 0.15);
        }

        .trip-header h2 {
            color: #f4f4f5;
        }

        .trip-dates {
            color: #a1a1aa;
        }

        .modal {
            background: #18181b;
        }

        .modal-header {
            border-bottom-color: #27272a;
            color: #f4f4f5;
        }

        .modal-header h2 {
            color: #f4f4f5;
        }

        .modal-subtitle {
            color: #a1a1aa;
        }

        .section-title {
            color: #f4f4f5;
            border-bottom-color: #3b82f6;
        }

        .close-btn {
            color: #a1a1aa;
        }

        .close-btn:hover {
            background: #27272a;
            color: #f4f4f5;
        }

        .modal-body {
            color: #f4f4f5;
        }

        .form-group label {
            color: #a1a1aa;
        }

        :global(.input-icon) {
            color: #60a5fa;
        }

        .form-group input,
        .form-group select {
            background: #27272a;
            border-color: #3f3f46;
            color: #f4f4f5;
        }

        .form-group input:focus,
        .form-group select:focus {
            background: #18181b;
            border-color: #3b82f6;
        }

        .modal-footer {
            border-top-color: #27272a;
        }

        .cancel-btn {
            border-color: #3f3f46;
            color: #a1a1aa;
        }

        .cancel-btn:hover {
            background: #27272a;
        }

        .confirm-modal {
            background: #18181b;
        }

        .confirm-modal h2 {
            color: #f4f4f5;
        }

        .confirm-message {
            color: #a1a1aa;
        }
    }

    @media (max-width: 640px) {
        .modal {
            max-width: 100%;
            border-radius: 1rem;
        }

        .modal-body {
            max-height: 60vh;
        }

        .date-row {
            grid-template-columns: 1fr;
        }

        .modal-footer {
            flex-wrap: wrap;
            gap: 0.75rem;
        }

        .create-btn {
            width: 100%;
            order: 2;
        }

        .cancel-btn {
            flex: 1;
            order: 1;
        }

        .section-title {
            font-size: 0.85rem;
            padding-bottom: 0.75rem;
        }
    }
</style>