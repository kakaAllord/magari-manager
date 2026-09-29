"use client";

import { useActionState } from "react";
import { createCar } from "@/app/actions/cars";

export function CarForm() {
  const [state, action, pending] = useActionState(createCar, undefined);

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
      <label>
        <span className="label">Namba ya gari</span>
        <input
          name="plate"
          required
          autoCapitalize="characters"
          placeholder="T103ABE"
          className="input font-mono tracking-wider uppercase placeholder:normal-case"
        />
      </label>
      <label>
        <span className="label">Aina</span>
        <input name="make" required placeholder="Toyota" className="input" />
      </label>
      <label>
        <span className="label">Modeli</span>
        <input name="model" required placeholder="IST" className="input" />
      </label>
      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "Inaongeza…" : "Ongeza gari"}
      </button>
      {state && (
        <p role="status" className={`text-sm sm:col-span-4 ${state.ok ? "text-ok" : "text-danger"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
