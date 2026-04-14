import catalog from "@/data/catalog.json";
import supplierImages from "@/data/supplier-images.json";
import supplierSearchCatalog from "@/data/supplier-search-catalog.json";
import supplierTopPicks from "@/data/supplier-top-picks.json";
import teamLogos from "@/data/team-logos.json";
import type { CatalogOrderLine, CatalogPayload, CatalogProduct, CatalogSummary } from "@/types/catalog";

const catalogPayload = catalog as CatalogPayload;
const supplierImagePayload = supplierImages as {
  products: Record<string, { images: Array<{ path: string }>; sources?: Array<{ url: string }> }>;
};
const supplierTopPickPayload = supplierTopPicks as {
  products: Array<{
    id: string;
    name: string;
    shortName: string;
    team: string;
    collection: string;
    player: string;
    eraLabel: string;
    tags: string[];
    sourceUrl: string;
    image: string | null;
    gallery: string[];
  }>;
};
const supplierSearchPayload = supplierSearchCatalog as {
  products: Array<{
    id: string;
    name: string;
    shortName: string;
    team: string;
    collection: string;
    player: string;
    eraLabel: string;
    tags: string[];
    sourceUrl: string;
    image: string | null;
    gallery: string[];
  }>;
};
const teamLogoPayload = teamLogos as {
  teams: Record<string, { path: string }>;
};
const SIZE_ORDER = ["S", "M", "L", "XL", "XXL", "XXXL"];
const PREORDER_SIZES = ["S", "M", "L", "XL", "XXL"] as const;
const REMOVED_PRODUCTS = new Set([
  "1981 Boca Juniors Home #10 MARADONA",
  "1996-97 Argentina Home #10 MEMI",
  "2005-06 BAR Away UCL #10 Ronaldinho",
]);
const PROMO_PRICE_ARS = 64999;
const NATIONAL_TEAMS = new Set([
  "Argentina",
  "Brazil",
  "Croatia",
  "France",
  "Germany",
  "Italy",
  "Portugal",
  "Spain",
]);

const TEAM_RULES = Object.keys(teamLogoPayload.teams).sort((a, b) => b.length - a.length);
const TEAM_LOGOS = Object.fromEntries(
  Object.entries(teamLogoPayload.teams).map(([team, data]) => [team, data.path]),
);

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function detectTeam(name: string) {
  const normalized = name.replace(/\bBAR\b/g, "Barcelona");

  for (const rule of TEAM_RULES) {
    if (normalized.includes(rule)) {
      return rule;
    }
  }

  return "Otras";
}

function detectCollection(team: string) {
  if (NATIONAL_TEAMS.has(team)) {
    return "Selecciones";
  }

  if (team === "Otras") {
    return "Especiales";
  }

  return "Clubes";
}

function extractEra(name: string) {
  const match = name.match(/^(\d{2,4}-\d{2}|\d{4})/);
  return match?.[1] ?? "Retro";
}

function stripLeadingEra(name: string) {
  return compactWhitespace(name.replace(/^(\d{2,4}-\d{2}|\d{4})\s*/, ""));
}

