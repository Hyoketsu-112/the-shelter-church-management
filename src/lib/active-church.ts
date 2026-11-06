import { getSavedChurchId } from "./workspace";

/** Returns the location currently selected in the application, falling back to
 * the user's assigned church. Keeping this rule in one place prevents pages
 * from accidentally reading and writing different locations. */
export function resolveActiveChurchId(profileChurchId: string | null | undefined) {
  return getSavedChurchId() || profileChurchId || null;
}

export function calculateAge(dateOfBirth: string, onDate = new Date()) {
  const birth = new Date(`${dateOfBirth}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  let age = onDate.getFullYear() - birth.getFullYear();
  const month = onDate.getMonth() - birth.getMonth();
  if (month < 0 || (month === 0 && onDate.getDate() < birth.getDate())) age--;
  return age;
}
