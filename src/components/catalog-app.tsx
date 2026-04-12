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
  email: string;
  zone: string;
  instagram: string;
  notes: string;
};

type GalleryState = {
  productId: string;
  index: number;
};

type CatalogAppProps = CatalogSummary & {
  orderEmail?: string;
  whatsappNumber?: string;
  whatsappDisplay?: string;
  paymentAlias?: string;
  paymentCvu?: string;
  paymentAccountName?: string;
  paymentQrPath?: string;
};

const DEPOSIT_RATE = 0.5;
const ORIGINAL_PRICE_ARS = 79000;
const FEATURED_NATIONAL_TEAMS = ["Argentina", "Brazil", "France", "Spain", "Portugal"] as const;
const FEATURED_CLUB_TEAMS = [
  "Liverpool",
  "Manchester City",
  "Manchester United",
  "Chelsea",
  "Arsenal",
  "Tottenham",
  "Boca Juniors",
  "Juventus",
  "Barcelona",
  "Real Madrid",
  "Atletico Madrid",
  "Borussia Dortmund",
  "Bayern Munich",
  "Flamengo",
  "PSG",
  "Inter",
  "AC Milan",
] as const;

function depositFor(amount: number) {
  return Math.round(amount * DEPOSIT_RATE);
}

function translateProductName(value: string) {
  return value
    .replace(/\bRMA\b/gi, "Real Madrid")
    .replace(/\bBAR\b/gi, "Barcelona")
    .replace(/\bINT\b/gi, "Inter")
    .replace(/\bJUV\b/gi, "Juventus")
    .replace(/\bMan City\b/gi, "Manchester City")
    .replace(/\bHome\b/gi, "Titular")
    .replace(/\bAway\b/gi, "Alternativa")
    .replace(/\bThird\b/gi, "Tercera")
    .replace(/\bPlayer\b/gi, "Version jugador")
    .replace(/\bUCL Final\b/gi, "Final Champions")
    .replace(/\bUCL\b/gi, "Champions")
    .replace(/\bWC2022\b/gi, "Mundial 2022")
    .replace(/\bWC\b/gi, "Mundial")
    .replace(/\b1:1\b/gi, "")
    .replace(/\bFans Soccer Jersey\b/gi, "")
    .replace(/\bSoccer Jersey\b/gi, "")
    .replace(/\bFans\b/gi, "")
    .replace(/\bJersey\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function translateTeamName(team: string) {
  switch (team) {
    case "Brazil":
      return "Brasil";
    case "Spain":
      return "Espana";
    case "France":
      return "Francia";
    case "Germany":
      return "Alemania";
    default:
      return team;
  }
}

function translateTag(tag: string) {
  switch (tag) {
    case "Home":
      return "Titular";
    case "Away":
      return "Alternativa";
    case "Third":
      return "Tercera";
    case "Player":
      return "Version jugador";
    case "UCL":
      return "Champions";
    default:
      return translateTeamName(tag);
  }
}

function buildOrderText(
  items: Array<{
    product: CatalogProduct;
    size: string;
    quantity: number;
  }>,
  customer: Customer,
  totalArs: number,
  depositArs: number,
  orderEmail?: string,
) {
  const itemLines = items.map(
    ({ product, size, quantity }) =>
      `- ${translateProductName(product.shortName)} | talle ${size} | x${quantity} | ${formatArs(
        product.priceArs * quantity,
      )}`,
  );

  return [
    "Hola, quiero pedir estas remeras:",
    "",
    ...itemLines,
    "",
    `Total promocional: ${formatArs(totalArs)}`,
    `Sena estimada (50%): ${formatArs(depositArs)}`,
    "",
    `Nombre: ${customer.name || "-"}`,
    `Telefono: ${customer.phone || "-"}`,
    `Mail: ${customer.email || "-"}`,
    `Zona: ${customer.zone || "-"}`,
    `Instagram: ${customer.instagram || "-"}`,
    `Notas: ${customer.notes || "-"}`,
    "",
    orderEmail
      ? `Mandame la confirmacion a ${orderEmail} y despues coordinamos la sena y la entrega.`
      : "Despues coordinamos la sena y la entrega.",
  ].join("\n");
}

export function CatalogApp({
  products,
  teams,
  teamLogos,
  sizes,
  settings,
  orderEmail,
  whatsappNumber,
  whatsappDisplay = "+1 704 676 2602",
  paymentAlias,
  paymentCvu,
  paymentAccountName,
  paymentQrPath,
}: CatalogAppProps) {
  const [query, setQuery] = useState("");
  const [collectionFilter, setCollectionFilter] = useState("Todas");
  const [teamFilter, setTeamFilter] = useState("Todos");
  const [sizeFilter, setSizeFilter] = useState("Todos");
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>(
    Object.fromEntries(products.map((product) => [product.id, product.sizeOptions[0]?.size ?? ""])),
  );
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<Customer>({
    name: "",
    phone: "",
    email: "",
    zone: "Salta Capital",
    instagram: "",
    notes: "",
  });
  const [copiedOrder, setCopiedOrder] = useState(false);
  const [copiedAlias, setCopiedAlias] = useState(false);
  const [copiedCvu, setCopiedCvu] = useState(false);
  const [gallery, setGallery] = useState<GalleryState | null>(null);

  const cleanWhatsapp = normalizeWhatsapp(whatsappNumber);
  const collections = useMemo(() => [...new Set(products.map((product) => product.collection))], [products]);

  const featuredProducts = useMemo(() => {
    return products.filter((product) => product.image).slice(0, 3);
  }, [products]);

  const topPickProducts = useMemo(() => {
    return products.filter((product) => product.isTopPick).slice(0, 12);
  }, [products]);

  const nationalFilterItems = useMemo(() => {
    return FEATURED_NATIONAL_TEAMS.map((team) => ({
      team,
      logo: teamLogos[team] ?? products.find((product) => product.team === team)?.teamLogo ?? null,
    })).filter((item) => item.logo);
  }, [products, teamLogos]);

  const clubFilterItems = useMemo(() => {
    return FEATURED_CLUB_TEAMS.map((team) => ({
      team,
      logo: teamLogos[team] ?? products.find((product) => product.team === team)?.teamLogo ?? null,
    })).filter((item) => item.logo);
  }, [products, teamLogos]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesQuery = !query || product.searchText.includes(query.toLowerCase());
      const matchesCollection = collectionFilter === "Todas" || product.collection === collectionFilter;
      const matchesTeam = teamFilter === "Todos" || product.team === teamFilter;
      const matchesSize =
        sizeFilter === "Todos" ||
        product.sizeOptions.some((option) => option.size === sizeFilter && option.stock > 0);

      return matchesQuery && matchesCollection && matchesTeam && matchesSize;
    });
  }, [collectionFilter, products, query, sizeFilter, teamFilter]);

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
  const whatsappHref = cleanWhatsapp
    ? `https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(orderText)}`
    : "#";
  const emailHref = orderEmail
    ? `mailto:${orderEmail}?subject=${encodeURIComponent(
        `Pedido web - ${customer.name || "Cliente"}`,
      )}&body=${encodeURIComponent(orderText)}`
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
      <header className="border-b border-[var(--line)] bg-[var(--surface)]">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="rounded-[8px] bg-[#111820] px-4 py-5 text-white sm:px-6">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[8px] bg-white p-2">
                    <Image
                      src="/images/logo-remeras-argentina.png"
                      alt="Logo Remeras Argentina"
                      fill
                      className="object-contain p-2"
                      sizes="64px"
                    />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/60">Remeras en Salta</p>
                    <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Remeras Argentina</h1>
                    <p className="mt-1 text-sm text-white/75">
                      Retro, seleccion y clubes. Reserva facil y coordinacion por WhatsApp.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="rounded-[8px] border border-white/18 bg-white/8 px-3 py-2">
                    {teams.length} equipos
                  </span>
                  <span className="rounded-[8px] border border-white/18 bg-white/8 px-3 py-2">
                    {products.length} modelos
                  </span>
                  <span className="rounded-[8px] border border-white/18 bg-white/8 px-3 py-2">
                    {formatArs(settings.defaultSalePriceArs)} promo
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  href="#catalogo"
                  className="rounded-[8px] bg-white px-4 py-3 text-sm font-semibold text-[#111820]"
                >
                  Ver catalogo
                </a>
                <a
                  href={otherJerseyHref}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-[8px] border border-white/20 bg-white/8 px-4 py-3 text-sm font-semibold text-white"
                >
                  Pedir otra remera
                </a>
                <a
                  href={otherJerseyHref}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-[8px] bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white"
                >
                  WhatsApp {whatsappDisplay}
                </a>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {featuredProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => openGallery(product)}
                    className="group relative min-h-[11rem] overflow-hidden rounded-[8px] border border-white/12 text-left"
                  >
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={product.shortName}
                        fill
                        className="object-cover transition duration-300 group-hover:scale-[1.02]"
                        sizes="(max-width: 640px) 100vw, 33vw"
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-white/70">{product.collection}</p>
                      <p className="mt-1 text-sm font-semibold text-white">
                        {translateProductName(product.shortName)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

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

        <section className="mt-8 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Curado desde GM Kits</p>
              <h2 className="mt-1 text-2xl font-semibold">Las camisetas mas top para sumar</h2>
            </div>
            <a
              href="https://www.gmkitsc.com/New-Arrivals-rc240291.html"
              target="_blank"
              rel="noreferrer"
              className="rounded-[8px] border border-[var(--line)] px-3 py-2 text-sm font-semibold"
            >
              Ver novedades del proveedor
            </a>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {topPickProducts.map((product) => (
              <article
                key={product.id}
                className="flex h-full flex-col rounded-[8px] border border-[var(--line)] bg-[var(--background)] p-4"
              >
                <button
                  type="button"
                  onClick={() => openGallery(product)}
                  className="group relative mb-4 aspect-[4/5] overflow-hidden rounded-[8px] border border-[var(--line)] bg-white"
                >
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={translateProductName(product.shortName)}
                      fill
                      className="object-cover transition duration-300 group-hover:scale-[1.02]"
                      sizes="(max-width: 768px) 100vw, 25vw"
                    />
                  ) : null}
                </button>

                <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                  {translateTeamName(product.team)}
                </p>
                <h3 className="mt-1 text-lg font-semibold leading-6">
                  {translateProductName(product.shortName)}
                </h3>
                <p className="mt-3 text-sm text-[var(--muted)] line-through">{formatArs(ORIGINAL_PRICE_ARS)}</p>
                <p className="mt-1 text-2xl font-semibold">{formatArs(product.priceArs)}</p>

                <div className="mt-auto pt-4">
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
                      className="rounded-[8px] bg-[var(--accent-2)] px-4 py-3 text-sm font-semibold text-white"
                    >
                      Agregar
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-6">
          <div className="overflow-hidden rounded-[8px] border border-[var(--line)]">
            <div className="flex items-center justify-between gap-3 bg-[#303030] px-4 py-3 text-white">
              <h2 className="text-lg font-semibold">Selecciones</h2>
              <button
                type="button"
                onClick={() => {
                  setCollectionFilter("Selecciones");
                  setTeamFilter("Todos");
                  document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="text-sm font-semibold text-white/85"
              >
                Ver todas
              </button>
            </div>

            <div className="grid gap-4 bg-white px-4 py-5 sm:grid-cols-3 lg:grid-cols-5">
              {nationalFilterItems.map((item) => (
                <button
                  key={item.team}
                  type="button"
                  onClick={() => {
                    setCollectionFilter("Selecciones");
                    setTeamFilter(item.team);
                    document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="group flex flex-col items-center justify-center rounded-[8px] px-3 py-2 text-center"
                >
                  <div className="relative h-24 w-24">
                    <Image
                      src={item.logo ?? "/images/logo-remeras-argentina.svg"}
                      alt={translateTeamName(item.team)}
                      fill
                      className="object-contain transition duration-300 group-hover:scale-[1.04]"
                      sizes="96px"
                    />
                  </div>
                  <p className="mt-3 text-base font-semibold">{translateTeamName(item.team)}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-[8px] border border-[var(--line)]">
            <div className="flex items-center justify-between gap-3 bg-[#303030] px-4 py-3 text-white">
              <h2 className="text-lg font-semibold">Clubes</h2>
              <button
                type="button"
                onClick={() => {
                  setCollectionFilter("Clubes");
                  setTeamFilter("Todos");
                  document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="text-sm font-semibold text-white/85"
              >
                Ver todos
              </button>
            </div>

            <div className="grid gap-4 bg-white px-4 py-5 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
              {clubFilterItems.map((item) => (
                <button
                  key={item.team}
                  type="button"
                  onClick={() => {
                    setCollectionFilter("Clubes");
                    setTeamFilter(item.team);
                    document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="group flex flex-col items-center justify-center rounded-[8px] px-2 py-2 text-center"
                >
                  <div className="relative h-20 w-20">
                    <Image
                      src={item.logo ?? "/images/logo-remeras-argentina.svg"}
                      alt={translateTeamName(item.team)}
                      fill
                      className="object-contain transition duration-300 group-hover:scale-[1.04]"
                      sizes="80px"
                    />
                  </div>
                  <p className="mt-3 text-sm font-semibold">{translateTeamName(item.team)}</p>
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_25rem]">
          <section id="catalogo" className="min-w-0">
            <div className="grid gap-3 border-y border-[var(--line)] py-4 xl:grid-cols-[minmax(0,1fr)_12rem_12rem_10rem]">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Messi, Boca, Argentina, Milan..."
                className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm"
              />
              <select
                value={collectionFilter}
                onChange={(event) => setCollectionFilter(event.target.value)}
                className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm"
              >
                <option value="Todas">Todas las categorias</option>
                {collections.map((collection) => (
                  <option key={collection} value={collection}>
                    {collection}
                  </option>
                ))}
              </select>
              <select
                value={teamFilter}
                onChange={(event) => setTeamFilter(event.target.value)}
                className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm"
              >
                <option value="Todos">Todos los equipos</option>
                {teams.map((team) => (
                  <option key={team} value={team}>
                    {translateTeamName(team)}
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
                        <h2 className="mt-1 text-lg font-semibold leading-6">
                          {translateProductName(product.shortName)}
                        </h2>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                      <span>{product.eraLabel}</span>
                      <span>/</span>
                      <span>{translateTeamName(product.team)}</span>
                      <span>/</span>
                      <span>{product.player}</span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {product.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-[8px] border border-[var(--line)] px-2 py-1 text-xs text-[var(--muted)]"
                        >
                          {translateTag(tag)}
                        </span>
                      ))}
                    </div>

                    <div className="mt-5">
                      <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">Precio promocional</p>
                      <p className="mt-1 text-sm text-[var(--muted)] line-through">
                        {formatArs(ORIGINAL_PRICE_ARS)}
                      </p>
                      <p className="mt-1 text-2xl font-semibold">{formatArs(product.priceArs)}</p>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        Sena estimada: {formatArs(depositFor(product.priceArs))}
                      </p>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {product.sizeOptions.map((option) => {
                        const active = selectedSize === option.size;

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
                            {option.size}
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
                          className="rounded-[8px] bg-[var(--accent-2)] px-4 py-3 text-sm font-semibold text-white"
                        >
                          Agregar
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
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Pedido</p>
                <h2 className="mt-1 text-xl font-semibold">Arma tu carrito</h2>
              </div>
              <span className="rounded-[8px] bg-[var(--foreground)] px-3 py-2 text-sm font-semibold text-[var(--surface)]">
                {totals.units}
              </span>
            </div>

            <div className="mt-5 space-y-3 rounded-[8px] border border-[var(--line)] bg-[var(--background)] p-4 text-sm">
              <p className="font-semibold">1. Elegi remera y talle.</p>
              <p className="font-semibold">2. Envia el pedido por mail o WhatsApp.</p>
              <p className="font-semibold">3. Te confirmamos llegada, precio final y sena.</p>
            </div>

            <div className="mt-5 space-y-3 border-b border-[var(--line)] pb-5">
              {cartDetails.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">
                  Agrega tus remeras y te dejamos el pedido listo para enviar.
                </p>
              ) : (
                cartDetails.map((item) => (
                  <div key={`${item.product.id}-${item.size}`} className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{translateProductName(item.product.shortName)}</p>
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
                value={customer.email}
                onChange={(event) => updateCustomer("email", event.target.value)}
                placeholder="Mail"
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
                  <span className="text-[var(--muted)]">Precio original</span>
                  <strong className="line-through">{formatArs(ORIGINAL_PRICE_ARS * totals.units)}</strong>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--muted)]">Total promocional</span>
                  <strong>{formatArs(totals.ars)}</strong>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--muted)]">Sena estimada</span>
                  <strong>{formatArs(depositArs)}</strong>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--muted)]">Saldo estimado</span>
                  <strong>{formatArs(remainingArs)}</strong>
                </div>
              </div>

              <div className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Como sigue</p>
                {paymentAlias || paymentCvu || paymentAccountName ? (
                  <div className="mt-3 space-y-3">
                    <div className="rounded-[8px] border border-[var(--line)] bg-[var(--background)] px-3 py-3">
                      <p className="text-xs text-[var(--muted)]">Alias Mercado Pago</p>
                      <code className="mt-1 block text-sm font-semibold text-[var(--foreground)]">
                        {paymentAlias || "-"}
                      </code>
                    </div>

                    {paymentCvu ? (
                      <div className="rounded-[8px] border border-[var(--line)] bg-[var(--background)] px-3 py-3">
                        <p className="text-xs text-[var(--muted)]">CVU</p>
                        <code className="mt-1 block break-all text-sm font-semibold text-[var(--foreground)]">
                          {paymentCvu}
                        </code>
                      </div>
                    ) : null}

                    {paymentAccountName ? (
                      <div className="rounded-[8px] border border-[var(--line)] bg-[var(--background)] px-3 py-3">
                        <p className="text-xs text-[var(--muted)]">Titular</p>
                        <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                          {paymentAccountName}
                        </p>
                      </div>
                    ) : null}

                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={copyAlias}
                        disabled={!paymentAlias}
                        className="w-full rounded-[8px] border border-[var(--foreground)] px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:border-[var(--line)] disabled:text-[var(--muted)]"
                      >
                        {copiedAlias ? "Alias copiado" : "Copiar alias"}
                      </button>
                      <button
                        type="button"
                        onClick={copyCvu}
                        disabled={!paymentCvu}
                        className="w-full rounded-[8px] border border-[var(--foreground)] px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:border-[var(--line)] disabled:text-[var(--muted)]"
                      >
                        {copiedCvu ? "CVU copiado" : "Copiar CVU"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-[var(--muted)]">
                    Cuando confirmemos disponibilidad, te pasamos por mail o por WhatsApp el alias o el
                    QR para la sena.
                  </p>
                )}

                {paymentQrPath ? (
                  <div className="relative mt-4 aspect-square overflow-hidden rounded-[8px] border border-[var(--line)] bg-white">
                    <Image src={paymentQrPath} alt="QR para reservar" fill className="object-contain p-4" />
                  </div>
                ) : null}

                <p className="mt-4 text-sm text-[var(--muted)]">
                  Primero recibimos el pedido y despues coordinamos la compra, la sena y la fecha de
                  entrega.
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
                {copiedOrder ? "Pedido copiado" : "Copiar pedido"}
              </button>

              <a
                href={canSendOrder ? emailHref : "#"}
                className={`rounded-[8px] px-4 py-3 text-center text-sm font-semibold text-white ${
                  canSendOrder && orderEmail
                    ? "bg-[var(--foreground)]"
                    : "pointer-events-none bg-[var(--line)] text-[var(--muted)]"
                }`}
              >
                Enviar pedido por mail
              </a>

              <a
                href={canSendOrder ? whatsappHref : "#"}
                target="_blank"
                rel="noreferrer"
                className={`rounded-[8px] px-4 py-3 text-center text-sm font-semibold text-white ${
                  canSendOrder
                    ? "bg-[var(--accent)]"
                    : "pointer-events-none bg-[var(--line)] text-[var(--muted)]"
                }`}
              >
                Hablar por WhatsApp
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
                <h3 className="mt-1 text-xl font-semibold">
                  {translateProductName(activeGalleryProduct.shortName)}
                </h3>
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
