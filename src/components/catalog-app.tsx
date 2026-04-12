"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

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

type ThemeMode = "light" | "dark";

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
const THEME_STORAGE_KEY = "remeras-theme";
const FEATURED_NATIONAL_TEAMS = ["Argentina", "Brazil", "France", "Italy", "Croatia", "Spain", "Portugal"] as const;
const FEATURED_CLUB_TEAMS = [
  "Liverpool",
  "Manchester City",
  "Manchester United",
  "Chelsea",
  "Arsenal",
  "Boca Juniors",
  "River Plate",
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
  "Leverkusen",
  "Napoli",
  "Racing Club",
  "CA Independiente",
  "Santos FC",
  "Aston Villa",
] as const;

function resolveThemePreference(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }

  const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === "light" || saved === "dark") {
    return saved;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

const REQUIRED_RETRO_GROUPS = [
  {
    title: "Argentina y locales",
    items: [
      "Argentina alternativa 1994 #10 Maradona",
      "Argentina titular 1986 #10 Maradona",
      "Argentina titular 1990",
      "Boca Juniors 2001 #10 Riquelme",
      "Boca Juniors 2003 Tevez",
      "Boca Juniors 1997 #10 Maradona",
      "River Plate 1996 Libertadores",
      "River Plate 2001 #10 Aimar",
    ],
  },
  {
    title: "Selecciones",
    items: [
      "Francia 1998 #10 Zidane",
      "Francia 2006 #10 Zidane",
      "Brasil 1994 Romario",
      "Brasil 2002 #9 Ronaldo",
      "Croacia 1998 Suker",
      "Colombia 1998 Valderrama",
      "Japon 1998 Nakata",
    ],
  },
  {
    title: "Clubes de Europa",
    items: [
      "Manchester United 2008 #7 Cristiano Ronaldo",
      "Manchester United 1999 #7 Beckham",
      "Barcelona 2009 #10 Messi",
      "Barcelona 2006 #10 Ronaldinho",
      "AC Milan 2006 #22 Kaka",
    ],
  },
  {
    title: "Diferenciadoras",
    items: [
      "Inter 2010 #22 Milito",
      "Fiorentina 1998 #9 Batistuta",
      "Real Madrid 1999 #6 Redondo",
      "Santos 2012 #11 Neymar",
    ],
  },
] as const;

function depositFor(amount: number) {
  return Math.round(amount * DEPOSIT_RATE);
}

function translateProductName(value: string) {
  return value
    .replace(/\bLIV\b/gi, "Liverpool")
    .replace(/\bCHE\b/gi, "Chelsea")
    .replace(/\bARS\b/gi, "Arsenal")
    .replace(/\bRMA\b/gi, "Real Madrid")
    .replace(/\bBAR\b/gi, "Barcelona")
    .replace(/\bINT\b/gi, "Inter")
    .replace(/\bJUV\b/gi, "Juventus")
    .replace(/\bATM\b/gi, "Atletico Madrid")
    .replace(/\bACM\b/gi, "AC Milan")
    .replace(/\bMan City\b/gi, "Manchester City")
    .replace(/\bPlayer Version\b/gi, "Version jugador")
    .replace(/\bLong Sleeve\b/gi, "Manga larga")
    .replace(/\bHome\b/gi, "Titular")
    .replace(/\bAway\b/gi, "Alternativa")
    .replace(/\bThird\b/gi, "Tercera")
    .replace(/\bFourth\b/gi, "Cuarta")
    .replace(/\bPlayer\b/gi, "Version jugador")
    .replace(/\bSpecial Edition\b/gi, "Edicion especial")
    .replace(/\bJoint Edition\b/gi, "Edicion conjunta")
    .replace(/\bAnniversary\b/gi, "Aniversario")
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
    case "Italy":
      return "Italia";
    case "Croatia":
      return "Croacia";
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

function buildRetroRequestHref(cleanWhatsapp: string, item: string) {
  if (!cleanWhatsapp) {
    return "#";
  }

  return `https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
    `Hola, quiero pedir esta retro: ${item}. Me confirmas precio y tiempo de llegada?`,
  )}`;
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
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof document !== "undefined") {
      const currentTheme = document.documentElement.dataset.theme;
      if (currentTheme === "light" || currentTheme === "dark") {
        return currentTheme;
      }
    }

    return resolveThemePreference();
  });
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
    const seenTeams = new Set<string>();

    return products
      .filter((product) => product.image)
      .filter((product) => {
        if (seenTeams.has(product.team)) {
          return false;
        }

        seenTeams.add(product.team);
        return true;
      })
      .slice(0, 3);
  }, [products]);

  const topPickProducts = useMemo(() => {
    return products.filter((product) => product.isTopPick).slice(0, 18);
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

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (!gallery) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setGallery(null);
      }
      if (event.key === "ArrowLeft" && activeGalleryProduct && activeGalleryProduct.gallery.length > 0) {
        event.preventDefault();
        const total = activeGalleryProduct.gallery.length;
        setGallery((current) =>
          current
            ? {
                productId: current.productId,
                index: (current.index - 1 + total) % total,
              }
            : current,
        );
      }
      if (event.key === "ArrowRight" && activeGalleryProduct && activeGalleryProduct.gallery.length > 0) {
        event.preventDefault();
        const total = activeGalleryProduct.gallery.length;
        setGallery((current) =>
          current
            ? {
                productId: current.productId,
                index: (current.index + 1) % total,
              }
            : current,
        );
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [gallery, activeGalleryProduct]);

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
      <header className="border-b border-[var(--line)] bg-[var(--background)]">
        <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
            <div className="flex justify-center lg:justify-start">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-2 shadow-[var(--soft-shadow)]">
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  Salta Importando
                </span>
              </div>
            </div>

            <div className="flex justify-center">
              <div className="inline-flex max-w-full items-center gap-3 rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-3 shadow-[var(--soft-shadow)]">
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-[var(--background)]">
                  <Image
                    src="/images/logo-remeras-argentina.svg"
                    alt="Logo Salta Importando"
                    fill
                    className="object-contain p-2"
                    sizes="44px"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
                    Catalogo de remeras en Salta
                  </p>
                  <p className="truncate text-lg font-black leading-none sm:text-xl">Salta Importando</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">Remeras Argentina</p>
                </div>
              </div>
            </div>

            <div className="flex justify-center lg:justify-end">
              <div
                suppressHydrationWarning
                className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--surface)] p-1 shadow-[var(--soft-shadow)]"
              >
                <span className="hidden pl-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)] sm:block">
                  Tema
                </span>
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  aria-pressed={theme === "light"}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    theme === "light" ? "bg-[var(--accent)] text-white" : "text-[var(--muted)]"
                  }`}
                >
                  Claro
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  aria-pressed={theme === "dark"}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    theme === "dark" ? "bg-[var(--accent)] text-white" : "text-[var(--muted)]"
                  }`}
                >
                  Oscuro
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div
            className="overflow-hidden rounded-[8px] border border-[var(--hero-line)] shadow-[var(--soft-shadow)]"
            style={{ backgroundImage: "linear-gradient(135deg, var(--hero-start), var(--hero-end))" }}
          >
            <div className="px-4 py-5 text-[var(--hero-foreground)] sm:px-6 sm:py-6">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                  <div className="max-w-3xl">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--hero-muted)]">
                      Entrega en Salta, reserva facil y seña del 50%
                    </p>
                    <h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
                      Remeras retro, de seleccion y de clubes listas para vender en Salta.
                    </h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--hero-muted)]">
                      Elegis el modelo, armas el pedido y coordinamos la reserva por WhatsApp. Todo en
                      pesos y sin vueltas.
                    </p>
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
                    <span className="rounded-[8px] border border-white/18 bg-white/8 px-3 py-2">Sena 50%</span>
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
                      className="group relative min-h-[11rem] overflow-hidden rounded-[8px] border border-white/12 bg-white/5 text-left"
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
                        <p className="text-xs uppercase tracking-[0.16em] text-white/70">
                          {product.collection}
                        </p>
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
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Filtros rapidos</p>
              <h2 className="mt-1 text-2xl font-semibold">Explora por seleccion o club</h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setCollectionFilter("Todas");
                setTeamFilter("Todos");
                document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="rounded-[8px] border border-[var(--line)] px-4 py-2 text-sm font-semibold"
            >
              Ver todo el catalogo
            </button>
          </div>

          <div className="mt-6 overflow-hidden rounded-[8px] border border-[var(--line)]">
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

            <div className="overflow-x-auto bg-white px-4 py-5">
              <div className="grid min-w-max grid-flow-col gap-3 md:min-w-0 md:grid-flow-row md:grid-cols-3 lg:grid-cols-5">
                {nationalFilterItems.map((item) => (
                  <button
                    key={item.team}
                    type="button"
                    onClick={() => {
                      setCollectionFilter("Selecciones");
                      setTeamFilter(item.team);
                      document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="group flex min-h-[8.5rem] w-[6.6rem] flex-col items-center justify-center rounded-[8px] border border-transparent px-3 py-3 text-center transition hover:border-[var(--line)] hover:bg-[var(--background)] md:min-h-[9rem] md:w-auto"
                  >
                    <div className="relative h-20 w-20 md:h-24 md:w-24">
                      <Image
                        src={item.logo ?? "/images/logo-remeras-argentina.svg"}
                        alt={translateTeamName(item.team)}
                        fill
                        className="object-contain transition duration-300 group-hover:scale-[1.04]"
                        sizes="96px"
                      />
                    </div>
                    <p className="mt-3 text-sm font-semibold md:text-base">{translateTeamName(item.team)}</p>
                  </button>
                ))}
              </div>
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

            <div className="overflow-x-auto bg-white px-4 py-5">
              <div className="grid min-w-max grid-flow-col gap-3 md:min-w-0 md:grid-flow-row md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
                {clubFilterItems.map((item) => (
                  <button
                    key={item.team}
                    type="button"
                    onClick={() => {
                      setCollectionFilter("Clubes");
                      setTeamFilter(item.team);
                      document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="group flex min-h-[8.4rem] w-[6.3rem] flex-col items-center justify-center rounded-[8px] border border-transparent px-2 py-3 text-center transition hover:border-[var(--line)] hover:bg-[var(--background)] md:min-h-[8.8rem] md:w-auto"
                  >
                    <div className="relative h-16 w-16 md:h-20 md:w-20">
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
          </div>
        </section>

        <section className="mt-8 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Base de ventas</p>
              <h2 className="mt-1 text-2xl font-semibold">Retros que no pueden faltar</h2>
            </div>
            <a
              href={otherJerseyHref}
              target="_blank"
              rel="noreferrer"
              className="rounded-[8px] border border-[var(--line)] px-4 py-2 text-sm font-semibold"
            >
              Pedir una que no ves
            </a>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {REQUIRED_RETRO_GROUPS.map((group) => (
              <div
                key={group.title}
                className="rounded-[8px] border border-[var(--line)] bg-[var(--background)] p-4"
              >
                <h3 className="text-lg font-semibold">{group.title}</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {group.items.map((item) => (
                    <a
                      key={item}
                      href={buildRetroRequestHref(cleanWhatsapp, item)}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3 py-3 text-sm font-semibold leading-5 transition hover:border-[var(--foreground)]"
                    >
                      {item}
                    </a>
                  ))}
                </div>
              </div>
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

        <section className="mt-8 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Modelos destacados</p>
              <h2 className="mt-1 text-2xl font-semibold">Las camisetas mas top para sumar</h2>
            </div>
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
        <div
          className="fixed inset-0 z-50 bg-[rgba(7,11,17,0.60)] p-3 backdrop-blur-[8px] sm:p-4"
          onClick={() => setGallery(null)}
        >
          <div
            className="mx-auto flex h-full max-w-5xl flex-col gap-3 sm:gap-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 rounded-[8px] border border-white/12 bg-[rgba(10,15,22,0.78)] px-4 py-3 text-white shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur-md">
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
                className="shrink-0 rounded-[8px] border border-white/20 bg-white px-4 py-2 text-sm font-semibold text-[#111820] shadow-sm"
              >
                Cerrar
              </button>
            </div>

            <div className="relative flex-1 overflow-hidden rounded-[8px] border border-white/14 bg-[rgba(255,255,255,0.96)] shadow-[0_22px_70px_rgba(0,0,0,0.32)]">
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-black/12 to-transparent sm:w-16" />
              <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-black/12 to-transparent sm:w-16" />
              <Image
                src={activeGalleryImage}
                alt={activeGalleryProduct.shortName}
                fill
                className="object-contain p-3 sm:p-5"
                sizes="100vw"
              />
            </div>

            <div className="flex flex-col gap-3 rounded-[8px] border border-white/12 bg-[rgba(10,15,22,0.74)] px-3 py-3 text-white shadow-[0_16px_50px_rgba(0,0,0,0.28)] backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
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
                      gallery?.index === index
                        ? "border-white bg-white/10"
                        : "border-white/20 bg-black/10"
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
                  className="rounded-[8px] border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => moveGallery(1)}
                  className="rounded-[8px] border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white"
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
