// Month names follow the Mumineen calendar (English, from mumineen_calendar_js).
// The Arabic forms are copied from the month headings of the printed 1448H planner.
export const MONTH_EN = [
  'Moharram al-Haraam', 'Safar al-Muzaffar', 'Rabi al-Awwal', 'Rabi al-Aakhar',
  'Jumada al-Ula', 'Jumada al-Ukhra', 'Rajab al-Asab', 'Shabaan al-Karim',
  'Ramadaan al-Moazzam', 'Shawwal al-Mukarram', 'Zilqadah al-Haraam', 'Zilhaj al-Haraam',
];
export const MONTH_EN_SHORT = [
  'Moharram', 'Safar', 'Rabi I', 'Rabi II', 'Jumada I', 'Jumada II',
  'Rajab', 'Shabaan', 'Ramadaan', 'Shawwal', 'Zilqadah', 'Zilhaj',
];
export const MONTH_AR = [
  'المحرم الحرام', 'صفر المظفر', 'ربيع الأول', 'ربيع الآخر',
  'جمادى الأولى', 'جمادى الأخرى', 'رجب الأصب', 'شعبان الكريم',
  'رمضان المعظم', 'شوال المكرم', 'ذي القعدة الحرام', 'ذي الحجة الحرام',
];
export const WEEKDAY_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const WEEKDAY_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
export const GREG_MONTH_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
export const GREG_MONTH_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
/** Month heading as printed on the 1448H planner: «شهر <month> سنة <year>». */
export const monthHeadingAr = (month: number, year: number) => `شهر ${MONTH_AR[month - 1]} سنة ${String(year).replace(/\d/g, (d) => AR_DIGITS[+d])}`;
