export type Workspace = "junior";
export type LocationKey = "anthony" | "okota" | "community";

export const LOCATIONS = [
  { key: "anthony" as const, name: "The Shelter Anthony" },
  { key: "okota" as const, name: "The Shelter Okota" },
  { key: "community" as const, name: "The Shelter Community" },
];

export function getSavedWorkspace(): Workspace {
  return "junior";
}
export function saveWorkspace() {
  if (typeof window !== "undefined") localStorage.setItem("shelter_workspace", "junior");
}
export function getSavedChurchId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("shelter_church_id");
}
export function saveChurch(id: string) {
  localStorage.setItem("shelter_church_id", id);
  window.dispatchEvent(new Event("shelter-context-change"));
}
