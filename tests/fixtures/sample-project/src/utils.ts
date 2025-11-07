export function formatDate(date: Date): string {
  return date.toISOString();
}

export function calculateAge(birthDate: Date): number {
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  return age;
}
