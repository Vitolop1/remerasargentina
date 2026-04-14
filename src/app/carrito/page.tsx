import { CartPage } from "@/components/cart-page";
import { getCatalogData } from "@/lib/catalog";

export default function CarritoRoute() {
  const catalog = getCatalogData();

  return (
    <CartPage
      {...catalog}
      orderEmail={process.env.NEXT_PUBLIC_ORDER_EMAIL ?? "lopresttivito@gmail.com"}
      whatsappNumber={process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "17046762602"}
      whatsappDisplay="+1 704 676 2602"
      paymentAlias={process.env.NEXT_PUBLIC_PAYMENT_ALIAS ?? "vitolop.mp"}
      paymentCvu={process.env.NEXT_PUBLIC_PAYMENT_CVU ?? "0000003100064359407161"}
      paymentAccountName={process.env.NEXT_PUBLIC_PAYMENT_ACCOUNT_NAME ?? "Vito Loprestti"}
      paymentQrPath={process.env.NEXT_PUBLIC_PAYMENT_QR_PATH}
    />
  );
}
