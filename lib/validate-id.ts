export function isValidId(id: any): id is number {
  const num = Number(id);
  return !isNaN(num) && Number.isInteger(num) && num > 0;
}
