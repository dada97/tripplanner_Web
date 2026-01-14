import { type Trip, currencySymbols, type Currency } from '../stores/tripStore.svelte';
import { i18n } from '../stores/i18nStore.svelte';

export function exportTripToHtml(trip: Trip): string {
  const styles = `
    :root {
      --bg: #ffffff;
      --text: #333333;
      --heading: #111111;
      --card-bg: #f9f9f9;
      --card-border-l: #3b82f6;
      --meta: #666666;
      --border: #ccc;
      --tag-bg: #e0e7ff;
      --tag-text: #3730a3;
      --summary-bg: #f0fdf4;
      --summary-border: #bbf7d0;
      --gen-bg: #fff7ed;
      --gen-border: #ffedd5;
      --note-bg: #fff;
      --note-border: #eee;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #18181b;
        --text: #e4e4e7;
        --heading: #ffffff;
        --card-bg: #27272a;
        --card-border-l: #60a5fa;
        --meta: #a1a1aa;
        --border: #3f3f46;
        --tag-bg: #312e81;
        --tag-text: #e0e7ff;
        --summary-bg: #064e3b;
        --summary-border: #065f46;
        --gen-bg: #431407;
        --gen-border: #571e0c;
        --note-bg: #18181b;
        --note-border: #3f3f46;
      }
    }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: var(--text); background: var(--bg); max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { border-bottom: 2px solid var(--heading); padding-bottom: 10px; margin-bottom: 10px; color: var(--heading); }
    h2 { margin-top: 30px; border-bottom: 1px solid var(--border); padding-bottom: 5px; color: var(--heading); font-size: 1.5em; }
    h3 { margin-top: 20px; color: var(--heading); font-size: 1.2em; }
    .trip-meta { color: var(--meta); margin-bottom: 30px; font-size: 1.1em; }
    .day-section { margin-bottom: 40px; page-break-inside: avoid; }
    .activity-item { margin-bottom: 15px; padding: 15px; background: var(--card-bg); border-left: 4px solid var(--card-border-l); border-radius: 4px; }
    .activity-header { display: flex; justify-content: space-between; align-items: baseline; font-weight: bold; font-size: 1.1em; margin-bottom: 5px; color: var(--heading); }
    .activity-details { font-size: 0.95em; color: var(--meta); }
    .detail-row { margin-bottom: 4px; }
    .expenses-section { margin-top: 10px; font-size: 0.9em; border-top: 1px dashed var(--border); padding-top: 5px; }
    .expense-tag { display: inline-block; background: var(--tag-bg); color: var(--tag-text); padding: 2px 8px; border-radius: 12px; margin-right: 5px; font-size: 0.85em; }
    .notes { font-style: italic; color: var(--meta); margin-top: 8px; background: var(--note-bg); padding: 8px; border-radius: 4px; border: 1px solid var(--note-border); }
    .total-summary { background: var(--summary-bg); border: 1px solid var(--summary-border); padding: 20px; border-radius: 8px; margin-bottom: 30px; }
    .general-expenses { background: var(--gen-bg); border: 1px solid var(--gen-border); padding: 20px; border-radius: 8px; margin-bottom: 30px; }
    ul { margin: 0; padding-left: 20px; }
    li { margin-bottom: 5px; }
    .print-button { display: none; }
    @media print {
      body { max-width: 100%; padding: 0; background: white; color: black; }
      .activity-item { break-inside: avoid; border: 1px solid #ddd; border-left: 4px solid #3b82f6; background: white; }
      .print-hide { display: none; }
      h1, h2, h3 { color: black; border-color: black; }
      .total-summary, .general-expenses { border: 1px solid #ddd; background: white; }
    }
  `;

  const formatDate = (dateStr: string) => {
    try {
        return new Date(dateStr).toLocaleDateString(i18n.lang === 'zh' ? 'zh-TW' : undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
        return dateStr;
    }
  };

  const formatCurrency = (amount: number, currency: Currency) => {
    return `${currencySymbols[currency] || currency} ${amount.toFixed(2)}`;
  };

  // Calculate totals
  const totals: Record<string, number> = {};
  
  // General expenses
  trip.generalExpenses?.forEach(e => {
    const curr = e.currency || trip.currency || 'USD';
    totals[curr] = (totals[curr] || 0) + e.amount;
  });

  // Activity expenses
  trip.days.forEach(day => {
    day.activities.forEach(act => {
      act.expenses.forEach(e => {
        const curr = e.currency || trip.currency || 'USD';
        totals[curr] = (totals[curr] || 0) + e.amount;
      });
    });
  });

  const totalsHtml = Object.entries(totals)
    .map(([curr, amt]) => `<div style="font-size: 1.2em; font-weight: bold;">${formatCurrency(amt, curr as Currency)}</div>`)
    .join('');

  let daysHtml = '';
  trip.days.forEach((day, index) => {
    let activitiesHtml = '';
    if (day.activities.length === 0) {
      activitiesHtml = `<p><em>${i18n.t('trip.emptyActivities')}</em></p>`;
    } else {
      activitiesHtml = day.activities.map(act => {
        const expenses = act.expenses.map(e => 
          `<span class="expense-tag">${e.name || i18n.t(`cat.${e.category}`)}: ${formatCurrency(e.amount, e.currency || trip.currency || 'USD')}</span>`
        ).join('');

        return `
          <div class="activity-item">
            <div class="activity-header">
              <span>${act.name}</span>
              ${act.estimatedCost ? `<span style="color: var(--meta); font-weight: normal; font-size: 0.9em;">Est: ${formatCurrency(act.estimatedCost, trip.currency)}</span>` : ''}
            </div>
            <div class="activity-details">
              ${act.address ? `<div class="detail-row">📍 ${act.address}</div>` : ''}
              ${act.notes ? `<div class="notes">📝 ${act.notes}</div>` : ''}
              ${expenses ? `<div class="expenses-section">💰 ${expenses}</div>` : ''}
            </div>
          </div>
        `;
      }).join('');
    }

    daysHtml += `
      <div class="day-section">
        <h2>${i18n.day(index + 1)}: ${formatDate(day.date)}</h2>
        ${activitiesHtml}
      </div>
    `;
  });

  // General Expenses Section
  let generalExpensesHtml = '';
  if (trip.generalExpenses && trip.generalExpenses.length > 0) {
      const expensesList = trip.generalExpenses.map(e => 
          `<li><strong>${e.name || i18n.t(`cat.${e.category}`)}</strong>: ${formatCurrency(e.amount, e.currency || trip.currency || 'USD')} <span style="color: var(--meta); font-size: 0.9em;">(${i18n.t(`cat.${e.category}`)})</span></li>`
      ).join('');
      generalExpensesHtml = `
        <div class="general-expenses">
            <h3>${i18n.t('finance.view.all')} ${i18n.t('finance.finances')}</h3>
            <ul>${expensesList}</ul>
        </div>
      `;
  }

  const titlePrefix = i18n.lang === 'zh' ? '行程：' : 'Trip to ';
  const metaPrefix = i18n.lang === 'zh' ? '日期：' : 'Date: ';

  return `
    <!DOCTYPE html>
    <html lang="${i18n.lang}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="color-scheme" content="light dark">
      <title>${trip.destination} - Itinerary</title>
      <style>${styles}</style>
    </head>
    <body>
      <h1>${titlePrefix}${trip.destination}</h1>
      <div class="trip-meta">
        ${metaPrefix}${formatDate(trip.startDate)} - ${formatDate(trip.endDate)}
      </div>

      <div class="total-summary">
        <h3>${i18n.t('finance.totalActual')}</h3>
        ${totalsHtml || i18n.t('modal.noExpenses')}
      </div>

      ${generalExpensesHtml}
      ${daysHtml}

      <div class="print-hide" style="margin-top: 50px; text-align: center; color: var(--meta); font-size: 0.8em;">
        Generated by TripPlanner ${new Date().toLocaleDateString()}
      </div>
    </body>
    </html>
  `;
}