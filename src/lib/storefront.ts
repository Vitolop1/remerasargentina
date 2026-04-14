import { formatArs } from "@/lib/catalog";
import type { CatalogProduct } from "@/types/catalog";

export type CartItem = {
  productId: string;
  size: string;
  quantity: number;
};

export type Customer = {
  name: string;
  phone: string;
  email: string;
  zone: string;
  notes: string;
};

export type ThemeMode = "light" | "dark";

export const DEPOSIT_RATE = 0.5;
export const ORIGINAL_PRICE_ARS = 79000;
export const THEME_STORAGE_KEY = "remeras-theme";
export const CART_STORAGE_KEY = "rl-importaciones-cart";
export const CUSTOMER_STORAGE_KEY = "rl-importaciones-customer";
export const ESTIMATED_ARRIVAL_LABEL = "13 de mayo";

export const DEFAULT_CUSTOMER: Customer = {
  name: "",
  phone: "",
  email: "",
  zone: "Salta Capital",
  notes: "",
};

export function resolveThemePreference(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }

  const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === "light" || saved === "dark") {
    return saved;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function depositFor(amount: number) {
  return Math.round(amount * DEPOSIT_RATE);
}

export function translateProductName(value: string) {
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

export function translateTeamName(team: string) {
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

export function translateTag(tag: string) {
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

export function buildOrderText(
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
    `Se\u00f1a estimada (50%): ${formatArs(depositArs)}`,
    `Llegada estimada: ${ESTIMATED_ARRIVAL_LABEL}`,
    "",
    `Nombre: ${customer.name || "-"}`,
    `Telefono: ${customer.phone || "-"}`,
    `Mail: ${customer.email || "-"}`,
    `Zona: ${customer.zone || "-"}`,
    `Notas: ${customer.notes || "-"}`,
    "",
    orderEmail
      ? `Mandame la confirmacion a ${orderEmail} y despues coordinamos la se\u00f1a y la entrega.`
      : "Despues coordinamos la se\u00f1a y la entrega.",
  ].join("\n");
}

export function loadStoredCart(): CartItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item) =>
        item &&
        typeof item.productId === "string" &&
        typeof item.size === "string" &&
        typeof item.quantity === "number" &&
        item.quantity > 0,
    );
  } catch {
    return [];
  }
}

export function saveStoredCart(cart: CartItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

export function loadStoredCustomer(): Customer {
  if (typeof window === "undefined") {
    return DEFAULT_CUSTOMER;
  }

  try {
    const raw = window.localStorage.getItem(CUSTOMER_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_CUSTOMER;
    }

    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_CUSTOMER,
      ...parsed,
    };
  } catch {
    return DEFAULT_CUSTOMER;
  }
}

export function saveStoredCustomer(customer: Customer) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(customer));
}
