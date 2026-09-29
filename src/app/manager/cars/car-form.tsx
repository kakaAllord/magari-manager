"use client";

import { useActionState } from "react";
import { createCar } from "@/app/actions/cars";

export function CarForm() {
  const [state, action, pending] = useActionState(createCar, undefined);

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
      <label>
        <span className="label">Plate</span>
        <input name="plate" required placeholder="T103ABE" className="input" />
      </label>
      <label>
        <span className="label">Make</span>
        <input name="make" required placeholder="Toyota" className="input" />
      </label>
      <label>
        <span className="label">Model</span>
        <input name="model" required placeholder="Corolla" className="input" />
      </label>
      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "Adding…" : "Add car"}
      </button>
      {state && (
        <p className={`text-sm sm:col-span-4 ${state.ok ? "text-ok" : "text-danger"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
