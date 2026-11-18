"use client";
import { useActionState } from "react";
import { register } from "./actions";
import { FormError } from "@/components/AuthShell";

export function RegisterForm({ defaultCode }: { defaultCode?: string }) {
  const [error, action, pending] = useActionState(register, null);
  return (
    <form action={action} className="space-y-4">
      <FormError message={error} />
      <div>
        <label className="label" htmlFor="full_name">Имя и фамилия</label>
        <input id="full_name" name="full_name" className="input" autoComplete="name" required />
      </div>
      <div>
        <label className="label" htmlFor="login">Логин</label>
        <input id="login" name="login" className="input" autoComplete="username" autoCapitalize="none" placeholder="например, aliya.k" required />
        <p className="hint">Латинские буквы, цифры, точка или дефис. Можно указать email.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="password">Пароль</label>
          <input id="password" name="password" type="password" minLength={6} className="input" autoComplete="new-password" required />
        </div>
        <div>
          <label className="label" htmlFor="password2">Повторите</label>
          <input id="password2" name="password2" type="password" minLength={6} className="input" autoComplete="new-password" required />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="code">Код класса <span className="font-normal text-slate-400">(необязательно)</span></label>
        <input id="code" name="code" defaultValue={defaultCode} className="input font-mono tracking-widest uppercase" maxLength={6} placeholder="A1B2C3" />
        <p className="hint">Код выдаёт учитель. Можно ввести и позже в личном кабинете.</p>
      </div>
      <button className="btn w-full py-3" disabled={pending}>
        {pending ? "Создаём аккаунт…" : "Зарегистрироваться"}
      </button>
    </form>
  );
}
