export type ExpenseCategory = 'transport' | 'food' | 'stay' | 'shopping' | 'other';
export type Currency = 'TWD' | 'JPY' | 'USD';
export const currencies: Currency[] = ['TWD', 'JPY', 'USD'];
export const currencySymbols: { [key in Currency]: string } = {
    TWD: 'NT$',
    JPY: '¥',
    USD: '$',
};

export interface Expense {
    id: string;
    amount: number;
    category: ExpenseCategory;
    date: string;
    currency: Currency;
}

export interface JournalEntry {
    id: string;
    timestamp: string; // "HH:MM"
    content: string;
    weather: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'windy' | null;
    location?: string;
    photos: string[]; // Base64 strings
}

export interface Activity {
    id:string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    estimatedCost: number;
    expenses: Expense[];
    category?: ExpenseCategory;
    transportType: 'walk' | 'car' | 'public' | 'other';
    notes: string;
    completed: boolean;
}

export interface DaySchedule {
    date: string;
    activities: Activity[];
    journals: JournalEntry[];
}

export interface Trip {
    id: string;
    destination: string;
    startDate: string;
    endDate: string;
    days: DaySchedule[];
    currency: Currency;
}

class TripStore {
    trips = $state<Trip[]>([]);

    constructor() {
        if (typeof localStorage !== 'undefined') {
            const stored = localStorage.getItem('trips');
            if (stored) {
                try {
                    const parsedTrips = JSON.parse(stored);
                    // Data migration
                    parsedTrips.forEach((trip: Trip) => {
                        if (!trip.currency) {
                            trip.currency = 'USD'; // Default currency for old data
                        }
                        trip.days.forEach((day: any) => {
                            // Migrate old single journal to array
                            if (!day.journals) {
                                day.journals = [];
                                if (day.journal && (day.journal.content || day.journal.location)) {
                                    day.journals.push({
                                        id: generateId(),
                                        timestamp: '12:00', // Default time
                                        content: day.journal.content || '',
                                        weather: day.journal.weather || null,
                                        location: day.journal.location || '',
                                        photos: []
                                    });
                                }
                                delete day.journal;
                            }
                            
                            // Ensure photos array exists for existing journals
                            day.journals.forEach((j: any) => {
                                if (!j.photos) j.photos = [];
                            });
                            
                            day.activities.forEach((act: any) => {
                                if (act.actualCost && !act.expenses) {
                                    act.expenses = [{
                                        id: generateId(),
                                        amount: act.actualCost,
                                        category: act.category || 'other',
                                        date: day.date,
                                        currency: trip.currency
                                    }];
                                } else if (!act.expenses) {
                                    act.expenses = [];
                                }
                                // Migrate currency for existing expenses
                                act.expenses.forEach((exp: Expense) => {
                                    if (!exp.currency) {
                                        exp.currency = trip.currency;
                                    }
                                });
                                delete act.actualCost;
                                delete act.category;
                            });
                        });
                    });
                    this.trips = parsedTrips;
                } catch (e) {
                    console.error('Failed to parse trips', e);
                }
            }

            $effect.root(() => {
                $effect(() => {
                    localStorage.setItem('trips', JSON.stringify(this.trips));
                });
            });
        }
    }

    addTrip(trip: Trip) {
        // Init journals for new trip
        trip.days.forEach(day => {
            if (!day.journals) day.journals = [];
        });
        this.trips.push(trip);
    }

    removeTrip(id: string) {
        this.trips = this.trips.filter(t => t.id !== id);
    }

        updateTrip(trip: Trip) {
                const index = this.trips.findIndex(t => t.id === trip.id);
                if (index !== -1) {
                    this.trips[index] = trip;
                }
            }
            
            getTrip(id: string) {
                return this.trips.find(t => t.id === id);
            }
            
            addJournalEntry(tripId: string, dayIndex: number, entry: JournalEntry) {
                const trip = this.getTrip(tripId);
                if (trip && trip.days[dayIndex]) {
                    trip.days[dayIndex].journals.push(entry);
                    // Sort by timestamp
                    trip.days[dayIndex].journals.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
                }
            }

            updateJournalEntry(tripId: string, dayIndex: number, entry: JournalEntry) {
                const trip = this.getTrip(tripId);
                if (trip && trip.days[dayIndex]) {
                    const index = trip.days[dayIndex].journals.findIndex(j => j.id === entry.id);
                    if (index !== -1) {
                        trip.days[dayIndex].journals[index] = entry;
                        // Sort by timestamp
                        trip.days[dayIndex].journals.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
                    }
                }
            }

            removeJournalEntry(tripId: string, dayIndex: number, entryId: string) {
                const trip = this.getTrip(tripId);
                if (trip && trip.days[dayIndex]) {
                    trip.days[dayIndex].journals = trip.days[dayIndex].journals.filter(j => j.id !== entryId);
                }
            }
    
                    addActivity(tripId: string, dayIndex: number, activity: Activity) {
                        const trip = this.getTrip(tripId);
                        if (trip && trip.days[dayIndex]) {
                            trip.days[dayIndex].activities.push(activity);
                        }
                    }
            
                    updateActivity(tripId: string, dayIndex: number, activity: Activity) {
                        const trip = this.getTrip(tripId);
                        if (trip && trip.days[dayIndex]) {
                            const index = trip.days[dayIndex].activities.findIndex(a => a.id === activity.id);
                            if (index !== -1) {
                                trip.days[dayIndex].activities[index] = activity;
                            }
                        }
                    }
            
                    removeActivity(tripId: string, dayIndex: number, activityIndex: number) {                const trip = this.getTrip(tripId);
                if (trip && trip.days[dayIndex]) {
                    trip.days[dayIndex].activities.splice(activityIndex, 1);
                }
            }

            addExpense(tripId: string, dayIndex: number, activityId: string, expense: Expense) {
                const trip = this.getTrip(tripId);
                if (trip) {
                    const activity = trip.days[dayIndex]?.activities.find(a => a.id === activityId);
                    if (activity) {
                        activity.expenses.push(expense);
                    }
                }
            }
        
            updateExpense(tripId: string, dayIndex: number, activityId: string, expense: Expense) {
                const trip = this.getTrip(tripId);
                if (trip) {
                    const activity = trip.days[dayIndex]?.activities.find(a => a.id === activityId);
                    if (activity) {
                        const index = activity.expenses.findIndex(e => e.id === expense.id);
                        if (index !== -1) {
                            activity.expenses[index] = expense;
                        }
                    }
                }
            }
        
            removeExpense(tripId: string, dayIndex: number, activityId: string, expenseId: string) {
                const trip = this.getTrip(tripId);
                if (trip) {
                    const activity = trip.days[dayIndex]?.activities.find(a => a.id === activityId);
                    if (activity) {
                        activity.expenses = activity.expenses.filter(e => e.id !== expenseId);
                    }
                }
            }
        }
    
        export const tripStore = new TripStore();
    
        export function generateId(): string {
            if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                return crypto.randomUUID();
            }
            return Date.now().toString(36) + Math.random().toString(36).substring(2);
        }
