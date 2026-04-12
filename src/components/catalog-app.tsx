"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { formatArs, normalizeWhatsapp } from "@/lib/catalog";
import type { CatalogProduct, CatalogSummary } from "@/types/catalog";

type CartItem = {
  productId: string;
  size: string;
  quantity: number;
};

type Customer = {
  name: string;
  phone: string;
  zone: string;
  instagram: string;
  notes: string;
};

type GalleryState = {
  productId: string;
  index: number;
};

type CatalogAppProps = CatalogSummary & {
  whatsappNumber?: string;
  whatsappDisplay?: string;
  paymentAlias?: string;
  paymentQrPath?: string;
};

const DEPOSIT_RATE = 0.5;

function depositFor(amount: number) {
  return Math.round(amount * DEPOSIT_RATE);
}

function buildOrderMessage(
  items: Array<{
    product: CatalogProduct;
    size: string;
    quantity: number;
  }>,
  customer: Customer,
  totalArs: number,
  depositArs: number,
  paymentAlias?: string,
) {
  const itemLines = items.map(
    ({ product, size, quantity }) =>
      `- ${product.shortName} | talle ${size} | x${quantity} | ${formatArs(product.priceArs * quantity)}`,
  );

  return [
    "Hola, quiero reservar estas remeras:",
    "",
    ...itemLines,
    "",
    `Total: ${formatArs(totalArs)}`,
    `Sena para reservar (50%): ${formatArs(depositArs)}`,
    paymentAlias ? `Alias para transferir: ${paymentAlias}` : "Necesito el alias o el QR para transferir la sena.",
    "",
    `Nombre: ${customer.name || "-"}`,
    `Telefono: ${customer.phone || "-"}`,
    `Zona: ${customer.zone || "-"}`,
    `Instagram: ${customer.instagram || "-"}`,
    `Notas: ${customer.notes || "-"}`,
    "",
    "Cuando transfiera, te mando el comprobante por este chat.",
  ].join("\n");
}

