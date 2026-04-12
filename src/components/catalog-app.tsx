"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { formatArs, formatUsd, normalizeWhatsapp } from "@/lib/catalog";
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
  notes: string;
};

type CatalogAppProps = CatalogSummary & {
  whatsappNumber?: string;
};

const GALLERY = [
  {
    src: "/images/stadium.jpg",
    alt: "Cancha de futbol con tribunas llenas",
    label: "Entrega en Salta",
  },
  {
    src: "/images/market-stall.jpg",
    alt: "Puesto con camisetas de futbol",
    label: "Retro y clasicas",
  },
  {
    src: "/images/jersey-wall.jpg",
    alt: "Muro con camisetas de futbol colgadas",
    label: "Clubes y seleccion",
  },
] as const;

function buildOrderMessage(
  items: Array<{
    product: CatalogProduct;
    size: string;
    quantity: number;
  }>,
  customer: Customer,
  totalUsd: number,
  totalArs: number,
) {
  const itemLines = items.map(
    ({ product, size, quantity }) =>
      `- ${product.shortName} | talle ${size} | x${quantity} | ${formatUsd(product.priceUsd * quantity)}`,
  );

  return [
    "Hola! Quiero reservar estas remeras:",
    "",
    ...itemLines,
    "",
    `Total estimado: ${formatUsd(totalUsd)} / ${formatArs(totalArs)}`,
    "",
    `Nombre: ${customer.name || "-"}`,
    `Telefono: ${customer.phone || "-"}`,
    `Zona: ${customer.zone || "-"}`,
    `Notas: ${customer.notes || "-"}`,
  ].join("\n");
}

