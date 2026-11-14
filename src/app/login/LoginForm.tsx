"use client";
import { useActionState } from "react";
import { login } from "./actions";

export function LoginForm() {
  const [error, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="space-y-4">
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
      <div>
        <label className="label">Логин или email</label>
        <input name="login" className="input" autoComplete="username" required />
      </div>
      <div>
        <label className="label">Пароль</label>
        <input name="password" type="password" className="input" autoComplete="current-password" required />
      </div>
      <button className="btn w-full" disabled={pending}>
        {pending ? "Входим…" : "Войти"}
      </button>
    </form>
  );
}
