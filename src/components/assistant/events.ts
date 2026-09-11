export const ASSISTANT_OPEN_EVENT = "encore:assistant-open";
export const ASSISTANT_OPEN_ATTRIBUTE = "data-assistant-open";

export function openAssistant() {
  window.dispatchEvent(new Event(ASSISTANT_OPEN_EVENT));
}
