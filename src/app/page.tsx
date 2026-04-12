import { CatalogApp } from "@/components/catalog-app";
import { getCatalogData } from "@/lib/catalog";

export default function Home() {
  const catalog = getCatalogData();

  return <CatalogApp {...catalog} whatsappNumber={process.env.NEXT_PUBLIC_WHATSAPP_NUMBER} />;
}