export function CatalogApp({
  products,
  teams,
  sizes,
  settings,
  whatsappNumber,
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
    notes: "",
  });
  const [copied, setCopied] = useState(false);

  const cleanWhatsapp = normalizeWhatsapp(whatsappNumber);

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
        accumulator.usd += item.product.priceUsd * item.quantity;
        accumulator.ars += item.product.priceArs * item.quantity;
        accumulator.units += item.quantity;
        return accumulator;
      },
      { usd: 0, ars: 0, units: 0 },
    );
  }, [cartDetails]);

  const canReserve = cartDetails.length > 0 && customer.name.trim() !== "" && customer.phone.trim() !== "";
  const orderMessage = buildOrderMessage(cartDetails, customer, totals.usd, totals.ars);
  const whatsappHref = cleanWhatsapp
    ? `https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(orderMessage)}`
    : "";

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

  async function copyOrder() {
    await navigator.clipboard.writeText(orderMessage);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-[var(--line)] bg-[var(--background)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Remeras Argentina</p>
            <h1 className="text-xl font-semibold">Catalogo para Salta</h1>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="rounded-[8px] border border-[var(--line)] px-3 py-2 text-[var(--muted)]">
              {settings.unitsForSale} listas
            </span>
            <a
              href="/ingresar"
              className="rounded-[8px] border border-[var(--foreground)] px-3 py-2 transition hover:bg-[var(--foreground)] hover:text-[var(--background)]"
            >
              Admin
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_23rem] lg:px-8">
        <section className="min-w-0">
          <div className="grid gap-3 sm:grid-cols-3">
            {GALLERY.map((image) => (
              <figure key={image.src} className="overflow-hidden rounded-[8px] border border-[var(--line)]">
                <div className="relative h-40">
                  <Image src={image.src} alt={image.alt} fill className="object-cover" sizes="(max-width: 640px) 100vw, 33vw" />
                </div>
                <figcaption className="border-t border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-medium">
                  {image.label}
                </figcaption>
              </figure>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            <span className="rounded-[8px] bg-[var(--surface)] px-3 py-2">{products.length} modelos</span>
            <span className="rounded-[8px] bg-[var(--surface)] px-3 py-2">{settings.unitsPurchased} prendas en total</span>
            <span className="rounded-[8px] bg-[var(--surface)] px-3 py-2">{teams.length} grupos</span>
            <span className="rounded-[8px] bg-[var(--surface)] px-3 py-2">
              {formatUsd(settings.defaultSalePriceUsd)} por remera
            </span>
          </div>

          <div className="mt-6 grid gap-3 border-y border-[var(--line)] py-4 md:grid-cols-[minmax(0,1fr)_11rem_9rem]">
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
              <option value="Todos">Todos los grupos</option>
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
                  <div className="relative mb-4 aspect-[4/5] overflow-hidden rounded-[8px] border border-[var(--line)] bg-white">
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={product.shortName}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[var(--muted)]">
                        Imagen en carga
                      </div>
                    )}
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{product.collection}</p>
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
                    <span>•</span>
                    <span>{product.team}</span>
                    <span>•</span>
                    <span>{product.player}</span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {product.tags.map((tag) => (
                      <span key={tag} className="rounded-[8px] border border-[var(--line)] px-2 py-1 text-xs text-[var(--muted)]">
                        {tag}
                      </span>
                    ))}
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
                          className={`rounded-[8px] border px-3 py-2 text-sm transition ${
                            active
                              ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                              : "border-[var(--line)] bg-transparent"
                          }`}
                        >
                          {option.size} {remaining > 0 ? `(${remaining})` : "(0)"}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-5 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-sm text-[var(--muted)]">{formatArs(product.priceArs)}</p>
                      <p className="text-2xl font-semibold">{formatUsd(product.priceUsd)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => addToCart(product)}
                      disabled={availableUnits === 0}
                      className="rounded-[8px] bg-[var(--accent-2)] px-4 py-3 text-sm font-semibold text-white transition enabled:hover:brightness-95 disabled:cursor-not-allowed disabled:bg-[var(--line)] disabled:text-[var(--muted)]"
                    >
                      {availableUnits === 0 ? "Sin stock" : "Reservar"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="h-fit rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5 lg:sticky lg:top-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Pedido</p>
              <h2 className="mt-1 text-xl font-semibold">Reserva</h2>
            </div>
            <span className="rounded-[8px] bg-[var(--foreground)] px-3 py-2 text-sm font-semibold text-[var(--background)]">
              {totals.units}
            </span>
          </div>

          <div className="mt-5 space-y-3 border-b border-[var(--line)] pb-5">
            {cartDetails.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">Elegi remeras y te queda listo el mensaje para enviar.</p>
            ) : (
              cartDetails.map((item) => (
                <div key={`${item.product.id}-${item.size}`} className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{item.product.shortName}</p>
                    <p className="text-xs text-[var(--muted)]">
                      Talle {item.size} • {formatUsd(item.product.priceUsd)}
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
              onChange={(event) => setCustomer((current) => ({ ...current, name: event.target.value }))}
              placeholder="Nombre"
              className="rounded-[8px] border border-[var(--line)] bg-[var(--background)] px-4 py-3 text-sm"
            />
            <input
              value={customer.phone}
              onChange={(event) => setCustomer((current) => ({ ...current, phone: event.target.value }))}
              placeholder="Telefono"
              className="rounded-[8px] border border-[var(--line)] bg-[var(--background)] px-4 py-3 text-sm"
            />
            <input
              value={customer.zone}
              onChange={(event) => setCustomer((current) => ({ ...current, zone: event.target.value }))}
              placeholder="Zona"
              className="rounded-[8px] border border-[var(--line)] bg-[var(--background)] px-4 py-3 text-sm"
            />
            <textarea
              value={customer.notes}
              onChange={(event) => setCustomer((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Notas"
              rows={4}
              className="rounded-[8px] border border-[var(--line)] bg-[var(--background)] px-4 py-3 text-sm"
            />
          </div>

          <div className="mt-5 space-y-2 border-y border-[var(--line)] py-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--muted)]">Total en USD</span>
              <strong>{formatUsd(totals.usd)}</strong>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--muted)]">Total en pesos</span>
              <strong>{formatArs(totals.ars)}</strong>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <button
              type="button"
              onClick={copyOrder}
              disabled={cartDetails.length === 0}
              className="rounded-[8px] border border-[var(--foreground)] px-4 py-3 text-sm font-semibold transition hover:bg-[var(--foreground)] hover:text-[var(--background)] disabled:cursor-not-allowed disabled:border-[var(--line)] disabled:text-[var(--muted)] disabled:hover:bg-transparent"
            >
              {copied ? "Pedido copiado" : "Copiar pedido"}
            </button>

            {cleanWhatsapp ? (
              <a
                href={canReserve ? whatsappHref : "#"}
                target="_blank"
                rel="noreferrer"
                className={`rounded-[8px] px-4 py-3 text-center text-sm font-semibold text-white transition ${
                  canReserve ? "bg-[var(--accent)] hover:brightness-95" : "pointer-events-none bg-[var(--line)] text-[var(--muted)]"
                }`}
              >
                Enviar por WhatsApp
              </a>
            ) : (
              <p className="text-sm text-[var(--muted)]">Configura `NEXT_PUBLIC_WHATSAPP_NUMBER` para activar WhatsApp.</p>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
