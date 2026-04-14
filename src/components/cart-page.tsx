"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { buildWhatsappHref, formatArs, normalizeWhatsapp } from "@/lib/catalog";
import {
  buildOrderText,
  depositFor,
  ESTIMATED_ARRIVAL_LABEL,
  loadStoredCart,
  loadStoredCustomer,
  ORIGINAL_PRICE_ARS,
  resolveThemePreference,
  saveStoredCart,
  saveStoredCustomer,
  THEME_STORAGE_KEY,
  translateProductName,
  type CartItem,
  type Customer,
  type ThemeMode,
} from "@/lib/storefront";
import type { CatalogProduct, CatalogSummary } from "@/types/catalog";

type CartPageProps = CatalogSummary & {
  orderEmail?: string;
  whatsappNumber?: string;
  whatsappDisplay?: string;
  paymentAlias?: string;
  paymentCvu?: string;
  paymentAccountName?: string;
  paymentQrPath?: string;
};

function getItemStock(product: CatalogProduct, size: string) {
  return product.sizeOptions.find((option) => option.size === size)?.stock ?? 0;
}

export function CartPage({
  products,
  orderEmail,
  whatsappNumber,
  whatsappDisplay = "+1 704 676 2602",
  paymentAlias,
  paymentCvu,
  paymentAccountName,
  paymentQrPath,
}: CartPageProps) {
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof document !== "undefined") {
      const currentTheme = document.documentElement.dataset.theme;
      if (currentTheme === "light" || currentTheme === "dark") {
        return currentTheme;
      }
    }

    return resolveThemePreference();
  });
  const [cart, setCart] = useState<CartItem[]>(() => loadStoredCart());
  const [customer, setCustomer] = useState<Customer>(() => loadStoredCustomer());
  const [copiedOrder, setCopiedOrder] = useState(false);
  const [copiedAlias, setCopiedAlias] = useState(false);
  const [copiedCvu, setCopiedCvu] = useState(false);

  const cleanWhatsapp = normalizeWhatsapp(whatsappNumber);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (!isClient) {
      return;
    }

    saveStoredCart(cart);
  }, [cart, isClient]);

  useEffect(() => {
    if (!isClient) {
      return;
    }

    saveStoredCustomer(customer);
  }, [customer, isClient]);

  const cartDetails = useMemo(() => {
    return cart
      .map((item) => {
        const product = products.find((candidate) => candidate.id === item.productId);
        if (!product) {
          return null;
        }

        return {
          product,
          size: item.size,
          quantity: item.quantity,
        };
      })
      .filter(Boolean) as Array<{
      product: CatalogProduct;
      size: string;
      quantity: number;
    }>;
  }, [cart, products]);

  const totals = useMemo(() => {
    return cartDetails.reduce(
      (accumulator, item) => {
        accumulator.ars += item.product.priceArs * item.quantity;
        accumulator.units += item.quantity;
        return accumulator;
      },
      { ars: 0, units: 0 },
    );
  }, [cartDetails]);

  const depositArs = depositFor(totals.ars);
  const remainingArs = Math.max(totals.ars - depositArs, 0);
  const canSendOrder =
    cartDetails.length > 0 && customer.name.trim() !== "" && customer.phone.trim() !== "";
  const orderText = buildOrderText(cartDetails, customer, totals.ars, depositArs, orderEmail);
  const whatsappHref = buildWhatsappHref(whatsappNumber, orderText);
  const quickWhatsappHref = buildWhatsappHref(
    whatsappNumber,
    "Hola, quiero hablar por WhatsApp por unas remeras del catalogo.",
  );
  const emailHref = orderEmail
    ? `mailto:${orderEmail}?subject=${encodeURIComponent(
        `Pedido web - ${customer.name || "Cliente"}`,
      )}&body=${encodeURIComponent(orderText)}`
    : "#";

  function updateCustomer(field: keyof Customer, value: string) {
    setCustomer((current) => ({ ...current, [field]: value }));
  }

  function changeQuantity(productId: string, size: string, delta: number) {
    setCart((current) =>
      current
        .map((item) => {
          if (item.productId !== productId || item.size !== size) {
            return item;
          }

          return { ...item, quantity: item.quantity + delta };
        })
        .filter((item) => item.quantity > 0),
    );
  }

  function removeItem(productId: string, size: string) {
    setCart((current) =>
      current.filter((item) => item.productId !== productId || item.size !== size),
    );
  }

  async function copyOrder() {
    await navigator.clipboard.writeText(orderText);
    setCopiedOrder(true);
    window.setTimeout(() => setCopiedOrder(false), 1800);
  }

  async function copyAlias() {
    if (!paymentAlias) {
      return;
    }

    await navigator.clipboard.writeText(paymentAlias);
    setCopiedAlias(true);
    window.setTimeout(() => setCopiedAlias(false), 1800);
  }

  async function copyCvu() {
    if (!paymentCvu) {
      return;
    }

    await navigator.clipboard.writeText(paymentCvu);
    setCopiedCvu(true);
    window.setTimeout(() => setCopiedCvu(false), 1800);
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-[var(--line)] bg-[var(--background)]">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
            <Link
              href="/#catalogo"
              className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3 py-3 text-sm font-semibold shadow-[var(--soft-shadow)]"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m15 18-6-6 6-6" />
              </svg>
              <span className="hidden sm:inline">Volver al catalogo</span>
            </Link>

            <Link href="/" className="justify-self-center">
              <div className="inline-flex max-w-full items-center gap-3 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3 py-3 shadow-[var(--soft-shadow)] md:rounded-full md:px-4">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[var(--background)] md:h-11 md:w-11">
                  <Image
                    src="/images/logo-remeras-argentina.svg"
                    alt="Logo RL importaciones"
                    fill
                    className="object-contain p-2"
                    sizes="44px"
                  />
                </div>
                <div className="min-w-0 text-left">
                  <p className="hidden text-[10px] uppercase tracking-[0.18em] text-[var(--muted)] sm:block">
                    Pedido web
                  </p>
                  <p className="truncate text-base font-black leading-none sm:text-xl">RL importaciones</p>
                  <p className="mt-1 text-[11px] text-[var(--muted)] sm:text-xs">
                    {isClient ? `${totals.units} remeras en carrito` : "Cargando carrito"}
                  </p>
                </div>
              </div>
            </Link>

            <div
              suppressHydrationWarning
              className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--surface)] p-1 shadow-[var(--soft-shadow)]"
            >
              <button
                type="button"
                onClick={() => setTheme("light")}
                aria-pressed={theme === "light"}
                className={`rounded-full px-3 py-2 text-sm font-semibold ${
                  theme === "light" ? "bg-[var(--accent)] text-white" : "text-[var(--muted)]"
                }`}
              >
                Claro
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                aria-pressed={theme === "dark"}
                className={`rounded-full px-3 py-2 text-sm font-semibold ${
                  theme === "dark" ? "bg-[var(--accent)] text-white" : "text-[var(--muted)]"
                }`}
              >
                Oscuro
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Tu carrito</p>
              <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Confirma tu pedido</h1>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Elige las remeras, completa tus datos y envia el pedido por mail o por WhatsApp.
              </p>
            </div>
            <div className="rounded-[8px] border border-[var(--line)] bg-[var(--background)] px-4 py-3 text-sm font-semibold">
              Llega estimado: {ESTIMATED_ARRIVAL_LABEL}
            </div>
          </div>
        </section>

        {!isClient ? (
          <section className="mt-6 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-8 text-center">
            <p className="text-sm text-[var(--muted)]">Cargando tu carrito...</p>
          </section>
        ) : cartDetails.length === 0 ? (
          <section className="mt-6 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-8 text-center">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Carrito vacio</p>
            <h2 className="mt-2 text-2xl font-semibold">Todavia no agregaste remeras</h2>
            <p className="mt-3 text-sm text-[var(--muted)]">
              Vuelve al catalogo, elige tus modelos y cuando quieras cierras el pedido desde aca.
            </p>
            <Link
              href="/#catalogo"
              className="mt-5 inline-flex rounded-[8px] bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-[var(--surface)]"
            >
              Ir al catalogo completo
            </Link>
          </section>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
            <section className="space-y-4">
              {cartDetails.map((item) => {
                const stock = getItemStock(item.product, item.size);
                const canIncrease = item.quantity < stock;

                return (
                  <article
                    key={`${item.product.id}-${item.size}`}
                    className="grid gap-4 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-4 sm:grid-cols-[7.5rem_minmax(0,1fr)]"
                  >
                    <div className="relative aspect-[4/5] overflow-hidden rounded-[8px] border border-[var(--line)] bg-white">
                      {item.product.image ? (
                        <Image
                          src={item.product.image}
                          alt={item.product.shortName}
                          fill
                          className="object-cover"
                          sizes="140px"
                        />
                      ) : null}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                            {item.product.collection}
                          </p>
                          <h2 className="mt-1 text-lg font-semibold leading-6">
                            {translateProductName(item.product.shortName)}
                          </h2>
                          <p className="mt-2 text-sm text-[var(--muted)]">
                            Talle {item.size} / {formatArs(item.product.priceArs)}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(item.product.id, item.size)}
                          className="rounded-[8px] border border-[var(--line)] px-3 py-2 text-xs font-semibold text-[var(--muted)]"
                        >
                          Quitar
                        </button>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => changeQuantity(item.product.id, item.size, -1)}
                            className="h-10 w-10 rounded-[8px] border border-[var(--line)] text-base font-semibold"
                          >
                            -
                          </button>
                          <span className="min-w-8 text-center text-sm font-semibold">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => changeQuantity(item.product.id, item.size, 1)}
                            disabled={!canIncrease}
                            className="h-10 w-10 rounded-[8px] border border-[var(--line)] text-base font-semibold disabled:cursor-not-allowed disabled:text-[var(--muted)]"
                          >
                            +
                          </button>
                        </div>

                        <div className="text-right">
                          <p className="text-xs text-[var(--muted)] line-through">
                            {formatArs(ORIGINAL_PRICE_ARS * item.quantity)}
                          </p>
                          <p className="text-lg font-semibold">
                            {formatArs(item.product.priceArs * item.quantity)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>

            <aside className="h-fit rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5 lg:sticky lg:top-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Resumen</p>
                  <h2 className="mt-1 text-xl font-semibold">Tu pedido</h2>
                </div>
                <span className="rounded-[8px] bg-[var(--foreground)] px-3 py-2 text-sm font-semibold text-[var(--surface)]">
                  {totals.units}
                </span>
              </div>

              <div className="mt-5 space-y-2 rounded-[8px] border border-[var(--line)] bg-[var(--background)] p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">Precio original</span>
                  <strong className="line-through">{formatArs(ORIGINAL_PRICE_ARS * totals.units)}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">Total promocional</span>
                  <strong>{formatArs(totals.ars)}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">Sena estimada</span>
                  <strong>{formatArs(depositArs)}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">Saldo restante</span>
                  <strong>{formatArs(remainingArs)}</strong>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                <input
                  value={customer.name}
                  onChange={(event) => updateCustomer("name", event.target.value)}
                  placeholder="Nombre y apellido"
                  className="rounded-[8px] border border-[var(--line)] bg-[var(--background)] px-4 py-3 text-base sm:text-sm"
                />
                <input
                  value={customer.phone}
                  onChange={(event) => updateCustomer("phone", event.target.value)}
                  placeholder="WhatsApp"
                  className="rounded-[8px] border border-[var(--line)] bg-[var(--background)] px-4 py-3 text-base sm:text-sm"
                />
                <input
                  value={customer.email}
                  onChange={(event) => updateCustomer("email", event.target.value)}
                  placeholder="Mail"
                  className="rounded-[8px] border border-[var(--line)] bg-[var(--background)] px-4 py-3 text-base sm:text-sm"
                />
                <input
                  value={customer.zone}
                  onChange={(event) => updateCustomer("zone", event.target.value)}
                  placeholder="Barrio o ciudad"
                  className="rounded-[8px] border border-[var(--line)] bg-[var(--background)] px-4 py-3 text-base sm:text-sm"
                />
                <input
                  value={customer.instagram}
                  onChange={(event) => updateCustomer("instagram", event.target.value)}
                  placeholder="Instagram opcional"
                  className="rounded-[8px] border border-[var(--line)] bg-[var(--background)] px-4 py-3 text-base sm:text-sm"
                />
                <textarea
                  value={customer.notes}
                  onChange={(event) => updateCustomer("notes", event.target.value)}
                  placeholder="Notas o pedido especial"
                  rows={4}
                  className="rounded-[8px] border border-[var(--line)] bg-[var(--background)] px-4 py-3 text-base sm:text-sm"
                />
              </div>

              <div className="mt-5 rounded-[8px] border border-[var(--line)] bg-[var(--background)] p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Transferencia</p>
                <div className="mt-3 space-y-3">
                  <div className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3 py-3">
                    <p className="text-xs text-[var(--muted)]">Alias</p>
                    <code className="mt-1 block text-sm font-semibold">{paymentAlias || "-"}</code>
                  </div>

                  {paymentCvu ? (
                    <div className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3 py-3">
                      <p className="text-xs text-[var(--muted)]">CVU</p>
                      <code className="mt-1 block break-all text-sm font-semibold">{paymentCvu}</code>
                    </div>
                  ) : null}

                  {paymentAccountName ? (
                    <div className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3 py-3">
                      <p className="text-xs text-[var(--muted)]">Titular</p>
                      <p className="mt-1 text-sm font-semibold">{paymentAccountName}</p>
                    </div>
                  ) : null}

                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={copyAlias}
                      disabled={!paymentAlias}
                      className="rounded-[8px] border border-[var(--foreground)] px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:border-[var(--line)] disabled:text-[var(--muted)]"
                    >
                      {copiedAlias ? "Alias copiado" : "Copiar alias"}
                    </button>
                    <button
                      type="button"
                      onClick={copyCvu}
                      disabled={!paymentCvu}
                      className="rounded-[8px] border border-[var(--foreground)] px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:border-[var(--line)] disabled:text-[var(--muted)]"
                    >
                      {copiedCvu ? "CVU copiado" : "Copiar CVU"}
                    </button>
                  </div>
                </div>

                {paymentQrPath ? (
                  <div className="relative mt-4 aspect-square overflow-hidden rounded-[8px] border border-[var(--line)] bg-white">
                    <Image src={paymentQrPath} alt="QR para reservar" fill className="object-contain p-4" />
                  </div>
                ) : null}

                <p className="mt-4 text-sm text-[var(--muted)]">
                  Nos envias el pedido, te confirmamos disponibilidad y coordinamos la sena.
                </p>
              </div>

              <div className="mt-5 grid gap-3">
                <button
                  type="button"
                  onClick={copyOrder}
                  className="rounded-[8px] border border-[var(--foreground)] px-4 py-3 text-sm font-semibold"
                >
                  {copiedOrder ? "Pedido copiado" : "Copiar pedido"}
                </button>

                <a
                  href={canSendOrder && orderEmail ? emailHref : "#"}
                  className={`rounded-[8px] px-4 py-3 text-center text-sm font-semibold text-white ${
                    canSendOrder && orderEmail
                      ? "bg-[var(--foreground)]"
                      : "pointer-events-none bg-[var(--line)] text-[var(--muted)]"
                  }`}
                >
                  Enviar por mail
                </a>

                <a
                  href={canSendOrder ? whatsappHref : quickWhatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className={`inline-flex items-center justify-center gap-2 rounded-[8px] px-4 py-3 text-center text-sm font-semibold text-white ${
                    cleanWhatsapp
                      ? "bg-[var(--accent)]"
                      : "pointer-events-none bg-[var(--line)] text-[var(--muted)]"
                  }`}
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="currentColor">
                    <path d="M20.52 3.48A11.8 11.8 0 0 0 12.09 0C5.54 0 .19 5.32.19 11.86c0 2.09.55 4.13 1.59 5.92L0 24l6.39-1.67a11.8 11.8 0 0 0 5.69 1.45h.01c6.55 0 11.9-5.32 11.9-11.86 0-3.17-1.24-6.15-3.47-8.44Zm-8.43 18.3h-.01a9.82 9.82 0 0 1-5.01-1.37l-.36-.21-3.79.99 1.01-3.69-.24-.38a9.78 9.78 0 0 1-1.51-5.24c0-5.43 4.45-9.86 9.92-9.86 2.65 0 5.13 1.03 7 2.9a9.78 9.78 0 0 1 2.9 6.96c0 5.44-4.45 9.87-9.91 9.87Zm5.41-7.39c-.3-.15-1.78-.88-2.05-.98-.28-.1-.48-.15-.68.15-.2.29-.78.97-.95 1.17-.18.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.49a9.1 9.1 0 0 1-1.68-2.08c-.18-.3-.02-.46.14-.6.13-.13.3-.35.45-.52.15-.17.2-.29.3-.49.1-.2.05-.37-.03-.52-.08-.15-.68-1.63-.94-2.24-.24-.57-.49-.49-.68-.5h-.58c-.2 0-.52.07-.8.37-.27.29-1.04 1.01-1.04 2.47 0 1.45 1.07 2.85 1.22 3.04.15.2 2.1 3.2 5.09 4.49.71.31 1.26.49 1.7.62.71.22 1.36.19 1.87.11.57-.08 1.78-.73 2.03-1.44.25-.71.25-1.31.17-1.43-.07-.12-.27-.2-.57-.35Z" />
                  </svg>
                  {canSendOrder ? "Enviar pedido por WhatsApp" : "Hablar por WhatsApp"}
                </a>
              </div>
            </aside>
          </div>
        )}

        <section className="mt-8 rounded-[8px] bg-[var(--accent)] px-5 py-6 text-white sm:px-8 sm:py-7">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white/75">No ves tu camiseta?</p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight sm:text-4xl">
            Contacta al vendedor y la buscamos para vos.
          </h2>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <a
              href={buildWhatsappHref(
                whatsappNumber,
                "Hola, quiero una remera que no vi en el catalogo. Me pasas modelos y precio?",
              )}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-[8px] bg-white px-4 py-3 text-sm font-semibold text-[var(--accent)]"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="currentColor">
                <path d="M20.52 3.48A11.8 11.8 0 0 0 12.09 0C5.54 0 .19 5.32.19 11.86c0 2.09.55 4.13 1.59 5.92L0 24l6.39-1.67a11.8 11.8 0 0 0 5.69 1.45h.01c6.55 0 11.9-5.32 11.9-11.86 0-3.17-1.24-6.15-3.47-8.44Zm-8.43 18.3h-.01a9.82 9.82 0 0 1-5.01-1.37l-.36-.21-3.79.99 1.01-3.69-.24-.38a9.78 9.78 0 0 1-1.51-5.24c0-5.43 4.45-9.86 9.92-9.86 2.65 0 5.13 1.03 7 2.9a9.78 9.78 0 0 1 2.9 6.96c0 5.44-4.45 9.87-9.91 9.87Zm5.41-7.39c-.3-.15-1.78-.88-2.05-.98-.28-.1-.48-.15-.68.15-.2.29-.78.97-.95 1.17-.18.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.49a9.1 9.1 0 0 1-1.68-2.08c-.18-.3-.02-.46.14-.6.13-.13.3-.35.45-.52.15-.17.2-.29.3-.49.1-.2.05-.37-.03-.52-.08-.15-.68-1.63-.94-2.24-.24-.57-.49-.49-.68-.5h-.58c-.2 0-.52.07-.8.37-.27.29-1.04 1.01-1.04 2.47 0 1.45 1.07 2.85 1.22 3.04.15.2 2.1 3.2 5.09 4.49.71.31 1.26.49 1.7.62.71.22 1.36.19 1.87.11.57-.08 1.78-.73 2.03-1.44.25-.71.25-1.31.17-1.43-.07-.12-.27-.2-.57-.35Z" />
              </svg>
              Contactar al vendedor
            </a>
            <span className="rounded-[8px] border border-white/35 px-4 py-3 text-sm font-semibold">
              {whatsappDisplay}
            </span>
          </div>
        </section>
      </main>
    </div>
  );
}
