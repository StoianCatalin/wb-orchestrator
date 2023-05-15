
export default function getDocumentId() {
  const currentDay = new Date().getDate();
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const threeRandomDigits = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${currentDay.toString().padStart(2, '0')}${currentMonth.toString().padStart(2, '0')}${currentYear}${threeRandomDigits}`;
}