export function CatalogApp({
  products,
  teams,
  sizes,
  settings,
  whatsappNumber,
  whatsappDisplay = "+1 704 676 2602",
  paymentAlias,
  paymentQrPath,
}: CatalogAppProps) {
  const [query, setQuery] = useState("");
  const [teamFilter, setTeamFilter] = useState("Todos");
  const [sizeFilter, setSizeFilter] = useState("Todos");
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>(
    Object.fromEntries(products.map((product) => [product.id, product.sizeOptions[0]?.size ?? ""])),
  );
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<Customer>({
    name: "",
    phone: "",
    zone: "Salta Capital",
    instagram: "",
    notes: "",
  });
  const [copiedOrder, setCopiedOrder] = useState(false);
  const [copiedAlias, setCopiedAlias] = useState(false);
  const [gallery, setGallery] = useState<GalleryState | null>(null);

  const cleanWhatsapp = normalizeWhatsapp(whatsappNumber);

  const featuredProducts = useMemo(() => {
    return products.filter((product) => product.image).slice(0, 3);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesQuery = !query || product.searchText.includes(query.toLowerCase());
      const matchesTeam = teamFilter === "Todos" || product.team === teamFilter;
      const matchesSize =
        sizeFilter === "Todos" ||
        product.sizeOptions.some((option) => option.size === sizeFilter && option.stock > 0);

      return matchesQuery && matchesTeam && matchesSize;
    });
  }, [products, query, teamFilter, sizeFilter]);

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
  const canReserve = cartDetails.length > 0 && customer.name.trim() !== "" && customer.phone.trim() !== "";
  const orderMessage = buildOrderMessage(cartDetails, customer, totals.ars, depositArs, paymentAlias);
  const whatsappHref = cleanWhatsapp
    ? `https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(orderMessage)}`
    : "#";
  const otherJerseyHref = cleanWhatsapp
    ? `https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
        "Hola, quiero una remera que no vi en el catalogo. Me pasas modelos y precio?",
      )}`
    : "#";

  const activeGalleryProduct = useMemo(() => {
    if (!gallery) {
      return null;
    }

    return products.find((product) => product.id === gallery.productId) ?? null;
  }, [gallery, products]);

  const activeGalleryImage = useMemo(() => {
    if (!gallery || !activeGalleryProduct) {
      return null;
    }

    return activeGalleryProduct.gallery[gallery.index] ?? activeGalleryProduct.image;
  }, [activeGalleryProduct, gallery]);

  function getSelectedSize(product: CatalogProduct) {
    return selectedSizes[product.id] ?? product.sizeOptions[0]?.size ?? "";
  }

  function reservedInCart(productId: string, size: string) {
    return cart.find((item) => item.productId === productId && item.size === size)?.quantity ?? 0;
  }

  function availableForSelection(product: CatalogProduct, size: string) {
    const stock = product.sizeOptions.find((option) => option.size === size)?.stock ?? 0;
    return Math.max(stock - reservedInCart(product.id, size), 0);
  }

  function addToCart(product: CatalogProduct) {
    const size = getSelectedSize(product);
    if (!size || availableForSelection(product, size) === 0) {
      return;
    }

    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id && item.size === size);
      if (!existing) {
        return [...current, { productId: product.id, size, quantity: 1 }];
      }

      return current.map((item) =>
        item.productId === product.id && item.size === size
          ? { ...item, quantity: item.quantity + 1 }
          : item,
      );
    });
  }

  function changeQuantity(productId: string, size: string, delta: number) {
    setCart((current) => {
      return current
        .map((item) => {
          if (item.productId !== productId || item.size !== size) {
            return item;
          }

          return { ...item, quantity: item.quantity + delta };
        })
        .filter((item) => item.quantity > 0);
    });
  }

  function updateCustomer(field: keyof Customer, value: string) {
    setCustomer((current) => ({ ...current, [field]: value }));
  }

  function openGallery(product: CatalogProduct) {
    const primaryIndex = Math.max(product.gallery.indexOf(product.image ?? ""), 0);
    setGallery({
      productId: product.id,
      index: primaryIndex,
    });
  }

  function moveGallery(delta: number) {
    if (!gallery || !activeGalleryProduct || activeGalleryProduct.gallery.length === 0) {
      return;
    }

    const total = activeGalleryProduct.gallery.length;
    setGallery({
      productId: gallery.productId,
      index: (gallery.index + delta + total) % total,
    });
  }

  async function copyOrder() {
    await navigator.clipboard.writeText(orderMessage);
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

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-[var(--line)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Catalogo en Salta</p>
            <h1 className="text-xl font-semibold">Remeras Argentina</h1>
          </div>
          <a
            href={otherJerseyHref}
            target="_blank"
            rel="noreferrer"
            className="rounded-[8px] bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-95"
          >
            WhatsApp {whatsappDisplay}
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid gap-6 border-b border-[var(--line)] pb-8 lg:grid-cols-[minmax(0,1fr)_23rem]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
              Retro, clasicas y mundialistas
            </p>
            <h2 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
              Reserva en pesos, deja la sena y cerralo por WhatsApp.
            </h2>
            <p className="mt-4 max-w-2xl text-base text-[var(--muted)]">
              Elegi el modelo, elegi el talle, transferi el 50% y mandanos el comprobante. El saldo
              se paga al entregar en Salta.
            </p>

            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              <span className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2">
                {settings.unitsForSale} listas
              </span>
              <span className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2">
                {products.length} modelos
              </span>
              <span className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2">
                {settings.unitsPurchased} prendas
              </span>
              <span className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2">
                {formatArs(settings.defaultSalePriceArs)} por remera
              </span>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#catalogo"
                className="rounded-[8px] bg-[var(--foreground)] px-4 py-3 text-sm font-semibold text-[var(--surface)]"
              >
                Ver catalogo
              </a>
              <a
                href={otherJerseyHref}
                target="_blank"
                rel="noreferrer"
                className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold"
              >
                Pedir otra remera
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
            {featuredProducts.map((product, index) => (
              <button
                key={product.id}
                type="button"
                onClick={() => openGallery(product)}
                className={`group relative overflow-hidden rounded-[8px] border border-[var(--line)] bg-[var(--surface)] text-left ${
                  index === 0 ? "col-span-2 row-span-2 min-h-[20rem]" : "min-h-[9.5rem]"
                }`}
              >
                {product.image ? (
                  <Image
                    src={product.image}
                    alt={product.shortName}
                    fill
                    className="object-cover transition duration-300 group-hover:scale-[1.02]"
                    sizes="(max-width: 1024px) 33vw, 22vw"
                  />
                ) : null}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-4 text-white">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/70">{product.collection}</p>
                  <p className="mt-1 text-sm font-semibold">{product.shortName}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-[8px] bg-[var(--accent)] px-6 py-7 text-white sm:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white/75">Pedido especial</p>
          <h2 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">
            Te interesa otra remera que no esta en el catalogo?
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85">
            Escribinos por WhatsApp y te buscamos el club, la seleccion, el jugador o la temporada que
            quieras.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <a
              href={otherJerseyHref}
              target="_blank"
              rel="noreferrer"
              className="rounded-[8px] bg-white px-4 py-3 text-sm font-semibold text-[var(--accent)]"
            >
              Chatear al WhatsApp
            </a>
            <span className="rounded-[8px] border border-white/35 px-4 py-3 text-sm font-semibold">
              {whatsappDisplay}
            </span>
          </div>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_25rem]">
          <section id="catalogo" className="min-w-0">
            <div className="grid gap-3 border-y border-[var(--line)] py-4 md:grid-cols-[minmax(0,1fr)_12rem_10rem]">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Messi, Boca, Argentina, Milan..."
                className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm"
              />
              <select
                value={teamFilter}
                onChange={(event) => setTeamFilter(event.target.value)}
                className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm"
              >
                <option value="Todos">Todos los equipos</option>
                {teams.map((team) => (
                  <option key={team} value={team}>
                    {team}
                  </option>
                ))}
              </select>
              <select
                value={sizeFilter}
                onChange={(event) => setSizeFilter(event.target.value)}
                className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm"
              >
                <option value="Todos">Todos los talles</option>
                {sizes.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => {
                const selectedSize = getSelectedSize(product);
                const availableUnits = selectedSize ? availableForSelection(product, selectedSize) : 0;

                return (
                  <article
                    key={product.id}
                    className="flex h-full flex-col rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-4"
                  >
                    <button
                      type="button"
                      onClick={() => openGallery(product)}
                      className="group relative mb-4 aspect-[4/5] overflow-hidden rounded-[8px] border border-[var(--line)] bg-white"
                    >
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.shortName}
                          fill
                          className="object-cover transition duration-300 group-hover:scale-[1.02]"
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[var(--muted)]">
                          Imagen en carga
                        </div>
                      )}
                    </button>

                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                          {product.collection}
                        </p>
                        <h2 className="mt-1 text-lg font-semibold leading-6">{product.shortName}</h2>
                      </div>
                      {product.featured ? (
                        <span className="rounded-[8px] bg-[var(--accent)] px-2 py-1 text-xs font-semibold text-white">
                          Sale rapido
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                      <span>{product.eraLabel}</span>
                      <span>/</span>
                      <span>{product.team}</span>
                      <span>/</span>
                      <span>{product.player}</span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {product.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-[8px] border border-[var(--line)] px-2 py-1 text-xs text-[var(--muted)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="mt-5">
                      <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">Precio final</p>
                      <p className="mt-1 text-2xl font-semibold">{formatArs(product.priceArs)}</p>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        Sena para reservar: {formatArs(depositFor(product.priceArs))}
                      </p>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {product.sizeOptions.map((option) => {
                        const active = selectedSize === option.size;
                        const remaining = availableForSelection(product, option.size);

                        return (
                          <button
                            key={option.size}
                            type="button"
                            onClick={() =>
                              setSelectedSizes((current) => ({
                                ...current,
                                [product.id]: option.size,
                              }))
                            }
                            className={`rounded-[8px] border px-3 py-2 text-sm ${
                              active
                                ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--surface)]"
                                : "border-[var(--line)]"
                            }`}
                          >
                            {option.size} ({remaining})
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-auto pt-5">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => openGallery(product)}
                          className="rounded-[8px] border border-[var(--line)] px-4 py-3 text-sm font-semibold"
                        >
                          Ver foto
                        </button>
                        <button
                          type="button"
                          onClick={() => addToCart(product)}
                          disabled={availableUnits === 0}
                          className="rounded-[8px] bg-[var(--accent-2)] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[var(--line)] disabled:text-[var(--muted)]"
                        >
                          {availableUnits === 0 ? "Sin stock" : "Reservar"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <aside className="h-fit rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5 lg:sticky lg:top-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Reserva</p>
                <h2 className="mt-1 text-xl font-semibold">Cerralo por WhatsApp</h2>
              </div>
              <span className="rounded-[8px] bg-[var(--foreground)] px-3 py-2 text-sm font-semibold text-[var(--surface)]">
                {totals.units}
              </span>
            </div>

            <div className="mt-5 space-y-3 rounded-[8px] border border-[var(--line)] bg-[var(--background)] p-4 text-sm">
              <p className="font-semibold">1. Elegi remera y talle.</p>
              <p className="font-semibold">2. Transferi la sena del 50%.</p>
              <p className="font-semibold">3. Manda el comprobante por WhatsApp.</p>
            </div>

            <div className="mt-5 space-y-3 border-b border-[var(--line)] pb-5">
              {cartDetails.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">
                  Agrega tus remeras y te dejamos el mensaje listo para copiar o mandar.
                </p>
              ) : (
                cartDetails.map((item) => (
                  <div key={`${item.product.id}-${item.size}`} className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{item.product.shortName}</p>
                      <p className="text-xs text-[var(--muted)]">
                        Talle {item.size} / {formatArs(item.product.priceArs)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => changeQuantity(item.product.id, item.size, -1)}
                        className="h-8 w-8 rounded-[8px] border border-[var(--line)] text-sm"
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => changeQuantity(item.product.id, item.size, 1)}
                        disabled={availableForSelection(item.product, item.size) === 0}
                        className="h-8 w-8 rounded-[8px] border border-[var(--line)] text-sm disabled:cursor-not-allowed disabled:text-[var(--muted)]"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-5 grid gap-3">
              <input
                value={customer.name}
                onChange={(event) => updateCustomer("name", event.target.value)}
                placeholder="Nombre y apellido"
                className="rounded-[8px] border border-[var(--line)] bg-[var(--background)] px-4 py-3 text-sm"
              />
              <input
                value={customer.phone}
                onChange={(event) => updateCustomer("phone", event.target.value)}
                placeholder="WhatsApp"
                className="rounded-[8px] border border-[var(--line)] bg-[var(--background)] px-4 py-3 text-sm"
              />
              <input
                value={customer.zone}
                onChange={(event) => updateCustomer("zone", event.target.value)}
                placeholder="Barrio o ciudad"
                className="rounded-[8px] border border-[var(--line)] bg-[var(--background)] px-4 py-3 text-sm"
              />
              <input
                value={customer.instagram}
                onChange={(event) => updateCustomer("instagram", event.target.value)}
                placeholder="Instagram opcional"
                className="rounded-[8px] border border-[var(--line)] bg-[var(--background)] px-4 py-3 text-sm"
              />
              <textarea
                value={customer.notes}
                onChange={(event) => updateCustomer("notes", event.target.value)}
                placeholder="Notas, talle alternativo o consulta"
                rows={4}
                className="rounded-[8px] border border-[var(--line)] bg-[var(--background)] px-4 py-3 text-sm"
              />
            </div>

            <div className="mt-5 space-y-4 rounded-[8px] border border-[var(--line)] bg-[var(--background)] p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--muted)]">Total</span>
                  <strong>{formatArs(totals.ars)}</strong>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--muted)]">Sena para reservar</span>
                  <strong>{formatArs(depositArs)}</strong>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--muted)]">Saldo al entregar</span>
                  <strong>{formatArs(remainingArs)}</strong>
                </div>
              </div>

              <div className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Pago</p>
                {paymentAlias ? (
                  <div className="mt-3 space-y-3">
                    <div className="rounded-[8px] border border-[var(--line)] bg-[var(--background)] px-3 py-3">
                      <p className="text-xs text-[var(--muted)]">Alias Mercado Pago</p>
                      <code className="mt-1 block text-sm font-semibold text-[var(--foreground)]">
                        {paymentAlias}
                      </code>
                    </div>
                    <button
                      type="button"
                      onClick={copyAlias}
                      className="w-full rounded-[8px] border border-[var(--foreground)] px-4 py-3 text-sm font-semibold"
                    >
                      {copiedAlias ? "Alias copiado" : "Copiar alias"}
                    </button>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-[var(--muted)]">
                    En cuanto me pases el alias o el QR, lo dejo conectado aca para que te puedan
                    transferir directo.
                  </p>
                )}

                {paymentQrPath ? (
                  <div className="relative mt-4 aspect-square overflow-hidden rounded-[8px] border border-[var(--line)] bg-white">
                    <Image src={paymentQrPath} alt="QR para reservar" fill className="object-contain p-4" />
                  </div>
                ) : null}

                <p className="mt-4 text-sm text-[var(--muted)]">
                  Despues de transferir la sena, manda la captura del comprobante por WhatsApp.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <button
                type="button"
                onClick={copyOrder}
                disabled={cartDetails.length === 0}
                className="rounded-[8px] border border-[var(--foreground)] px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:border-[var(--line)] disabled:text-[var(--muted)]"
              >
                {copiedOrder ? "Mensaje copiado" : "Copiar mensaje"}
              </button>

              <a
                href={canReserve ? whatsappHref : "#"}
                target="_blank"
                rel="noreferrer"
                className={`rounded-[8px] px-4 py-3 text-center text-sm font-semibold text-white ${
                  canReserve
                    ? "bg-[var(--accent)]"
                    : "pointer-events-none bg-[var(--line)] text-[var(--muted)]"
                }`}
              >
                Quiero reservar y enviar comprobante
              </a>
            </div>
          </aside>
        </div>
      </main>

      {activeGalleryProduct && activeGalleryImage ? (
        <div className="fixed inset-0 z-50 bg-black/82 p-4">
          <div className="mx-auto flex h-full max-w-5xl flex-col gap-4">
            <div className="flex items-center justify-between gap-4 text-white">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-white/70">
                  {activeGalleryProduct.collection}
                </p>
                <h3 className="mt-1 text-xl font-semibold">{activeGalleryProduct.shortName}</h3>
              </div>
              <button
                type="button"
                onClick={() => setGallery(null)}
                className="rounded-[8px] border border-white/30 px-4 py-2 text-sm font-semibold"
              >
                Cerrar
              </button>
            </div>

            <div className="relative flex-1 overflow-hidden rounded-[8px] bg-white">
              <Image
                src={activeGalleryImage}
                alt={activeGalleryProduct.shortName}
                fill
                className="object-contain"
                sizes="100vw"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {activeGalleryProduct.gallery.map((image, index) => (
                  <button
                    key={image}
                    type="button"
                    onClick={() =>
                      setGallery({
                        productId: activeGalleryProduct.id,
                        index,
                      })
                    }
                    className={`relative h-16 w-16 overflow-hidden rounded-[8px] border ${
                      gallery?.index === index ? "border-white" : "border-white/25"
                    }`}
                  >
                    <Image
                      src={image}
                      alt={`${activeGalleryProduct.shortName} ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => moveGallery(-1)}
                  className="rounded-[8px] border border-white/30 px-4 py-3 text-sm font-semibold text-white"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => moveGallery(1)}
                  className="rounded-[8px] border border-white/30 px-4 py-3 text-sm font-semibold text-white"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
