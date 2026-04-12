import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { loginAction } from "@/app/actions";
import { ADMIN_COOKIE_NAME } from "@/lib/auth";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const cookieStore = await cookies();
  if (cookieStore.get(ADMIN_COOKIE_NAME)?.value === "ok") {
    redirect("/admin");
  }

  const params = await searchParams;
  const hasError = params.error === "1";
  const needsSetup = params.setup === "1";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-md rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Acceso</p>
        <h1 className="mt-2 text-2xl font-semibold">Panel de administracion</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">Entrar para revisar stock y preparar la proxima subida.</p>

        <form action={loginAction} className="mt-6 grid gap-3">
          <input
            type="password"
            name="password"
            placeholder="Clave"
            className="rounded-[8px] border border-[var(--line)] bg-[var(--background)] px-4 py-3 text-sm"
            required
          />
          <button
            type="submit"
            className="rounded-[8px] bg-[var(--foreground)] px-4 py-3 text-sm font-semibold text-[var(--background)]"
          >
            Entrar
          </button>
        </form>

        {hasError ? <p className="mt-4 text-sm text-[var(--accent-2)]">La clave no coincide.</p> : null}
        {needsSetup ? (
          <p className="mt-2 text-sm text-[var(--muted)]">Configura `ADMIN_PASSWORD` para activar este acceso.</p>
        ) : null}
      </div>
    </main>
  );
}
