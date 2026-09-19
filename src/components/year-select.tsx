import { selectableEventYears } from "@/lib/event-year";
import { cn } from "@/lib/utils";

export function YearSelect({
  id = "year",
  name = "year",
  defaultValue,
  className,
}: {
  id?: string;
  name?: string;
  defaultValue: number;
  className?: string;
}) {
  const years = selectableEventYears();
  const options = years.includes(defaultValue) ? years : [defaultValue, ...years].sort((a, b) => b - a);

  return (
    <select
      id={id}
      name={name}
      required
      defaultValue={defaultValue}
      className={cn(
        "h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {options.map((year) => (
        <option key={year} value={year}>
          {year}
        </option>
      ))}
    </select>
  );
}
