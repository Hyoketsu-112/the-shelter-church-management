export type Workspace = "junior" | "main";
export type LocationKey = "anthony" | "okota" | "community";

/** The only active church locations supported by the application. */
export const LOCATIONS = [
  { key: "anthony" as const, name: "The Shelter Anthony" },
  { key: "community" as const, name: "The Shelter Community" },
  { key: "okota" as const, name: "The Shelter Okota" },
];

export function getSavedWorkspace(): Workspace {
  if (typeof window === "undefined") return "junior";
  return localStorage.getItem("shelter_workspace") === "main" ? "main" : "junior";
}
export function saveWorkspace(workspace: Workspace) {
  localStorage.setItem("shelter_workspace", workspace);
  window.dispatchEvent(new Event("shelter-context-change"));
}
export function getSavedChurchId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("shelter_church_id");
}
export function saveChurch(id: string) {
  localStorage.setItem("shelter_church_id", id);
  window.dispatchEvent(new Event("shelter-context-change"));
}
