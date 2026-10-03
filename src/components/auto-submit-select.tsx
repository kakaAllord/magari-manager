"use client";

// A filter dropdown that applies as soon as something is picked.
export function AutoSubmitSelect({
  options,
  ...props
}: React.ComponentProps<"select"> & { options: { value: string; label: string }[] }) {
  return (
    <select {...props} onChange={(e) => e.currentTarget.form?.requestSubmit()}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
