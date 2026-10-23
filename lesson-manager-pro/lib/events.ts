// Basit bir olay yayını: herhangi bir yerde ders/plan verisi değiştiğinde
// bunu dinleyen bileşenler (ör. sol menüdeki Ders Akışı) sayfa yenilemeden
// kendini güncelleyebilsin diye kullanılır.

const EVENT_NAME = "lessons-changed";

export function emitLessonsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVENT_NAME));
  }
}

export function onLessonsChanged(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT_NAME, callback);
  return () => window.removeEventListener(EVENT_NAME, callback);
}
