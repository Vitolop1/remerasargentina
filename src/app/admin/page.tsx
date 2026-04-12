import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { logoutAction } from "@/app/actions";
import { ADMIN_COOKIE_NAME } from "@/lib/auth";
import { formatArs, formatUsd, getCatalogData } from "@/lib/catalog";

export default async function AdminPage() {
  const cookieStore = await cookies();
  if (cookieStore.get(ADMIN_COOKIE_NAME)?.value !== "ok") {
    redirect("/ingresar");
  }

  const catalog = getCatalogData();
  const teamBreakdown = catalog.teams.map((team) => ({
    team,
    units: catalog.products
      .filter((product) => product.team === team)
      .reduce((total, product) => total + product.totalStock, 0),
  }));
  const topProducts = [...catalog.products]
    .sort((a, b) => b.totalStock - a.totalStock)
    .slice(0, 6);

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line)] pb-5">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Admin</p>
            <h1 className="mt-2 text-3xl font-semibold">Catalogo en produccion</h1>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-[8px] border border-[var(--foreground)] px-4 py-3 text-sm font-semibold"
            >
              Salir
            </button>
          </form>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-4">
            <p className="text-sm text-[var(--muted)]">Modelos</p>
            <p className="mt-2 text-3xl font-semibold">{catalog.products.length}</p>
          </div>
          <div className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-4">
            <p className="text-sm text-[var(--muted)]">Unidades cargadas</p>
            <p className="mt-2 text-3xl font-semibold">{catalog.settings.unitsPurchased}</p>
          </div>
          <div className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-4">
            <p className="text-sm text-[var(--muted)]">Unidades para vender</p>
            <p className="mt-2 text-3xl font-semibold">{catalog.settings.unitsForSale}</p>
          </div>
          <div className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-4">
            <p className="text-sm text-[var(--muted)]">Precio base</p>
            <p className="mt-2 text-3xl font-semibold">{formatUsd(catalog.settings.defaultSalePriceUsd)}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{formatArs(catalog.settings.defaultSalePriceArs)}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <h2 className="text-xl font-semibold">Mas stock</h2>
            <div className="mt-4 space-y-3">
              {topProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between gap-4 border-b border-[var(--line)] pb-3">
                  <div className="min-w-0">
                    <p className="font-medium">{product.shortName}</p>
                    <p className="text-sm text-[var(--muted)]">
                      {product.team} • {product.sizeOptions.map((option) => `${option.size} (${option.stock})`).join(", ")}
                    </p>
                  </div>
                  <strong>{product.totalStock}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <h2 className="text-xl font-semibold">Por grupo</h2>
            <div className="mt-4 space-y-3">
              {teamBreakdown.map((item) => (
                <div key={item.team} className="flex items-center justify-between border-b border-[var(--line)] pb-3">
                  <span>{item.team}</span>
                  <strong>{item.units}</strong>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
          <h2 className="text-xl font-semibold">Siguiente subida</h2>
          <ol className="mt-4 space-y-2 text-sm text-[var(--muted)]">
            <li>1. Actualiza `REMERAS_SOCIOS.xlsx` en esta misma carpeta.</li>
            <li>2. Corre `npm run sync:catalog`.</li>
            <li>3. Revisa cambios, hace commit y push.</li>
          </ol>
        </section>
      </div>
    </main>
  );
}
