// Names of the views inside a dashboard section, worded for that section
// (Work › "Visit list", Settings › "Follow-up rules"). Spread into the dashboard
// strings (strings.js); a view without its own entry here uses its shared
// view_<name> string. tests/dashboard-view-labels.test.mjs checks every view of
// every workspace has a name in both languages.

export const SECTION_VIEW_NAMES = {
  en: {
    view_settings_services: 'Services & prices',
    view_work_board: 'Board',
    view_work_viewings: 'Viewings',
    view_work_properties: 'Properties',
    view_work_followups: 'Follow-ups',
    view_work_calendar: 'Shoot calendar',
    view_work_resources: 'Resources',
    view_work_members: 'Members',
    view_work_classes: 'Classes',
    view_work_plans: 'Plans',
    view_work_schedule: 'Schedule',
    view_work_jobs: 'Jobs',
    view_work_contracts: 'Contracts',
    view_work_units: 'Units',
    view_work_visits: 'Visit list',
    view_work_services: 'Services',
    view_settings_rules: 'Follow-up rules',
    view_settings_team: 'Team',
    view_work_parts: 'Parts',
    view_work_projects: 'Projects',
    view_work_procurement: 'Procurement',
    view_settings_workshop: 'Workshop setup',
    view_settings_site: 'Project defaults',
    view_work_orders: 'Orders',
    view_work_products: 'Products',
    view_work_requests: 'Customer requests',
    view_work_repairs: 'Repairs',
    view_work_sales: 'Sales',
    view_work_devices: 'Devices',
    view_insights_overview: 'Overview',
    view_insights_expenses: 'Expenses',
  },
  ar: {
    view_settings_services: 'الخدمات والأسعار',
    view_work_board: 'اللوحة',
    view_work_viewings: 'المعاينات',
    view_work_properties: 'العقارات',
    view_work_followups: 'المتابعات',
    view_work_calendar: 'جدول التصوير',
    view_work_resources: 'الموارد',
    view_work_members: 'الأعضاء',
    view_work_classes: 'الحصص',
    view_work_plans: 'الخطط',
    view_work_schedule: 'الجدول',
    view_work_jobs: 'الأعمال',
    view_work_contracts: 'العقود',
    view_work_units: 'الوحدات',
    view_work_visits: 'قائمة الزيارات',
    view_work_services: 'الخدمات',
    view_settings_rules: 'قواعد المتابعة',
    view_settings_team: 'الفريق',
    view_work_parts: 'القطع',
    view_work_projects: 'المشاريع',
    view_work_procurement: 'المشتريات',
    view_settings_workshop: 'إعداد الورشة',
    view_settings_site: 'إعدادات المشاريع',
    view_work_orders: 'الطلبات',
    view_work_products: 'المنتجات',
    view_work_requests: 'طلبات العملاء',
    view_work_repairs: 'الصيانة',
    view_work_sales: 'المبيعات',
    view_work_devices: 'الأجهزة',
    view_insights_overview: 'نظرة عامة',
    view_insights_expenses: 'المصروفات',
  },
};

/**
 * A dashboard view's name: worded for its section when it has its own, else the view's shared name.
 * @param {{ t: (key: string) => string }} s strings from createStrings
 * @param {string} tab
 * @param {string} view
 */
export function viewLabel(s, tab, view) {
  const own = s.t(`view_${tab}_${view}`);
  return own === `view_${tab}_${view}` ? s.t(`view_${view}`) : own;
}
