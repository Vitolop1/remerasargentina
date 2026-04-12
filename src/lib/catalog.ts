import catalog from "@/data/catalog.json";
import supplierImages from "@/data/supplier-images.json";
import type { CatalogOrderLine, CatalogPayload, CatalogProduct, CatalogSummary } from "@/types/catalog";

const catalogPayload = catalog as CatalogPayload;
const supplierImagePayload = supplierImages as {
  products: Record<string, { images: Array<{ path: string }> }>;
};
const SIZE_ORDER = ["S", "M", "L", "XL", "XXL", "XXXL"];

const TEAM_RULES = [
  "Argentina",
  "Boca Juniors",
  "River Plate",
  "Barcelona",
  "Brazil",
  "AC Milan",
  "Real Madrid",
] as const;

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
  if (team === "Argentina" || team === "Brazil") {
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

function sortSizes(sizeOptions: Map<string, number>) {
  return [...sizeOptions.entries()]
    .sort((a, b) => SIZE_ORDER.indexOf(a[0]) - SIZE_ORDER.indexOf(b[0]))
    .map(([size, stock]) => ({ size, stock }));
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

  const products: CatalogProduct[] = [...grouped.values()]
    .map(({ baseLine, totalStock, sizeOptions }) => {
      const team = detectTeam(baseLine.name);
      const player = extractPlayer(baseLine.name);
      const eraLabel = extractEra(baseLine.name);
      const tags = buildTags(baseLine, team);
      const priceUsd = catalogPayload.settings.defaultSalePriceUsd;
      const priceArs = Math.round(priceUsd * catalogPayload.settings.exchangeRateArsPerUsd);
      const supplierMatch = supplierImagePayload.products[baseLine.name];
      const gallery = supplierMatch?.images.map((image) => image.path) ?? [];

      return {
        id: slugify(baseLine.name),
        name: compactWhitespace(baseLine.name),
        shortName: buildShortName(baseLine.name.replace(/\bBAR\b/g, "Barcelona")),
        eraLabel,
        team,
        collection: detectCollection(team),
        player,
        totalStock,
        sizeOptions: sortSizes(sizeOptions),
        image: choosePrimaryImage(gallery),
        gallery,
        priceUsd,
        priceArs,
        featured:
          team === "Argentina" ||
          team === "Boca Juniors" ||
          player.includes("MESSI") ||
          player.includes("MARADONA"),
        tags,
        searchText: [baseLine.name, team, player, eraLabel, ...tags].join(" ").toLowerCase(),
      };
    })
    .sort((a, b) => {
      if (a.featured !== b.featured) {
        return a.featured ? -1 : 1;
      }
      if (a.team !== b.team) {
        return a.team.localeCompare(b.team);
      }
      return a.name.localeCompare(b.name);
    });

  return {
    settings: catalogPayload.settings,
    products,
    teams: [...new Set(products.map((product) => product.team))],
    sizes: SIZE_ORDER.filter((size) =>
      products.some((product) => product.sizeOptions.some((option) => option.size === size)),
    ),
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
