"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { buildWhatsappHref, formatArs } from "@/lib/catalog";
import {
  depositFor,
  loadStoredCart,
  ORIGINAL_PRICE_ARS,
  resolveThemePreference,
  saveStoredCart,
  THEME_STORAGE_KEY,
  translateProductName,
  translateTag,
  translateTeamName,
  type CartItem,
  type ThemeMode,
} from "@/lib/storefront";
import type { CatalogProduct, CatalogSummary } from "@/types/catalog";

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

const HOME_TEAM_PRIORITY = [
  { team: "Argentina", label: "Argentina" },
  { team: "Boca Juniors", label: "Boca Juniors" },
  { team: "River Plate", label: "River Plate" },
  { team: "Barcelona", label: "Barcelona" },
  { team: "Real Madrid", label: "Real Madrid" },
] as const;

export function CatalogApp({
  products,
  teams,
  teamLogos,
  sizes,
  whatsappNumber,
  whatsappDisplay = "+1 704 676 2602",
}: CatalogAppProps) {
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const cartNoticeTimeoutRef = useRef<number | null>(null);
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
  const [query, setQuery] = useState("");
  const [collectionFilter, setCollectionFilter] = useState("Todas");
  const [teamFilter, setTeamFilter] = useState("Todos");
  const [sizeFilter, setSizeFilter] = useState("Todos");
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>(
    Object.fromEntries(products.map((product) => [product.id, product.sizeOptions[0]?.size ?? ""])),
  );
  const [cart, setCart] = useState<CartItem[]>(() => loadStoredCart());
  const [cartNotice, setCartNotice] = useState<string | null>(null);
  const [gallery, setGallery] = useState<GalleryState | null>(null);
  const [catalogMenuOpen, setCatalogMenuOpen] = useState(false);

  const homeFeaturedSections = useMemo(() => {
    return HOME_TEAM_PRIORITY.map(({ team, label }) => {
      const sectionProducts = products
        .filter((product) => product.team === team && product.image)
        .sort((left, right) => Number(right.isTopPick) - Number(left.isTopPick))
        .slice(0, 6);

      return {
        team,
        label,
        collection: sectionProducts[0]?.collection ?? "Clubes",
        products: sectionProducts,
      };
    }).filter((section) => section.products.length > 0);
  }, [products]);

  const drawerItems = useMemo(() => {
    const teamOrder = new Map<string, number>(
      HOME_TEAM_PRIORITY.map((item, index) => [item.team, index]),
    );
    const teamDetails = teams.map((team) => ({
      team,
      collection: products.find((product) => product.team === team)?.collection ?? "Clubes",
      logo: teamLogos[team] ?? products.find((product) => product.team === team)?.teamLogo ?? null,
    }));

    const sorter = (left: { team: string }, right: { team: string }) => {
      const leftPriority = teamOrder.get(left.team) ?? Number.MAX_SAFE_INTEGER;
      const rightPriority = teamOrder.get(right.team) ?? Number.MAX_SAFE_INTEGER;
      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }
      return translateTeamName(left.team).localeCompare(translateTeamName(right.team), "es");
    };

    return {
      national: teamDetails.filter((item) => item.collection === "Selecciones").sort(sorter),
      clubs: teamDetails.filter((item) => item.collection === "Clubes").sort(sorter),
    };
  }, [products, teamLogos, teams]);

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

  const cartUnits = useMemo(
    () => (isClient ? cart : []).reduce((total, item) => total + item.quantity, 0),
    [cart, isClient],
  );
  const otherJerseyHref = buildWhatsappHref(
    whatsappNumber,
    "Hola, quiero una remera que no vi en el catalogo. Me pasas modelos y precio?",
  );

  function scrollToCatalog() {
    window.setTimeout(() => {
      document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" });
    }, 20);
  }

  function openCatalogWithTeam(team: string) {
    const nextCollection = products.find((product) => product.team === team)?.collection ?? "Todas";
    setCollectionFilter(nextCollection);
    setTeamFilter(team);
    setSizeFilter("Todos");
    setQuery("");
    setCatalogMenuOpen(false);
    scrollToCatalog();
  }

  function openCatalogWithCollection(collection: string) {
    setCollectionFilter(collection);
    setTeamFilter("Todos");
    setSizeFilter("Todos");
    setQuery("");
    setCatalogMenuOpen(false);
    scrollToCatalog();
  }

  function resetCatalogFilters() {
    setCollectionFilter("Todas");
    setTeamFilter("Todos");
    setSizeFilter("Todos");
    setQuery("");
    setCatalogMenuOpen(false);
    scrollToCatalog();
  }

  function openCatalogMenu() {
    setCatalogMenuOpen(true);
  }

  function openSearchMenu() {
    setCatalogMenuOpen(true);
    window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 90);
  }

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
    if (!isClient) {
      return;
    }

    saveStoredCart(cart);
  }, [cart, isClient]);

  useEffect(() => {
    if (!gallery && !catalogMenuOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (gallery) {
          setGallery(null);
        }
        if (catalogMenuOpen) {
          setCatalogMenuOpen(false);
        }
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
  }, [gallery, activeGalleryProduct, catalogMenuOpen]);

  useEffect(() => {
    if (!catalogMenuOpen) {
      return;
    }

    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 80);

    return () => window.clearTimeout(timer);
  }, [catalogMenuOpen]);

  function getSelectedSize(product: CatalogProduct) {
    return selectedSizes[product.id] ?? product.sizeOptions[0]?.size ?? "";
  }

  function reservedInCart(productId: string, size: string) {
    const sourceCart = isClient ? cart : [];
    return sourceCart.find((item) => item.productId === productId && item.size === size)?.quantity ?? 0;
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

    setCartNotice("Agregado al carrito");
    if (cartNoticeTimeoutRef.current) {
      window.clearTimeout(cartNoticeTimeoutRef.current);
    }
    cartNoticeTimeoutRef.current = window.setTimeout(() => {
      setCartNotice(null);
      cartNoticeTimeoutRef.current = null;
    }, 1800);
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

  useEffect(() => {
    return () => {
      if (cartNoticeTimeoutRef.current) {
        window.clearTimeout(cartNoticeTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-[var(--line)] bg-[var(--background)]">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openCatalogMenu}
                className="flex h-12 w-12 items-center justify-center rounded-[8px] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--soft-shadow)] transition hover:border-[var(--foreground)]"
                aria-label="Abrir menu"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 7h16" />
                  <path d="M4 12h16" />
                  <path d="M4 17h16" />
                </svg>
              </button>

              <button
                type="button"
                onClick={openSearchMenu}
                className="flex h-12 w-12 items-center justify-center rounded-[8px] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--soft-shadow)] transition hover:border-[var(--foreground)]"
                aria-label="Buscar remeras"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
              </button>
            </div>

            <Link
              href="/"
              className="justify-self-center"
              aria-label="RL importaciones"
            >
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
                    Catalogo retro
                  </p>
                  <p className="truncate text-base font-black leading-none sm:text-xl">RL importaciones</p>
                  <p className="mt-1 text-[11px] text-[var(--muted)] sm:text-xs">Remeras de futbol</p>
                </div>
              </div>
            </Link>

            <Link
              href="/carrito"
              className={`justify-self-end inline-flex items-center gap-3 rounded-[8px] border px-3 py-3 shadow-[var(--soft-shadow)] transition ${
                cartUnits > 0 || cartNotice
                  ? "border-[var(--accent-2)] bg-[var(--accent-2)] text-white"
                  : "border-[var(--line)] bg-[var(--surface)] text-[var(--foreground)]"
              }`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] ${
                  cartUnits > 0 || cartNotice
                    ? "bg-white/14 text-white"
                    : "bg-[var(--foreground)] text-[var(--surface)]"
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="9" cy="20" r="1.5" />
                  <circle cx="18" cy="20" r="1.5" />
                  <path d="M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 7H7" />
                </svg>
              </span>
              <span className="hidden text-left sm:block">
                <span className={`block text-[10px] font-semibold uppercase tracking-[0.16em] ${
                  cartUnits > 0 || cartNotice ? "text-white/75" : "text-[var(--muted)]"
                }`}>
                  Carrito
                </span>
                <span className="block text-sm font-semibold">
                  {cartNotice ?? (cartUnits > 0 ? `${cartUnits} remeras` : "Ver pedido")}
                </span>
              </span>
              <span
                suppressHydrationWarning
                className={`rounded-[8px] px-3 py-2 text-sm font-semibold ${
                  cartUnits > 0 || cartNotice
                    ? "bg-white text-[#111820]"
                    : "bg-[var(--foreground)] text-[var(--surface)]"
                }`}
              >
                {cartUnits}
              </span>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section id="destacados" className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Lo mas vendido primero</p>
              <h2 className="mt-1 text-2xl font-semibold">Argentina, Boca, River, Barca y Real Madrid</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Apenas entran, que vean primero lo que mas te conviene vender.
              </p>
            </div>
            <button
              type="button"
              onClick={scrollToCatalog}
              className="rounded-[8px] bg-[var(--foreground)] px-4 py-3 text-sm font-semibold text-[var(--surface)]"
            >
              Catalogo completo
            </button>
          </div>

          <div className="mt-6 space-y-6">
            {homeFeaturedSections.map((section) => (
              <div key={section.team}>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                      {section.collection}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold sm:text-xl">{translateTeamName(section.label)}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => openCatalogWithTeam(section.team)}
                    className="rounded-[8px] border border-[var(--line)] px-3 py-2 text-xs font-semibold sm:text-sm"
                  >
                    Ver todo
                  </button>
                </div>

                <div className="mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 pr-2">
                  {section.products.map((product) => {
                    const selectedSize = getSelectedSize(product);
                    const soldOut = availableForSelection(product, selectedSize) === 0;

                    return (
                      <article
                        key={product.id}
                        className="flex min-w-[14.75rem] max-w-[14.75rem] shrink-0 snap-start flex-col rounded-[8px] border border-[var(--line)] bg-[var(--background)] p-4 sm:min-w-[17rem] sm:max-w-[17rem]"
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
                              sizes="280px"
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
                        <p className="mt-1 text-sm text-[var(--muted)]">
                          Sena estimada: {formatArs(depositFor(product.priceArs))}
                        </p>

                        <div className="mt-4 grid gap-2">
                          <select
                            value={selectedSize}
                            onChange={(event) =>
                              setSelectedSizes((current) => ({
                                ...current,
                                [product.id]: event.target.value,
                              }))
                            }
                            className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3 py-3 text-base sm:text-sm"
                          >
                            {product.sizeOptions.map((option) => (
                              <option key={option.size} value={option.size}>
                                {option.size}
                              </option>
                            ))}
                          </select>

                          <div className="grid gap-2 sm:grid-cols-2">
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
                              disabled={soldOut}
                              className={`rounded-[8px] px-4 py-3 text-sm font-semibold text-white ${
                                soldOut
                                  ? "cursor-not-allowed bg-[var(--line)] text-[var(--muted)]"
                                  : "bg-[var(--accent-2)]"
                              }`}
                            >
                              {soldOut ? "Sin stock" : "Agregar"}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Explora por escudo</p>
              <h2 className="mt-1 text-2xl font-semibold">Todos los clubes y selecciones de un vistazo</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Toca un escudo y te llevamos directo a ese equipo dentro del catalogo.
              </p>
            </div>
            <button
              type="button"
              onClick={openCatalogMenu}
              className="rounded-[8px] border border-[var(--line)] px-4 py-3 text-sm font-semibold"
            >
              Abrir filtros
            </button>
          </div>

          <div className="mt-5 grid gap-5 sm:mt-6 sm:gap-6">
            {[
              { title: "Selecciones", items: drawerItems.national },
              { title: "Clubes", items: drawerItems.clubs },
            ].map((group) => (
              <div key={group.title}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">{group.title}</h3>
                  <button
                    type="button"
                    onClick={() => openCatalogWithCollection(group.title)}
                    className="text-xs font-semibold text-[var(--muted)] sm:text-sm"
                  >
                    Ver todas
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
                  {group.items.map((item) => (
                    <button
                      key={item.team}
                      type="button"
                      onClick={() => openCatalogWithTeam(item.team)}
                      className="flex w-full flex-col items-center gap-2 rounded-[8px] border border-[var(--line)] bg-[var(--background)] px-2 py-3 text-center transition hover:border-[var(--foreground)] sm:gap-3 sm:px-3 sm:py-4"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-[8px] bg-[var(--crest-tile)] sm:h-14 sm:w-14">
                        {item.logo ? (
                          <div className="relative h-8 w-8 sm:h-10 sm:w-10">
                            <Image
                              src={item.logo}
                              alt={translateTeamName(item.team)}
                              fill
                              className="object-contain"
                              sizes="40px"
                            />
                          </div>
                        ) : null}
                      </div>
                      <span className="text-[11px] font-semibold leading-4 sm:text-xs">{translateTeamName(item.team)}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-8">
          <section id="catalogo" className="min-w-0">
            <div className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Catalogo completo</p>
                  <h2 className="mt-1 text-2xl font-semibold">Filtra por club, seleccion o jugador</h2>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    {filteredProducts.length} modelos para ver, reservar y hablar por WhatsApp.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <label className="relative block">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="7" />
                      <path d="m20 20-3.5-3.5" />
                    </svg>
                  </span>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Busca por jugador, club o temporada"
                    className="w-full rounded-[8px] border border-[var(--line)] bg-[var(--background)] py-3.5 pl-12 pr-4 text-base sm:text-sm"
                  />
                </label>

                <div className="grid gap-2 sm:flex sm:flex-wrap">
                  <button
                    type="button"
                    onClick={openCatalogMenu}
                    className="rounded-[8px] bg-[var(--foreground)] px-4 py-3 text-sm font-semibold text-[var(--surface)]"
                  >
                    Filtros y clubes
                  </button>
                  <button
                    type="button"
                    onClick={resetCatalogFilters}
                    className="rounded-[8px] border border-[var(--line)] px-4 py-3 text-sm font-semibold"
                  >
                    Limpiar
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {query ? (
                  <span className="rounded-[8px] border border-[var(--line)] bg-[var(--background)] px-3 py-2 text-sm">
                    Busqueda: {query}
                  </span>
                ) : null}
                {collectionFilter !== "Todas" ? (
                  <span className="rounded-[8px] border border-[var(--line)] bg-[var(--background)] px-3 py-2 text-sm">
                    Categoria: {collectionFilter}
                  </span>
                ) : null}
                {teamFilter !== "Todos" ? (
                  <span className="rounded-[8px] border border-[var(--line)] bg-[var(--background)] px-3 py-2 text-sm">
                    Equipo: {translateTeamName(teamFilter)}
                  </span>
                ) : null}
                {sizeFilter !== "Todos" ? (
                  <span className="rounded-[8px] border border-[var(--line)] bg-[var(--background)] px-3 py-2 text-sm">
                    Talle: {sizeFilter}
                  </span>
                ) : null}
                {!query && collectionFilter === "Todas" && teamFilter === "Todos" && sizeFilter === "Todos" ? (
                  <span className="rounded-[8px] border border-[var(--line)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--muted)]">
                    Sin filtros activos
                  </span>
                ) : null}
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
                      <div className="grid gap-2 sm:grid-cols-2">
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
        </div>

        <section className="mt-8 rounded-[8px] bg-[var(--accent)] px-5 py-6 text-white sm:px-8 sm:py-7">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white/75">No ves tu camiseta?</p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight sm:text-4xl">
            Contacta al vendedor y la buscamos para vos.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85">
            Si no la encontraste en el catalogo, escribinos por WhatsApp y te conseguimos el club, la
            seleccion, el jugador o la temporada que quieras.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <a
              href={otherJerseyHref}
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

      {catalogMenuOpen ? (
        <div
          className="fixed inset-0 z-40 bg-[rgba(7,11,17,0.52)] backdrop-blur-[6px]"
          onClick={() => setCatalogMenuOpen(false)}
        >
          <aside
            className="h-full w-[20rem] max-w-[92vw] overflow-y-auto border-r border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--soft-shadow)] sm:w-[22rem]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Catalogo completo</p>
                <h2 className="mt-1 text-xl font-semibold">Filtros y clubes</h2>
              </div>
              <button
                type="button"
                onClick={() => setCatalogMenuOpen(false)}
                className="rounded-[8px] border border-[var(--line)] px-3 py-2 text-sm font-semibold"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-5 space-y-5">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Buscar</p>
                <div className="relative mt-2">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="7" />
                      <path d="m20 20-3.5-3.5" />
                    </svg>
                  </span>
                  <input
                    ref={searchInputRef}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Messi, Boca, Argentina, Milan..."
                    className="w-full rounded-[8px] border border-[var(--line)] bg-[var(--background)] py-3 pl-11 pr-4 text-base sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Atajos</p>
                <div className="mt-2 grid gap-2 grid-cols-2">
                  {HOME_TEAM_PRIORITY.map((item) => (
                    <button
                      key={item.team}
                      type="button"
                      onClick={() => openCatalogWithTeam(item.team)}
                      className={`rounded-[8px] border px-3 py-3 text-left text-sm font-semibold ${
                        teamFilter === item.team
                          ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--surface)]"
                          : "border-[var(--line)] bg-[var(--background)]"
                      }`}
                    >
                      {translateTeamName(item.label)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Categorias</p>
                <div className="mt-2 grid gap-2 grid-cols-2 sm:grid-cols-3">
                  {["Todas", "Selecciones", "Clubes"].map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => openCatalogWithCollection(item)}
                      className={`rounded-[8px] border px-3 py-3 text-sm font-semibold ${
                        collectionFilter === item
                          ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--surface)]"
                          : "border-[var(--line)] bg-[var(--background)]"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Talles</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {["Todos", ...sizes].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSizeFilter(size)}
                      className={`rounded-[8px] border px-3 py-2 text-sm font-semibold ${
                        sizeFilter === size
                          ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--surface)]"
                          : "border-[var(--line)] bg-[var(--background)]"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Tema</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTheme("light")}
                    aria-pressed={theme === "light"}
                    className={`rounded-[8px] border px-3 py-3 text-sm font-semibold ${
                      theme === "light"
                        ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                        : "border-[var(--line)] bg-[var(--background)]"
                    }`}
                  >
                    Claro
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme("dark")}
                    aria-pressed={theme === "dark"}
                    className={`rounded-[8px] border px-3 py-3 text-sm font-semibold ${
                      theme === "dark"
                        ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                        : "border-[var(--line)] bg-[var(--background)]"
                    }`}
                  >
                    Oscuro
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Selecciones</p>
                <div className="mt-2 space-y-2">
                  {drawerItems.national.map((item) => (
                    <button
                      key={item.team}
                      type="button"
                      onClick={() => openCatalogWithTeam(item.team)}
                      className={`flex w-full items-center gap-3 rounded-[8px] border px-3 py-3 text-left text-sm font-semibold ${
                        teamFilter === item.team
                          ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--surface)]"
                          : "border-[var(--line)] bg-[var(--background)]"
                      }`}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[var(--crest-tile)]">
                        {item.logo ? (
                          <div className="relative h-7 w-7">
                            <Image
                              src={item.logo}
                              alt={translateTeamName(item.team)}
                              fill
                              className="object-contain"
                              sizes="28px"
                            />
                          </div>
                        ) : null}
                      </div>
                      <span>{translateTeamName(item.team)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Clubes</p>
                <div className="mt-2 space-y-2">
                  {drawerItems.clubs.map((item) => (
                    <button
                      key={item.team}
                      type="button"
                      onClick={() => openCatalogWithTeam(item.team)}
                      className={`flex w-full items-center gap-3 rounded-[8px] border px-3 py-3 text-left text-sm font-semibold ${
                        teamFilter === item.team
                          ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--surface)]"
                          : "border-[var(--line)] bg-[var(--background)]"
                      }`}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[var(--crest-tile)]">
                        {item.logo ? (
                          <div className="relative h-7 w-7">
                            <Image
                              src={item.logo}
                              alt={translateTeamName(item.team)}
                              fill
                              className="object-contain"
                              sizes="28px"
                            />
                          </div>
                        ) : null}
                      </div>
                      <span>{translateTeamName(item.team)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={resetCatalogFilters}
                className="w-full rounded-[8px] bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white"
              >
                Ver todo sin filtros
              </button>
            </div>
          </aside>
        </div>
      ) : null}

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
