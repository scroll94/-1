"use client";
import { useActionState } from "react";
import { login } from "./actions";
import { FormError } from "@/components/AuthShell";

export function LoginForm() {
  const [error, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="space-y-5">
      <FormError message={error} />
      <div>
        <label className="label" htmlFor="login">Логин или email</label>
        <input id="login" name="login" className="input" autoComplete="username" autoCapitalize="none" required />
      </div>
      <div>
        <label className="label" htmlFor="password">Пароль</label>
        <input id="password" name="password" type="password" className="input" autoComplete="current-password" required />
      </div>
      <button className="btn w-full py-3" disabled={pending}>
        {pending ? "Входим…" : "Войти"}
      </button>
    </form>
  );
}
