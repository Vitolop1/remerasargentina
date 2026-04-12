# Remeras Argentina

Catalogo de remeras de futbol con reserva por WhatsApp para Salta.

## Variables

Crear un archivo `.env.local` con:

```bash
ADMIN_PASSWORD=tu-clave
NEXT_PUBLIC_ORDER_EMAIL=lopresttivito@gmail.com
NEXT_PUBLIC_WHATSAPP_NUMBER=17046762602
NEXT_PUBLIC_PAYMENT_ALIAS=tu.alias.mp
NEXT_PUBLIC_PAYMENT_QR_PATH=/payments/qr.png
```

## Catalogo

El catalogo publico se genera desde `REMERAS_SOCIOS.xlsx` con:

```bash
npm run sync:catalog
```

## Desarrollo

```bash
npm install
npm run dev
```

## Deploy

El proyecto esta preparado para Vercel con Root Directory `./`.
