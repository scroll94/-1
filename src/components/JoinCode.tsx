import { Icon } from "./Icon";
import { CopyButton } from "./CopyButton";
import { joinClass as joinClassAction, regenerateJoinCode } from "@/app/(app)/actions";

/** Карточка с кодом класса для учителя/админа. */
export function JoinCode({ classId, code, back }: { classId: string; code: string; back: string }) {
  return (
    <div className="card flex flex-wrap items-center gap-4">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
        <Icon name="hash" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm text-slate-500">Код для вступления в класс</div>
        <div className="font-mono text-2xl font-bold tracking-[0.3em]">{code}</div>
        <div className="hint">Ученик вводит его при регистрации или на странице «Мои классы».</div>
      </div>
      <div className="flex flex-wrap gap-1">
        <CopyButton text={code} label="Код" />
        <CopyButton text={`/register?code=${code}`} label="Ссылка" />
        <form action={regenerateJoinCode}>
          <input type="hidden" name="id" value={classId} />
          <input type="hidden" name="back" value={back} />
          <button className="btn-ghost btn-sm" title="Старый код перестанет работать">
            <Icon name="refresh" className="h-4 w-4" /> Новый код
          </button>
        </form>
      </div>
    </div>
  );
}

export function JoinClassForm({ back = "/classes" }: { back?: string }) {
  return (
    <form action={joinClassAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="back" value={back} />
      <div className="min-w-0 flex-1">
        <label className="label">Код класса</label>
        <input name="code" maxLength={6} required placeholder="A1B2C3" className="input font-mono tracking-widest uppercase" />
      </div>
      <button className="btn">
        <Icon name="plus" className="h-4 w-4" /> Вступить
      </button>
    </form>
  );
}
