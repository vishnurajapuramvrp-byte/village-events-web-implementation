export function currentEventYear(now = new Date()) {
  return now.getFullYear();
}

export function selectableEventYears(now = new Date()) {
  const current = currentEventYear(now);
  const years: number[] = [];
  for (let year = current + 2; year >= current - 7; year -= 1) {
    years.push(year);
  }
  return years;
}

export function parseEventYear(value: FormDataEntryValue | string | number | null | undefined) {
  const year = Number(String(value ?? "").trim());
  if (!Number.isInteger(year) || year < 1990 || year > 2200) {
    throw new Error("Select a valid event year.");
  }
  return year;
}

export function yearFromDate(value: Date) {
  return value.getFullYear();
}
