export type Language = 'en' | 'zh';

const translations = {
    en: {
        'nav.myTrip': 'My Trip',
        'nav.expenses': 'Expenses',
        'nav.travelAssistant': 'Travel Assistant',
        'finance.selectTrip': 'Select a Trip to View Finances',
        'finance.noTrips': 'No trips found. Go to "My Trip" to create one.',
        'finance.back': 'All Trips',
        'finance.finances': 'Finances',
        'finance.view.all': 'All Trip',
        'finance.view.daily': 'Daily',
        'finance.totalEstimated': 'Total Estimated',
        'finance.totalActual': 'Total Actual Spent',
        'finance.breakdown': 'Category Breakdown',
        'finance.detailed': 'Detailed Expenses',
        'finance.day': 'Day',
        
        'cat.transport': 'Transport',
        'cat.food': 'Food',
        'cat.stay': 'Accommodation',
        'cat.shopping': 'Shopping',
        'cat.other': 'Other',

        'trip.myTrips': 'My Trips',
        'trip.planNew': 'Plan a new trip',
        'trip.destination': 'Destination',
        'trip.startDate': 'Start Date',
        'trip.endDate': 'End Date',
        'trip.currency': 'Currency',
        'trip.create': 'Create Trip',
        'trip.cancel': 'Cancel',
        'trip.newTrip': 'New Trip',
        'trip.back': 'Trips',
        'trip.addActivity': 'Add Activity',
        'trip.emptyActivities': "No activities yet. Click 'Add Activity' to start planning!",
        'trip.editPlan': 'Edit Plan',
        'trip.googleMaps': 'Google Maps',
        'trip.backToList': 'Back to list',
        'trip.newActivity': 'New Activity',
        'trip.editActivity': 'Edit Activity',
        'trip.searchLocation': 'Search Location',
        'trip.name': 'Name',
        'trip.notes': 'Notes',
        'trip.totalActual': 'Total Actual:',
        'trip.deleteActivity': 'Delete Activity',
        'trip.saveChanges': 'Save Changes',
        'trip.expenses': 'Expenses',
        
        'modal.addExpense': 'Add Expense',
        'modal.editExpense': 'Edit Expense',
        'modal.amount': 'Amount',
        'modal.save': 'Save',
        'modal.expensesFor': 'Expenses for',
        'modal.noExpenses': 'No expenses logged for this activity.',
        'modal.addNewExpense': 'Add New Expense'
    },
    zh: {
        'nav.myTrip': '我的行程',
        'nav.expenses': '費用',
        'nav.travelAssistant': '旅遊助手',
        'finance.selectTrip': '選擇行程以查看費用',
        'finance.noTrips': '沒有找到行程。請前往「我的行程」建立一個。',
        'finance.back': '全部行程',
        'finance.finances': '費用統計',
        'finance.view.all': '全部行程',
        'finance.view.daily': '每日',
        'finance.totalEstimated': '預估總花費',
        'finance.totalActual': '實際總花費',
        'finance.breakdown': '消費類別統計',
        'finance.detailed': '消費明細',
        'finance.day': '第',
        
        'cat.transport': '交通',
        'cat.food': '食物',
        'cat.stay': '住宿',
        'cat.shopping': '購物',
        'cat.other': '其他',

        'trip.myTrips': '我的行程',
        'trip.planNew': '建立新行程',
        'trip.destination': '目的地',
        'trip.startDate': '開始日期',
        'trip.endDate': '結束日期',
        'trip.currency': '貨幣',
        'trip.create': '建立行程',
        'trip.cancel': '取消',
        'trip.newTrip': '新行程',
        'trip.back': '行程列表',
        'trip.addActivity': '新增活動',
        'trip.emptyActivities': "尚無活動。點擊「新增活動」開始規劃！",
        'trip.editPlan': '編輯計畫',
        'trip.googleMaps': 'Google 地圖',
        'trip.backToList': '返回列表',
        'trip.newActivity': '新增活動',
        'trip.editActivity': '編輯活動',
        'trip.searchLocation': '搜尋地點',
        'trip.name': '名稱',
        'trip.notes': '筆記',
        'trip.totalActual': '實際總計:',
        'trip.deleteActivity': '刪除活動',
        'trip.saveChanges': '儲存變更',
        'trip.expenses': '費用',
        
        'modal.addExpense': '新增費用',
        'modal.editExpense': '編輯費用',
        'modal.amount': '金額',
        'modal.save': '儲存',
        'modal.expensesFor': '的費用',
        'modal.noExpenses': '此活動尚無費用記錄。',
        'modal.addNewExpense': '新增費用項目'
    }
};

class I18nStore {
    lang = $state<Language>('en');

    constructor() {
        if (typeof localStorage !== 'undefined') {
            const stored = localStorage.getItem('app_lang');
            if (stored === 'en' || stored === 'zh') {
                this.lang = stored;
            }
        }
    }

    toggle() {
        this.lang = this.lang === 'en' ? 'zh' : 'en';
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('app_lang', this.lang);
        }
    }

    t(key: string) {
        return translations[this.lang][key as keyof typeof translations['en']] || key;
    }
}

export const i18n = new I18nStore();