function extractPlayer(name: string) {
  const match = name.match(/#\d+\s+([A-Z. ]+)/i);
  if (match?.[1]) {
    return compactWhitespace(match[1]).toUpperCase();
  }

  const beforeNumberMatch = name.match(/([A-Z][A-Za-z.]+(?:\s+[A-Z][A-Za-z.]+)?)\s+#\d+/);
  if (beforeNumberMatch?.[1]) {
    return compactWhitespace(beforeNumberMatch[1]).toUpperCase();
  }

  if (name.toLowerCase().includes("sin nombre")) {
    return "Sin nombre";
  }

  return "Edicion clasica";
}

function buildShortName(name: string) {
  return stripLeadingEra(name)
    .replace(/\(sin nombre\)/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function buildTags(line: CatalogOrderLine, team: string) {
  const tags = new Set<string>([team]);

  if (line.name.includes("Home")) {
    tags.add("Home");
  }
  if (line.name.includes("Away")) {
    tags.add("Away");
  }
  if (line.name.includes("Third")) {
    tags.add("Third");
  }
  if (line.name.includes("Player")) {
    tags.add("Player");
  }
  if (line.name.includes("UCL")) {
    tags.add("UCL");
  }
  if (line.name.toLowerCase().includes("wc")) {
    tags.add("Mundial");
  }

  return [...tags];
}

function choosePrimaryImage(gallery: string[]) {
  return (
    gallery.find((image) => /\.(jpg|jpeg|webp)$/i.test(image)) ??
    gallery.find((image) => !/\/0[12]\.png$/i.test(image)) ??
    gallery[0] ??
    null
  );
}

function keepCleanGallery(gallery: string[], preferredImage?: string | null) {
  const uniqueGallery = [...new Set(gallery.filter(Boolean))];
  const photoGallery = uniqueGallery.filter((image) => /\.(jpg|jpeg|webp)$/i.test(image));
  const cleanedGallery = photoGallery.length >= 2 ? photoGallery : uniqueGallery;
  const primary = preferredImage ?? choosePrimaryImage(cleanedGallery);

  if (!primary) {
    return [];
  }

  return [
    primary,
    ...cleanedGallery.filter((image) => image !== primary),
  ].slice(0, 6);
}

export function getCatalogData(): CatalogSummary {
  const grouped = new Map<
    string,
    {
      baseLine: CatalogOrderLine;
      totalStock: number;
      sizeOptions: Map<string, number>;
    }
  >();

  for (const line of catalogPayload.orderLines) {
    const key = compactWhitespace(line.name);
    if (REMOVED_PRODUCTS.has(key)) {
      continue;
    }

    const existing = grouped.get(key);

    if (existing) {
      existing.totalStock += line.quantity;
      existing.sizeOptions.set(line.size, (existing.sizeOptions.get(line.size) ?? 0) + line.quantity);
      continue;
    }

    grouped.set(key, {
      baseLine: line,
      totalStock: line.quantity,
      sizeOptions: new Map([[line.size, line.quantity]]),
    });
  }

  const stockProducts: CatalogProduct[] = [...grouped.values()]
    .map(({ baseLine }) => {
      const team = detectTeam(baseLine.name);
      const player = extractPlayer(baseLine.name);
      const eraLabel = extractEra(baseLine.name);
      const tags = buildTags(baseLine, team);
      const priceArs = PROMO_PRICE_ARS;
      const priceUsd = Number((priceArs / catalogPayload.settings.exchangeRateArsPerUsd).toFixed(2));
      const supplierMatch = supplierImagePayload.products[baseLine.name];
      const supplierGallery = supplierMatch?.images.map((image) => image.path) ?? [];
      const image = choosePrimaryImage(supplierGallery);
      const gallery = keepCleanGallery(supplierGallery, image);

      return {
        id: slugify(baseLine.name),
        name: compactWhitespace(baseLine.name),
        shortName: buildShortName(baseLine.name.replace(/\bBAR\b/g, "Barcelona")),
        eraLabel,
        team,
        teamLogo: TEAM_LOGOS[team] ?? null,
        collection: detectCollection(team),
        player,
        totalStock: 999,
        sizeOptions: PREORDER_SIZES.map((size) => ({ size, stock: 999 })),
        image,
        gallery,
        priceUsd,
        priceArs,
        featured:
          team === "Argentina" ||
          team === "Boca Juniors" ||
          player.includes("MESSI") ||
          player.includes("MARADONA"),
        isTopPick: false,
        sourceUrl: supplierMatch?.sources?.[0]?.url ?? null,
        tags,
        searchText: [baseLine.name, team, player, eraLabel, ...tags].join(" ").toLowerCase(),
      };
    });

  const groupedTopPickProducts = new Map<
    string,
    Array<(typeof supplierTopPickPayload.products)[number]>
  >();

  for (const product of supplierTopPickPayload.products) {
    const existing = groupedTopPickProducts.get(product.team) ?? [];
    existing.push(product);
    groupedTopPickProducts.set(product.team, existing);
  }

  const topPickGroups = Array.from(groupedTopPickProducts.values());
  const maxTopPickGroupLength = Math.max(...topPickGroups.map((group) => group.length), 0);
  const interleavedTopPickPayload: typeof supplierTopPickPayload.products = [];

  for (let cursor = 0; cursor < maxTopPickGroupLength; cursor += 1) {
    for (const group of topPickGroups) {
      const candidate = group[cursor];
      if (candidate) {
        interleavedTopPickPayload.push(candidate);
      }
    }
  }

  const topPickProducts: CatalogProduct[] = interleavedTopPickPayload.map((product) => {
    const priceArs = PROMO_PRICE_ARS;
    const priceUsd = Number((priceArs / catalogPayload.settings.exchangeRateArsPerUsd).toFixed(2));
    const heroImage = product.image ?? choosePrimaryImage(product.gallery);
    const gallery = keepCleanGallery(product.gallery, heroImage);

    return {
      id: product.id,
      name: product.name,
      shortName: product.shortName,
      eraLabel: product.eraLabel,
      team: product.team,
      teamLogo: TEAM_LOGOS[product.team] ?? null,
      collection: product.collection,
      player: product.player,
      totalStock: 999,
      sizeOptions: PREORDER_SIZES.map((size) => ({ size, stock: 999 })),
      image: heroImage,
      gallery,
      priceUsd,
      priceArs,
      featured: true,
      isTopPick: true,
      sourceUrl: product.sourceUrl,
      tags: product.tags,
      searchText: [product.name, product.team, product.player, product.eraLabel, ...product.tags]
        .join(" ")
        .toLowerCase(),
    };
  });

  const extendedSupplierProducts: CatalogProduct[] = supplierSearchPayload.products.map((product) => {
    const priceArs = PROMO_PRICE_ARS;
    const priceUsd = Number((priceArs / catalogPayload.settings.exchangeRateArsPerUsd).toFixed(2));
    const heroImage = product.image ?? choosePrimaryImage(product.gallery);
    const gallery = keepCleanGallery(product.gallery, heroImage);

    return {
      id: product.id,
      name: product.name,
      shortName: product.shortName,
      eraLabel: product.eraLabel,
      team: product.team,
      teamLogo: TEAM_LOGOS[product.team] ?? null,
      collection: product.collection,
      player: product.player,
      totalStock: 999,
      sizeOptions: PREORDER_SIZES.map((size) => ({ size, stock: 999 })),
      image: heroImage,
      gallery,
      priceUsd,
      priceArs,
      featured: false,
      isTopPick: false,
      sourceUrl: product.sourceUrl,
      tags: product.tags,
      searchText: [product.name, product.team, product.player, product.eraLabel, ...product.tags]
        .join(" ")
        .toLowerCase(),
    };
  });

  const seenProductKeys = new Set<string>();
  const dedupeKey = (product: CatalogProduct) =>
    `${product.sourceUrl ?? product.id}::${product.name.toLowerCase()}`;

  const products: CatalogProduct[] = [...topPickProducts, ...extendedSupplierProducts, ...stockProducts]
    .filter((product) => {
      const key = dedupeKey(product);
      if (seenProductKeys.has(key)) {
        return false;
      }
      seenProductKeys.add(key);
      return true;
    })
    .sort((a, b) => {
      if (a.isTopPick !== b.isTopPick) {
        return a.isTopPick ? -1 : 1;
      }
      if (a.featured !== b.featured) {
        return a.featured ? -1 : 1;
      }
      if (a.team !== b.team) {
        return a.team.localeCompare(b.team);
      }
      return a.name.localeCompare(b.name);
    });

  return {
    settings: {
      ...catalogPayload.settings,
      defaultSalePriceArs: PROMO_PRICE_ARS,
      defaultSalePriceUsd: Number(
        (PROMO_PRICE_ARS / catalogPayload.settings.exchangeRateArsPerUsd).toFixed(2),
      ),
    },
    products,
    teams: [...new Set(products.map((product) => product.team))],
    teamLogos: Object.fromEntries(
      [...new Set(products.map((product) => product.team))].map((team) => [team, TEAM_LOGOS[team] ?? null]),
    ),
    sizes: SIZE_ORDER.filter((size) => PREORDER_SIZES.includes(size as (typeof PREORDER_SIZES)[number])),
  };
}

export function formatUsd(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

export function formatArs(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export function normalizeWhatsapp(value: string | undefined) {
  return (value ?? "").replace(/\D/g, "");
}
