# Remeras Argentina

Catalogo de remeras de futbol con reserva por WhatsApp para Salta.

## Variables

Crear un archivo `.env.local` con:

```bash
ADMIN_PASSWORD=tu-clave
NEXT_PUBLIC_WHATSAPP_NUMBER=5493870000000
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
