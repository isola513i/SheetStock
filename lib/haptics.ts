export function softHaptic() {
  if (typeof window !== 'undefined' && window.localStorage.getItem('sheetstock-haptics') === 'off') {
    return;
  }
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(20);
  }
}
