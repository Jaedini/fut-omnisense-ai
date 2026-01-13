const KEY = "fut_consent_v1";

export function getConsent(): any | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setConsent(data: any) {
  localStorage.setItem(KEY, JSON.stringify(data));
}
