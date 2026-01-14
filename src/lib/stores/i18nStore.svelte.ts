export type Language = "en" | "zh";

const translations = {
  en: {
    "nav.myTrip": "My Trip",
    "nav.expenses": "Expenses",
    "nav.journal": "Journal",
    "nav.travelAssistant": "Travel Assistant",
    "finance.selectTrip": "Select a Trip to View Finances",
    "finance.noTrips": 'No trips found. Go to "My Trip" to create one.',
    "finance.back": "All Trips",
    "finance.finances": "Finances",
    "finance.view.all": "All Trip",
    "finance.view.daily": "Daily",
    "finance.totalEstimated": "Total Estimated",
    "finance.totalActual": "Total Actual Spent",
    "finance.breakdown": "Category Breakdown",
    "finance.detailed": "Detailed Expenses",
    "finance.day": "Day",

    "journal.selectTrip": "Select a Trip to Write Journal",
    "journal.back": "All Trips",
    "journal.title": "Journal",
    "journal.placeholder": "Write about your day...",
    "journal.weather": "Weather",
    "journal.location": "Location",
    "journal.locationPlaceholder": "Where are you today?",
    "journal.sunny": "Sunny",
    "journal.cloudy": "Cloudy",
    "journal.rainy": "Rainy",
    "journal.snowy": "Snowy",
    "journal.windy": "Windy",
    "journal.addEntry": "Add Entry",
    "journal.editEntry": "Edit Entry",
    "journal.time": "Time",
    "journal.delete": "Delete",
    "journal.empty": "No journal entries yet. Tap + to add one!",
    "journal.photos": "Photos",
    "journal.addPhotos": "Add Photos",
    "journal.viewEntry": "View Entry",
    "journal.edit": "Edit",
    "journal.close": "Close",
    "journal.export": "Export as HTML",

    "cat.transport": "Transport",
    "cat.food": "Food",
    "cat.stay": "Accommodation",
    "cat.shopping": "Shopping",
    "cat.medical": "Medical",
    "cat.other": "Other",

    "trip.myTrips": "My Trips",
    "trip.planNew": "Plan a new trip",
    "trip.destination": "Destination",
    "trip.startDate": "Start Date",
    "trip.endDate": "End Date",
    "trip.currency": "Currency",
    "trip.create": "Create Trip",
    "trip.cancel": "Cancel",
    "trip.newTrip": "New Trip",
    "trip.back": "Trips",
    "trip.addActivity": "Add Activity",
    "trip.emptyActivities":
      "No activities yet. Click 'Add Activity' to start planning!",
    "trip.editPlan": "Edit Plan",
    "trip.googleMaps": "Google Maps",
    "trip.backToList": "Back to list",
    "trip.newActivity": "New Activity",
    "trip.editActivity": "Edit Activity",
    "trip.searchLocation": "Search Location",
    "trip.name": "Name",
    "trip.notes": "Notes",
    "trip.totalActual": "Total Actual:",
    "trip.deleteActivity": "Delete Activity",
    "trip.saveChanges": "Save Changes",
    "trip.expenses": "Expenses",

    "modal.addExpense": "Add Expense",
    "modal.editExpense": "Edit Expense",
    "modal.amount": "Amount",
    "modal.save": "Save",
    "modal.expensesFor": "Expenses for",
    "modal.noExpenses": "No expenses logged for this activity.",
    "modal.addNewExpense": "Add New Expense",

    "csv.export": "Export CSV",
    "csv.summary": "Summary",
    "csv.details": "Details",
    "csv.headers.date": "Date",
    "csv.headers.day": "Day",
    "csv.headers.activity": "Activity",
    "csv.headers.category": "Category",
    "csv.headers.currency": "Currency",
    "csv.headers.amount": "Amount",
    "csv.headers.notes": "Notes",
    "csv.headers.total": "Total",

    "nav.back": "Back",
    "trip.planNewAdventure": "Plan a New Adventure",
    "trip.fillBasicInfo":
      "Fill in basic trip information to start your journey",
    "trip.basicInfo": "Basic Information",
    "trip.dates": "Dates",
    "trip.otherSettings": "Other Settings",
    "trip.startYourPlan": "Start Planning",
    "trip.empty": "No trips yet",
    "trip.days": "days",
    "trip.deleteTrip": "Delete Trip",
    "trip.showMap": "Show Map",
    "trip.hideMap": "Hide Map",
  },
  zh: {
    "nav.myTrip": "我的行程",
    "nav.expenses": "費用",
    "nav.journal": "旅遊日記",
    "nav.travelAssistant": "旅遊助手",
    "finance.selectTrip": "選擇行程以查看費用",
    "finance.noTrips": "沒有找到行程。請前往「我的行程」建立一個。",
    "finance.back": "全部行程",
    "finance.finances": "費用統計",
    "finance.view.all": "全部行程",
    "finance.view.daily": "每日",
    "finance.totalEstimated": "預估總花費",
    "finance.totalActual": "實際總花費",
    "finance.breakdown": "消費類別統計",
    "finance.detailed": "消費明細",
    "finance.day": "第",

    "journal.selectTrip": "選擇行程以撰寫日記",
    "journal.back": "全部行程",
    "journal.title": "旅遊日記",
    "journal.placeholder": "記錄今天發生的故事...",
    "journal.weather": "天氣",
    "journal.location": "地點",
    "journal.locationPlaceholder": "今天在哪裡？",
    "journal.sunny": "晴天",
    "journal.cloudy": "多雲",
    "journal.rainy": "雨天",
    "journal.snowy": "雪天",
    "journal.windy": "刮風",
    "journal.addEntry": "新增日記",
    "journal.editEntry": "編輯日記",
    "journal.time": "時間",
    "journal.delete": "刪除",
    "journal.empty": "尚無日記。點擊 + 新增一篇！",
    "journal.photos": "照片",
    "journal.addPhotos": "新增照片",
    "journal.viewEntry": "查看日記",
    "journal.edit": "編輯",
    "journal.close": "關閉",
    "journal.export": "匯出成網頁",

    "cat.transport": "交通",
    "cat.food": "食物",
    "cat.stay": "住宿",
    "cat.shopping": "購物",
    "cat.medical": "醫療",
    "cat.other": "其他",

    "trip.myTrips": "我的行程",
    "trip.planNew": "建立新行程",
    "trip.destination": "目的地",
    "trip.startDate": "開始日期",
    "trip.endDate": "結束日期",
    "trip.currency": "貨幣",
    "trip.create": "建立行程",
    "trip.cancel": "取消",
    "trip.newTrip": "新行程",
    "trip.back": "行程列表",
    "trip.addActivity": "新增活動",
    "trip.emptyActivities": "尚無活動。點擊「新增活動」開始規劃！",
    "trip.editPlan": "編輯計畫",
    "trip.googleMaps": "Google 地圖",
    "trip.backToList": "返回列表",
    "trip.newActivity": "新增活動",
    "trip.editActivity": "編輯活動",
    "trip.searchLocation": "搜尋地點",
    "trip.name": "名稱",
    "trip.notes": "筆記",
    "trip.totalActual": "實際總計:",
    "trip.deleteActivity": "刪除活動",
    "trip.saveChanges": "儲存變更",
    "trip.expenses": "費用",

    "modal.addExpense": "新增費用",
    "modal.editExpense": "編輯費用",
    "modal.amount": "金額",
    "modal.save": "儲存",
    "modal.expensesFor": "的費用",
    "modal.noExpenses": "此活動尚無費用記錄。",
    "modal.addNewExpense": "新增費用項目",

    "csv.export": "匯出 CSV",
    "csv.summary": "消費統計",
    "csv.details": "詳細明細",
    "csv.headers.date": "日期",
    "csv.headers.day": "天數",
    "csv.headers.activity": "活動名稱",
    "csv.headers.category": "類別",
    "csv.headers.currency": "幣別",
    "csv.headers.amount": "金額",
    "csv.headers.notes": "備註",
    "csv.headers.total": "總計",

    "nav.back": "返回",
    "trip.planNewAdventure": "規劃新的冒險",
    "trip.fillBasicInfo": "填寫行程基本資訊開始您的旅程",
    "trip.basicInfo": "基本資訊",
    "trip.dates": "日期",
    "trip.otherSettings": "其他設定",
    "trip.startYourPlan": "開始規劃",
    "trip.empty": "暫無行程",
    "trip.days": "天",
    "trip.deleteTrip": "刪除行程",
    "trip.showMap": "顯示地圖",
    "trip.hideMap": "隱藏地圖",
  },
};

class I18nStore {
  lang = $state<Language>("en");

  constructor() {
    if (typeof localStorage !== "undefined") {
      const stored = localStorage.getItem("app_lang");
      if (stored === "en" || stored === "zh") {
        this.lang = stored;
      }
    }
  }

  toggle() {
    this.lang = this.lang === "en" ? "zh" : "en";
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("app_lang", this.lang);
    }
  }

  t(key: string) {
    return (
      translations[this.lang][key as keyof (typeof translations)["en"]] || key
    );
  }

  day(index: number | string) {
    return this.lang === "zh" ? `第 ${index} 天` : `Day ${index}`;
  }
}

export const i18n = new I18nStore();
