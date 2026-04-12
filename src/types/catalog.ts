export type CatalogSettings = {
  exchangeRateArsPerUsd: number;
  unitsPurchased: number;
  unitsForSale: number;
  reservedUnits: number;
  defaultSalePriceUsd: number;
  defaultSalePriceArs: number;
};

export type CatalogOrderLine = {
  lineNumber: number;
  name: string;
  size: string;
  quantity: number;
};

export type CatalogPayload = {
  generatedAt: string;
  sourceWorkbook: string;
  settings: CatalogSettings;
  orderLines: CatalogOrderLine[];
};

export type ProductSizeOption = {
  size: string;
  stock: number;
};

export type CatalogProduct = {
  id: string;
  name: string;
  shortName: string;
  eraLabel: string;
  team: string;
  teamLogo: string | null;
  collection: string;
  player: string;
  totalStock: number;
  sizeOptions: ProductSizeOption[];
  image: string | null;
  gallery: string[];
  priceUsd: number;
  priceArs: number;
  featured: boolean;
  isTopPick: boolean;
  sourceUrl: string | null;
  tags: string[];
  searchText: string;
};

export type CatalogSummary = {
  settings: CatalogSettings;
  products: CatalogProduct[];
  teams: string[];
  teamLogos: Record<string, string | null>;
  sizes: string[];
};
