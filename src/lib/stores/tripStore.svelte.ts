export type ExpenseCategory = 'transport' | 'food' | 'stay' | 'shopping' | 'other';

export interface Activity {
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    estimatedCost: number;
    actualCost: number;
    category: ExpenseCategory;
    transportType: 'walk' | 'car' | 'public' | 'other';
    notes: string;
    completed: boolean;
}

export interface DaySchedule {
    date: string;
    activities: Activity[];
}

export interface Trip {
    id: string;
    destination: string;
    startDate: string;
    endDate: string;
    days: DaySchedule[];
}

class TripStore {
    trips = $state<Trip[]>([]);

    constructor() {
        if (typeof localStorage !== 'undefined') {
            const stored = localStorage.getItem('trips');
            if (stored) {
                try {
                    this.trips = JSON.parse(stored);
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
        }
    
        export const tripStore = new TripStore();
    
        export function generateId(): string {
            if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                return crypto.randomUUID();
            }
            return Date.now().toString(36) + Math.random().toString(36).substring(2);
        }
