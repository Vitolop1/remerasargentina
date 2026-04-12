import { CatalogApp } from "@/components/catalog-app";
import { getCatalogData } from "@/lib/catalog";

export default function Home() {
  const catalog = getCatalogData();

  return (
    <CatalogApp
      {...catalog}
      orderEmail={process.env.NEXT_PUBLIC_ORDER_EMAIL ?? "lopresttivito@gmail.com"}
      whatsappNumber={process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "17046762602"}
      whatsappDisplay="+1 704 676 2602"
      paymentAlias={process.env.NEXT_PUBLIC_PAYMENT_ALIAS}
      paymentQrPath={process.env.NEXT_PUBLIC_PAYMENT_QR_PATH}
    />
  );
}
