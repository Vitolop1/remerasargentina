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
  saveStoredCart,
  saveStoredCustomer,
  translateProductName,
  type CartItem,
  type Customer,
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
  const [cart, setCart] = useState<CartItem[]>(() => loadStoredCart());
  const [customer, setCustomer] = useState<Customer>(() => loadStoredCustomer());
  const [copiedOrder, setCopiedOrder] = useState(false);
  const [copiedAlias, setCopiedAlias] = useState(false);
  const [copiedCvu, setCopiedCvu] = useState(false);

  const cleanWhatsapp = normalizeWhatsapp(whatsappNumber);

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
    "Hola, estoy interesado en unas camisetas del catalogo y quiero terminar mi pedido.",
  );
  const headerWhatsappHref = buildWhatsappHref(
    whatsappNumber,
    "Hola, quiero ayuda con mi carrito de remeras.",
  );
  const emailHref = orderEmail
    ? `mailto:${orderEmail}?subject=${encodeURIComponent(
        `Pedido RL importaciones - ${customer.name || "Cliente"}`,
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
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[var(--line)] bg-[color:var(--background)]/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-3 py-3 sm:px-6 sm:py-4 lg:px-8">
          <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-2 sm:gap-3">
            <div className="flex items-center">
              <Link
                href="/#catalogo"
                aria-label="Volver al catalogo"
                className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--soft-shadow)] transition hover:border-[var(--foreground)] sm:h-11 sm:w-11"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-[1.1rem] w-[1.1rem]"
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="6" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
              </Link>
            </div>

            <Link href="/" className="mx-auto min-w-0">
              <div className="inline-flex min-w-0 items-center gap-2 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 shadow-[var(--soft-shadow)] sm:gap-3 sm:px-4 sm:py-3">
                <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-[var(--background)] sm:h-9 sm:w-9">
                  <Image
                    src="/images/logo-remeras-argentina.svg"
                    alt="Logo RL importaciones"
                    fill
                    className="object-contain p-1 sm:p-1.5"
                    sizes="36px"
                  />
                </div>
                <div className="min-w-0 text-left">
                  <p className="truncate text-base font-black leading-none sm:text-xl">RL importaciones</p>
                </div>
              </div>
            </Link>

            <div className="justify-self-end flex items-center gap-2">
              <a
                href={headerWhatsappHref}
                target="_blank"
                rel="noreferrer"
                aria-label="Hablar por WhatsApp"
                className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#25D366] text-white shadow-[var(--soft-shadow)] transition hover:opacity-95 sm:h-11 sm:w-auto sm:gap-2 sm:px-3"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-[1.15rem] w-[1.15rem]"
                  aria-hidden="true"
                  fill="currentColor"
                >
                  <path d="M19.05 4.94A9.86 9.86 0 0 0 12.02 2a9.97 9.97 0 0 0-8.63 14.96L2 22l5.2-1.36a9.97 9.97 0 0 0 4.79 1.22h.01c5.5 0 9.98-4.47 9.99-9.97a9.9 9.9 0 0 0-2.94-6.95Zm-7.03 15.24h-.01a8.3 8.3 0 0 1-4.23-1.16l-.3-.18-3.09.81.82-3.01-.2-.31a8.29 8.29 0 0 1-1.28-4.43c0-4.58 3.72-8.3 8.3-8.3a8.24 8.24 0 0 1 5.88 2.44 8.23 8.23 0 0 1 2.42 5.88c0 4.58-3.72 8.3-8.31 8.3Zm4.55-6.22c-.25-.12-1.47-.72-1.69-.8-.23-.08-.39-.12-.56.12-.16.25-.64.8-.78.97-.14.17-.29.18-.54.06-.25-.12-1.05-.39-2-1.24a7.48 7.48 0 0 1-1.39-1.73c-.15-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.12-.15.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.42-.14-.01-.31-.01-.47-.01-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.08 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.68 4.24 3.75.59.26 1.05.41 1.41.52.59.19 1.12.16 1.54.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.08.14-1.18-.06-.11-.22-.17-.47-.29Z" />
                </svg>
                <span className="hidden sm:inline">WhatsApp</span>
              </a>

              <Link
                href="/carrito"
                aria-label={`Abrir carrito con ${totals.units} productos`}
                className="relative inline-flex h-10 min-w-10 items-center justify-center rounded-[8px] bg-[var(--accent-2)] px-3 text-white transition hover:opacity-95 sm:h-11 sm:min-w-11"
              >
                <svg viewBox="0 0 24 24" className="h-[1.05rem] w-[1.05rem]" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="9" cy="20" r="1.5" />
                  <circle cx="18" cy="20" r="1.5" />
                  <path d="M3 4h2l2.2 9.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 7H7" />
                </svg>
                {totals.units > 0 ? (
                  <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--surface)] px-1.5 py-0.5 text-[11px] font-bold text-[var(--foreground)] shadow-[var(--soft-shadow)]">
                    {totals.units}
                  </span>
                ) : null}
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-6 pt-24 sm:px-6 sm:pb-8 sm:pt-32 lg:px-8">
        <section className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Tu carrito</p>
              <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Confirma tu pedido</h1>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Elige las remeras, completa tus datos y termina el pedido por WhatsApp.
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
                  <span className="text-[var(--muted)]">{"Se\u00f1a estimada"}</span>
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
                  {"Nos envias el pedido, te confirmamos disponibilidad y coordinamos la se\u00f1a."}
                </p>
              </div>

              <div className="mt-5 grid gap-3">
                <button
                  type="button"
                  onClick={copyOrder}
                  className="rounded-[8px] border border-[var(--foreground)] px-4 py-3 text-sm font-semibold"
                >
                  {copiedOrder ? "Mensaje copiado" : "Copiar mensaje"}
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
                  {canSendOrder ? "Terminar pedido" : "Hablar por WhatsApp"}
                </a>

                <p className="text-center text-xs text-[var(--muted)]">
                  Se abre WhatsApp con las camisetas elegidas y los datos del comprador listos para enviar.
                </p>
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
