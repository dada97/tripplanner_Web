<script lang="ts">
    import { tripStore, type JournalEntry, generateId } from '../stores/tripStore.svelte';
    import { i18n } from '../stores/i18nStore.svelte';
    import { ChevronLeft, ChevronRight, Sun, Cloud, CloudRain, CloudSnow, Wind, Plus, MapPin, Clock, Edit, Trash2, X, Image as ImageIcon, Download } from 'lucide-svelte';

    let { tripId }: { tripId: string | null } = $props();

    let trip = $derived(tripId ? tripStore.getTrip(tripId) : null);
    
    let selectedDayIndex = $state(0);
    let showDayPicker = $state(false);

    let currentDayJournals = $derived(trip?.days[selectedDayIndex]?.journals || []);

    // View State
    let viewingEntry = $state<JournalEntry | null>(null);

    // Editor State
    let isEditing = $state(false);
    let editingEntry = $state<JournalEntry | null>(null);
    let entryContent = $state('');
    let entryLocation = $state('');
    let entryWeather = $state<JournalEntry['weather']>(null);
    let entryTime = $state('');
    let entryPhotos = $state<string[]>([]);

    function openViewer(entry: JournalEntry) {
        viewingEntry = entry;
    }

    function closeViewer() {
        viewingEntry = null;
    }

    function exportToHTML() {
        if (!trip) return;

        const escapeHtml = (unsafe: string) => {
            return unsafe
                 .replace(/&/g, "&amp;")
                 .replace(/</g, "&lt;")
                 .replace(/>/g, "&gt;")
                 .replace(/"/g, "&quot;")
                 .replace(/'/g, "&#039;");
        };

        const style = `
            body { font-family: system-ui, -apple-system, sans-serif; background: #f4f4f5; color: #18181b; margin: 0; padding: 2rem; }
            .container { max-width: 800px; margin: 0 auto; }
            h1 { text-align: center; margin-bottom: 0.5rem; color: #18181b; }
            .dates { text-align: center; color: #71717a; margin-bottom: 3rem; }
            .day-section { margin-bottom: 4rem; page-break-after: always; }
            .day-section:last-child { page-break-after: auto; }
            .day-header { font-size: 1.5rem; font-weight: bold; margin-bottom: 1.5rem; padding-bottom: 0.5rem; border-bottom: 2px solid #e4e4e7; color: #3b82f6; }
            .entry-card { background: white; border-radius: 1rem; overflow: hidden; margin-bottom: 2rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); height: auto; page-break-inside: avoid; }
            .entry-header { padding: 1.5rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f4f4f5; }
            .meta { display: flex; gap: 1rem; align-items: center; color: #71717a; font-size: 0.9rem; }
            .meta span { display: flex; align-items: center; gap: 0.25rem; }
            .content { padding: 1.5rem; line-height: 1.8; white-space: pre-wrap; font-size: 1.1rem; overflow-wrap: break-word; }
            .photos { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.5rem; }
            .photos img { width: 100%; height: auto; object-fit: contain; max-height: 400px; background: #000; }
            .weather-badge { background: #eff6ff; color: #3b82f6; padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.85rem; font-weight: 500; }
            @media (prefers-color-scheme: dark) {
                body { background: #18181b; color: #f4f4f5; }
                .entry-card { background: #27272a; }
                .day-header { border-bottom-color: #3f3f46; }
                .entry-header { border-bottom-color: #3f3f46; }
                .meta { color: #a1a1aa; }
                .weather-badge { background: #1e3a8a; color: #bfdbfe; }
            }
        `;

        let html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${trip.destination} Journal</title><style>${style}</style></head><body><div class="container"><h1>${escapeHtml(trip.destination)}</h1><div class="dates">${trip.startDate} — ${trip.endDate}</div>`;

        trip.days.forEach((day, index) => {
            if (day.journals.length === 0) return;
            html += `<div class="day-section"><div class="day-header">${i18n.day(index + 1)} - ${day.date}</div>`;
            const sortedJournals = [...day.journals].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
            sortedJournals.forEach(entry => {
                html += `<div class="entry-card"><div class="entry-header"><div class="meta"><span>🕒 ${entry.timestamp}</span>${entry.location ? `<span>📍 ${escapeHtml(entry.location)}</span>` : ''}</div>${entry.weather ? `<div class="weather-badge">${i18n.t(`journal.${entry.weather}`)}</div>` : ''}</div>${entry.photos && entry.photos.length > 0 ? `<div class="photos">${entry.photos.map(p => `<img src="${p}" loading="lazy" />`).join('')}</div>` : ''}<div class="content">${escapeHtml(entry.content)}</div></div>`;
            });
            html += `</div>`;
        });
        html += `</div></body></html>`;

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${trip.destination}_Journal.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function openEditor(entry?: JournalEntry) {
        isEditing = true;
        if (entry) {
            editingEntry = entry;
            entryContent = entry.content;
            entryLocation = entry.location || '';
            entryWeather = entry.weather;
            entryTime = entry.timestamp;
            entryPhotos = [...(entry.photos || [])];
        } else {
            editingEntry = null;
            entryContent = '';
            entryLocation = '';
            entryWeather = null;
            entryPhotos = [];
            const now = new Date();
            entryTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        }
        if (viewingEntry) closeViewer();
    }

    function closeEditor() {
        isEditing = false;
        editingEntry = null;
    }

    function saveEntry() {
        if (!trip || !trip.days[selectedDayIndex]) return;
        const newEntry: JournalEntry = {
            id: editingEntry ? editingEntry.id : generateId(),
            timestamp: entryTime,
            content: entryContent,
            location: entryLocation,
            weather: entryWeather,
            photos: entryPhotos
        };
        if (editingEntry) {
            tripStore.updateJournalEntry(trip.id, selectedDayIndex, newEntry);
        } else {
            tripStore.addJournalEntry(trip.id, selectedDayIndex, newEntry);
        }
        closeEditor();
    }

    function deleteEntry() {
        if (!trip || !editingEntry) return;
        tripStore.removeJournalEntry(trip.id, selectedDayIndex, editingEntry.id);
        closeEditor();
    }

    async function handleImageUpload(e: Event) {
        const input = e.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;
        const files = Array.from(input.files);
        for (const file of files) {
            try {
                const base64 = await compressImage(file);
                entryPhotos.push(base64);
            } catch (err) {
                console.error("Failed to process image", err);
            }
        }
        input.value = '';
    }

    function compressImage(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1200; // Increased for better quality
                    const MAX_HEIGHT = 1200;
                    let width = img.width;
                    let height = img.height;
                    if (width > height) {
                        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                    } else {
                        if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                    }
                    canvas.width = width; canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                };
                img.onerror = (err) => reject(err);
            };
            reader.onerror = (err) => reject(err);
        });
    }

    function removePhoto(index: number) {
        entryPhotos.splice(index, 1);
        entryPhotos = [...entryPhotos];
    }

    $effect(() => {
        if (tripId) {
            showDayPicker = false;
            if (trip) {
                const today = new Date();
                const todayStr = today.toISOString().split('T')[0];
                const dayIndex = trip.days.findIndex(d => d.date === todayStr);
                if (dayIndex !== -1) selectedDayIndex = dayIndex;
                else selectedDayIndex = 0;
            } else {
                selectedDayIndex = 0;
            }
        }
    });

    function nextDay() { if (trip && selectedDayIndex < trip.days.length - 1) selectedDayIndex++; }
    function prevDay() { if (selectedDayIndex > 0) selectedDayIndex--; }
    function selectDay(index: number) { selectedDayIndex = index; showDayPicker = false; }

    const weatherOptions = [
        { type: 'sunny', icon: Sun, label: 'journal.sunny' },
        { type: 'cloudy', icon: Cloud, label: 'journal.cloudy' },
        { type: 'rainy', icon: CloudRain, label: 'journal.rainy' },
        { type: 'snowy', icon: CloudSnow, label: 'journal.snowy' },
        { type: 'windy', icon: Wind, label: 'journal.windy' }
    ] as const;

    function getWeatherIcon(type: JournalEntry['weather']) {
        return weatherOptions.find(w => w.type === type)?.icon;
    }
</script>

<div class="journal-view">
    {#if !trip}
        <div class="empty-state"><p>请选择行程</p></div>
    {:else}
        <header>
            <div class="header-title-row">
                <h2>{trip.destination} {i18n.t('journal.title')}</h2>
                <button class="export-btn" onclick={exportToHTML} title={i18n.t('journal.export')}>
                    <Download size={20} />
                </button>
            </div>
            
            <div class="day-navigator">
                <button class="nav-btn" disabled={selectedDayIndex === 0} onclick={prevDay}><ChevronLeft size={20} /></button>
                <div class="current-day-display">
                                                <button 
                                                    class="day-toggle" 
                                                    onclick={() => showDayPicker = !showDayPicker}
                                                >
                                                    <span class="day-label">{i18n.day(selectedDayIndex + 1)}</span>
                                                    <span class="date-label">{trip.days[selectedDayIndex].date}</span>
                                                </button>
                    {#if showDayPicker}
                        <div class="day-picker-dropdown">
                            {#each trip.days as day, i}
                                                                        <button 
                                                                            class="day-option {i === selectedDayIndex ? 'selected' : ''}"
                                                                            onclick={() => selectDay(i)}
                                                                        >
                                                                            <span class="day-num">{i18n.day(i + 1)}</span>
                                                                            <span class="day-date">{day.date}</span>
                                                                        </button>
                            {/each}
                        </div>
                        <div class="backdrop" role="button" tabindex="0" onclick={() => showDayPicker = false} onkeydown={(e) => e.key === 'Escape' && (showDayPicker = false)}></div>
                    {/if}
                </div>
                <button class="nav-btn" disabled={selectedDayIndex === trip.days.length - 1} onclick={nextDay}><ChevronRight size={20} /></button>
            </div>
        </header>

        <div class="journal-list">
            {#if currentDayJournals.length === 0}
                <div class="empty-state"><p>{i18n.t('journal.empty')}</p></div>
            {/if}

            {#each currentDayJournals as entry}
                <div 
                    class="journal-card {entry.photos && entry.photos.length > 0 ? 'has-photo' : 'no-photo'}" 
                    role="button"
                    tabindex="0"
                    onclick={() => openViewer(entry)}
                    onkeydown={(e) => e.key === 'Enter' && openViewer(entry)}
                >
                    {#if entry.photos && entry.photos.length > 0}
                        <img src={entry.photos[0]} alt="Journal entry" class="card-image" />
                    {/if}
                    <div class="card-overlay">
                        <div class="card-header-info">
                            <span class="time">{entry.timestamp}</span>
                            {#if entry.weather}
                                {@const Icon = getWeatherIcon(entry.weather)}
                                {#if Icon}<div class="weather-icon"><Icon size={14} /></div>{/if}
                            {/if}
                        </div>
                        
                        <div class="card-footer-info">
                            {#if entry.location}
                                <div class="location-row"><MapPin size={14} /><span class="location">{entry.location}</span></div>
                            {/if}
                            <p class="card-content">{entry.content}</p>
                        </div>
                    </div>
                </div>
            {/each}
        </div>

        <button class="fab" onclick={() => openEditor()}><Plus size={24} /></button>

        {#if viewingEntry}
            <div class="editor-overlay" role="button" tabindex="0" onclick={closeViewer} onkeydown={(e) => e.key === 'Escape' && closeViewer()}>
                <div class="editor-modal viewer-modal" role="dialog" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
                    <div class="editor-header">
                        <h3>{i18n.t('journal.viewEntry')}</h3>
                        <div class="header-actions">
                            <button class="icon-btn edit-action" onclick={() => openEditor(viewingEntry!)}><Edit size={18} /></button>
                            <button class="close-btn" onclick={closeViewer}><X size={20} /></button>
                        </div>
                    </div>
                    <div class="editor-body">
                        <div class="viewer-meta">
                            <div class="meta-row"><Clock size={16} /><span>{viewingEntry.timestamp}</span></div>
                            {#if viewingEntry.location}<div class="meta-row"><MapPin size={16} /><span>{viewingEntry.location}</span></div>{/if}
                            {#if viewingEntry.weather}
                                {@const Icon = getWeatherIcon(viewingEntry.weather)}
                                {#if Icon}<div class="meta-row weather"><Icon size={16} /><span>{i18n.t(`journal.${viewingEntry.weather}`)}</span></div>{/if}
                            {/if}
                        </div>
                        {#if viewingEntry.photos && viewingEntry.photos.length > 0}
                            <div class="viewer-photos">
                                {#each viewingEntry.photos as photo}<img src={photo} alt="Journal" />{/each}
                            </div>
                        {/if}
                        <p class="viewer-content">{viewingEntry.content}</p>
                    </div>
                </div>
            </div>
        {/if}

        {#if isEditing}
            <div class="editor-overlay" role="button" tabindex="0" onclick={closeEditor} onkeydown={(e) => e.key === 'Escape' && closeEditor()}>
                <div class="editor-modal" role="dialog" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
                    <div class="editor-header">
                        <h3>{editingEntry ? i18n.t('journal.editEntry') : i18n.t('journal.addEntry')}</h3>
                        <button class="close-btn" onclick={closeEditor}><X size={20} /></button>
                    </div>
                    <div class="editor-body">
                        <div class="row">
                            <div class="field time-field"><label for="entry-time">{i18n.t('journal.time')}</label><div class="input-wrap"><Clock size={16} class="input-icon" /><input id="entry-time" type="time" bind:value={entryTime} /></div></div>
                            <div class="field loc-field"><label for="entry-location">{i18n.t('journal.location')}</label><div class="input-wrap"><MapPin size={16} class="input-icon" /><input id="entry-location" type="text" placeholder={i18n.t('journal.locationPlaceholder')} bind:value={entryLocation} /></div></div>
                        </div>
                        <div class="field">
                            <fieldset><legend>{i18n.t('journal.weather')}</legend>
                            <div class="weather-options">
                                {#each weatherOptions as w}
                                    <button class="weather-btn {entryWeather === w.type ? 'active' : ''}" onclick={() => entryWeather = w.type} title={i18n.t(w.label)}><w.icon size={20} /></button>
                                {/each}
                            </div>
                            </fieldset>
                        </div>
                        <div class="field">
                            <fieldset><legend>{i18n.t('journal.photos')}</legend>
                            <div class="photo-upload-area">
                                <input type="file" id="photo-upload" accept="image/*" multiple onchange={handleImageUpload} style="display: none;" />
                                <div class="photo-grid">
                                    {#each entryPhotos as photo, i}<div class="photo-thumb"><img src={photo} alt="Thumbnail" /><button class="remove-photo" onclick={() => removePhoto(i)}><X size={12} /></button></div>{/each}
                                    <label for="photo-upload" class="add-photo-btn"><ImageIcon size={24} /><span>{i18n.t('journal.addPhotos')}</span></label>
                                </div>
                            </div>
                            </fieldset>
                        </div>
                        <div class="field content-field"><textarea placeholder={i18n.t('journal.placeholder')} bind:value={entryContent}></textarea></div>
                    </div>
                    <div class="editor-footer">
                        {#if editingEntry}<button class="icon-btn danger" onclick={deleteEntry}><Trash2 size={20} />刪除</button>{:else}<div></div>{/if}
                        <button class="primary-btn" onclick={saveEntry}>{i18n.t('modal.save')}</button>
                    </div>
                </div>
            </div>
        {/if}
    {/if}
</div>

<style>
    header { padding: 1.5rem 1.5rem 1rem 1.5rem; display: flex; flex-direction: column; gap: 1rem; align-items: center; flex-shrink: 0; border-bottom: 1px solid #f4f4f5; background: white; z-index: 10; }
    .header-title-row { display: flex; align-items: center; justify-content: center; gap: 1rem; position: relative; }
    .export-btn { background: transparent; border: none; padding: 0.5rem; color: #71717a; cursor: pointer; border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; transition: all 0.2s; position: absolute; right: 0; top: 50%; transform: translateY(-50%); }
    .export-btn:hover { background: #f4f4f5; color: #18181b; }
    h2 { margin: 0; text-align: center; }
    .day-navigator { display: flex; align-items: center; justify-content: center; gap: 0.75rem; width: 100%; max-width: 400px; }
    .nav-btn { background: linear-gradient(135deg, #27272a 0%, #1f2937 100%); border: 1px solid #3f3f46; padding: 0.6rem 0.8rem; cursor: pointer; color: #60a5fa; border-radius: 0.75rem; display: flex; align-items: center; justify-content: center; transition: all 0.2s; font-weight: 500; }
    .nav-btn:disabled { background: #3f3f46; color: #6b7280; border-color: #52525b; cursor: not-allowed; }
    .nav-btn:not(:disabled):hover { background: linear-gradient(135deg, #1f2937 0%, #111827 100%); border-color: #60a5fa; }
    .current-day-display { position: relative; flex: 1; max-width: 200px; }
    .day-toggle { background: linear-gradient(135deg, #27272a 0%, #1f2937 100%); border: 1px solid #3f3f46; padding: 0.5rem 1rem; cursor: pointer; display: flex; flex-direction: column; align-items: center; border-radius: 0.75rem; width: 100%; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.3); color: #f4f4f5; }
    .day-toggle:hover { border-color: #60a5fa; background: linear-gradient(135deg, #1f2937 0%, #111827 100%); }
    .day-label { font-weight: 700; font-size: 0.95rem; color: #f4f4f5; }
    .date-label { font-size: 0.75rem; color: #9ca3af; margin-top: 1px; }
    .day-picker-dropdown { position: absolute; top: calc(100% + 0.75rem); left: 50%; transform: translateX(-50%); background: linear-gradient(135deg, #27272a 0%, #1f2937 100%); border: 1px solid #3f3f46; border-radius: 1rem; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5); max-height: 240px; overflow-y: auto; z-index: 20; min-width: 220px; display: flex; flex-direction: column; padding: 0.5rem; animation: slideDown 0.2s ease-out; }
    @keyframes slideDown { from { opacity: 0; transform: translate(-50%, -10px); } to { opacity: 1; transform: translate(-50%, 0); } }
    .day-option { background: none; border: none; padding: 0.75rem 1rem; text-align: left; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-radius: 0.5rem; color: #d1d5db; transition: all 0.15s; font-weight: 500; }
    .day-option:hover { background: #3f3f46; }
    .day-option.selected { background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); color: #60a5fa; font-weight: 600; }
    .day-option .day-num { font-size: 0.9rem; }
    .day-option .day-date { font-size: 0.75rem; color: #9ca3af; }
    .backdrop { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 10; background: rgba(0,0,0,0.02); }

    .journal-list { flex: 1; display: grid; grid-template-columns: 1fr; gap: 1.5rem; padding: 1rem 1.5rem 6rem 1.5rem; overflow-y: auto; overflow-x: hidden; align-content: start; }
    .journal-card { border-radius: 1rem; overflow: hidden; cursor: pointer; transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); width: 100%; height: 300px; display: flex; flex-direction: column; box-sizing: border-box; position: relative; background-color: white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: none; }
    .journal-card.no-photo { background: linear-gradient(135deg, #f3f4f6 0%, #e2e8f0 100%); }
    .card-image { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: contain; background-color: #000; }
    .journal-card:hover { transform: translateY(-4px); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15); }
    .card-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.8) 100%); display: flex; flex-direction: column; justify-content: space-between; padding: 1.25rem; box-sizing: border-box; color: white; }
    .journal-card.no-photo .card-overlay { background: none; color: #18181b; }
    .card-header-info { display: flex; justify-content: space-between; align-items: flex-start; }
    .time { font-weight: 700; font-size: 1.1rem; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
    .journal-card.no-photo .time { color: #3b82f6; text-shadow: none; }
    .weather-icon { background: rgba(255,255,255,0.2); backdrop-filter: blur(4px); padding: 0.4rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
    .journal-card.no-photo .weather-icon { background: #e2e8f0; color: #f59e0b; }
    .card-footer-info { display: flex; flex-direction: column; gap: 0.35rem; }
    .location-row { display: flex; align-items: center; gap: 0.25rem; font-size: 0.85rem; font-weight: 500; text-shadow: 0 1px 2px rgba(0,0,0,0.5); }
    .journal-card.no-photo .location-row { color: #64748b; text-shadow: none; }
    .location { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .card-content { margin: 0; font-size: 0.95rem; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-shadow: 0 1px 2px rgba(0,0,0,0.5); }
    .journal-card.no-photo .card-content { color: #334155; text-shadow: none; -webkit-line-clamp: 8; line-clamp: 8; }

    .fab { position: fixed; bottom: 4.0rem; right: 2.5rem; width: 3.5rem; height: 3.5rem; border-radius: 1.25rem; background: #2563eb; color: white; border: none; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 16px -4px rgba(37, 99, 235, 0.4); cursor: pointer; transition: all 0.2s; z-index: 100; }
    .fab:hover { transform: scale(1.05) rotate(90deg); background: #1d4ed8; }
    .editor-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 1rem; backdrop-filter: blur(4px); }
    .editor-modal { background: white; width: 100%; max-width: 700px; border-radius: 1.25rem; display: flex; flex-direction: column; max-height: 90vh; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); overflow: hidden; }
    .editor-header { padding: 1.25rem; border-bottom: 1px solid #e4e4e7; display: flex; justify-content: space-between; align-items: center; }
    .editor-header h3 { margin: 0; font-size: 1.1rem; font-weight: 700; }
    .close-btn { background: transparent; border: none; padding: 0.5rem; cursor: pointer; color: #71717a; border-radius: 0.5rem; }
    .header-actions { display: flex; gap: 0.5rem; align-items: center; }
    .edit-action { color: #3b82f6; background: #eff6ff; border: none; cursor: pointer; padding: 0.5rem; border-radius: 0.5rem; }
    .editor-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; overflow-y: auto; }
    .viewer-meta { display: flex; flex-wrap: wrap; gap: 1.25rem; color: #71717a; font-size: 0.9rem; margin-bottom: 1.5rem; border-bottom: 1px solid #f4f4f5; padding-bottom: 1.25rem; }
    .meta-row { display: flex; align-items: center; gap: 0.5rem; }
    .meta-row.weather { color: #f59e0b; font-weight: 500; }
    .viewer-content { white-space: pre-wrap; line-height: 1.75; color: #18181b; font-size: 1.05rem; }
    .viewer-photos { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 0.75rem; margin-bottom: 1.5rem; }
    .viewer-photos img { width: 100%; aspect-ratio: 4/3; object-fit: cover; border-radius: 0.75rem; }
    .photo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 0.75rem; max-height: 220px; overflow-y: auto; padding: 0.5rem 0; }
    .photo-thumb { position: relative; aspect-ratio: 1; }
    .photo-thumb img { width: 100%; height: 100%; object-fit: cover; border-radius: 0.5rem; }
    .remove-photo { position: absolute; top: 0.25rem; right: 0.25rem; background: rgba(239, 68, 68, 0.95); color: white; border: none; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3); }
    .remove-photo:hover { background: #dc2626; transform: scale(1.1); box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4); }
    .add-photo-btn { aspect-ratio: 1; border: 2px dashed #e4e4e7; border-radius: 0.75rem; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #71717a; cursor: pointer; font-size: 0.8rem; gap: 0.25rem; }
    .row { display: flex; gap: 1rem; flex-wrap: wrap; }
    .field { display: flex; flex-direction: column; gap: 0.5rem; }
    fieldset { border: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; }
    legend { font-size: 0.85rem; font-weight: 600; color: #71717a; text-transform: uppercase; padding: 0; }
    .time-field { flex: 1; min-width: 130px; }
    .loc-field { flex: 1; min-width: 130px; }
    .field label { font-size: 0.85rem; font-weight: 600; color: #71717a; text-transform: uppercase; }
    .input-wrap { display: flex; align-items: center; gap: 0.5rem; background: #f8fafc; padding: 0.6rem 0.75rem; border-radius: 0.75rem; border: 1.5px solid #e2e8f0; }
    .input-wrap input { border: none; background: transparent; outline: none; font-size: 0.95rem; width: 100%; color: #ffffff; }
    .weather-options { display: flex; gap: 0.5rem; flex-wrap: wrap; padding: 8px 0px; }
    .weather-btn { background: #f8fafc; border: 1.5px solid #e2e8f0; padding: 0.6rem; border-radius: 0.75rem; color: #64748b; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .weather-btn.active { background: #eff6ff; color: #2563eb; border-color: #3b82f6; }
    .content-field { flex: 1; min-height: 150px; max-height: 300px; display: flex; flex-direction: column; }
    .content-field textarea { width: 100%; height: 100%; border: 1.5px solid #e2e8f0; resize: none; font-size: 1rem; line-height: 1.6; outline: none; font-family: inherit; color: #1e293b; padding: 1rem; background: #f8fafc; border-radius: 0.75rem; box-sizing: border-box; }
    .editor-footer { padding: 1.25rem; border-top: 1px solid #e4e4e7; display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
    .icon-btn.danger { background: #fee2e2; color: #ef4444; border: none; padding: 0.75rem 2rem; border-radius: 0.75rem; cursor: pointer; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
    .primary-btn { background: #2563eb; color: white; border: none; padding: 0.75rem 2rem; border-radius: 0.75rem; cursor: pointer; font-weight: 600; flex-shrink: 0; }

    @media (min-width: 768px) {
        header { flex-direction: row; justify-content: space-between; align-items: flex-end; padding: 1.5rem 2rem 1rem 2rem; }
        .header-title-row { justify-content: flex-start; }
        .export-btn { position: static; transform: none; }
        .journal-list { grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); padding: 2rem 2.5rem 6rem 2.5rem; gap: 2rem; }
    }

    @media (prefers-color-scheme: dark) {
        header { background: #18181b; border-bottom-color: #27272a; }
        .journal-card, .editor-modal { background: #18181b; border-color: #27272a; }
        .nav-btn { background: linear-gradient(135deg, #27272a 0%, #1f2937 100%); border-color: #3f3f46; color: #60a5fa; }
        .nav-btn:disabled { background: #3f3f46; color: #6b7280; border-color: #52525b; }
        .nav-btn:not(:disabled):hover { background: linear-gradient(135deg, #1f2937 0%, #111827 100%); border-color: #60a5fa; }
        .day-toggle { background: linear-gradient(135deg, #27272a 0%, #1f2937 100%); border-color: #3f3f46; color: #f4f4f5; }
        .day-toggle:hover { border-color: #60a5fa; background: linear-gradient(135deg, #1f2937 0%, #111827 100%); }
        .day-label { color: #f4f4f5; }
        .date-label { color: #a1a1aa; }
        .day-picker-dropdown { background: linear-gradient(135deg, #27272a 0%, #1f2937 100%); border-color: #3f3f46; }
        .day-option { color: #e4e4e7; }
        .day-option:hover { background: #3f3f46; }
        .day-option.selected { background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); color: #60a5fa; }
        .day-option .day-date { color: #a1a1aa; }
        .editor-header, .editor-footer, .input-wrap, .viewer-meta, .add-photo-btn { border-color: #27272a; }
        .input-wrap, .weather-btn { background: #27272a; border-color: #3f3f46; }
        .weather-btn.active { background: #1e3a8a; color: #60a5fa; border-color: #1e40af; }
        .icon-btn.danger { background: #450a0a; color: #fca5a5; }
        .content-field textarea { background: #27272a; color: #f4f4f5; border-color: #3f3f46; }
        .journal-card.no-photo { background: linear-gradient(135deg, #27272a 0%, #18181b 100%); }
        .export-btn { color: #a1a1aa; }
    }
</style>