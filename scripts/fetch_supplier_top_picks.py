from __future__ import annotations

import json
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

import requests


ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = ROOT / "public" / "top-picks"
OUTPUT_JSON = ROOT / "src" / "data" / "supplier-top-picks.json"
SCRIPT_PATTERN = re.compile(r'<script type="application/ld\+json">\s*(?P<json>.*?)\s*</script>', re.S)

PICKS = [
    {
        "name": "26-27 Argentina Home 1:1 Fans Soccer Jersey",
        "team": "Argentina",
        "collection": "Selecciones",
        "player": "Sin nombre",
        "url": "https://www.gmkitsc.com/26-27-Argentina-Home-1-1-Fans-Soccer-Jersey-p28642350.html",
        "tags": ["Argentina", "Titular", "Novedad"],
    },
    {
        "name": "26-27 Argentina Away 1:1 Fans Soccer Jersey",
        "team": "Argentina",
        "collection": "Selecciones",
        "player": "Sin nombre",
        "url": "https://www.gmkitsc.com/26-27-Argentina-Away-1-1-Fans-Soccer-Jersey-p28897556.html",
        "tags": ["Argentina", "Alternativa", "Novedad"],
    },
    {
        "name": "26-27 Boca Juniors Third Fans Soccer Jersey",
        "team": "Boca Juniors",
        "collection": "Clubes",
        "player": "Sin nombre",
        "url": "https://www.gmkitsc.com/26-27-Boca-Juniors-Third-Fans-Soccer-Jersey-p28884179.html",
        "tags": ["Boca Juniors", "Tercera", "Novedad"],
    },
    {
        "name": "26-27 RMA Home 1:1 Fans Soccer Jersey",
        "team": "Real Madrid",
        "collection": "Clubes",
        "player": "Sin nombre",
        "url": "https://www.gmkitsc.com/26-27-RMA-Home-1-1-Fans-Soccer-Jersey-p28715126.html",
        "tags": ["Real Madrid", "Titular", "Novedad"],
    },
    {
        "name": "25-26 PSG Jordan Night Edition Fans Soccer Jersey",
        "team": "PSG",
        "collection": "Clubes",
        "player": "Sin nombre",
        "url": "https://www.gmkitsc.com/25-26-PSG-Jordan-Night-Edition-Fans-Soccer-jersey-p28885076.html",
        "tags": ["PSG", "Edicion especial", "Novedad"],
    },
    {
        "name": "26-27 Portugal Home 1:1 Fans Soccer Jersey",
        "team": "Portugal",
        "collection": "Selecciones",
        "player": "Sin nombre",
        "url": "https://www.gmkitsc.com/26-27-Portugal-Home-1-1-Fans-Soccer-Jersey-p28437294.html",
        "tags": ["Portugal", "Titular", "Novedad"],
    },
    {
        "name": "26-27 Spain Away Fans Soccer Jersey",
        "team": "Spain",
        "collection": "Selecciones",
        "player": "Sin nombre",
        "url": "https://www.gmkitsc.com/26-27-Spain-Away-Fans-Soccer-Jersey-p28906197.html",
        "tags": ["Spain", "Alternativa", "Novedad"],
    },
    {
        "name": "26-27 France Home 1:1 Fans Soccer Jersey",
        "team": "France",
        "collection": "Selecciones",
        "player": "Sin nombre",
        "url": "https://www.gmkitsc.com/26-27-France-Home-1-1-Fans-Soccer-Jersey-p28887844.html",
        "tags": ["France", "Titular", "Novedad"],
    },
    {
        "name": "26-27 Germany Home 1:1 Fans Soccer Jersey",
        "team": "Germany",
        "collection": "Selecciones",
        "player": "Sin nombre",
        "url": "https://www.gmkitsc.com/26-27-Germany-Home-1-1-Fans-Soccer-Jersey-p28357962.html",
        "tags": ["Germany", "Titular", "Novedad"],
    },
    {
        "name": "26-27 Man City Home 1:1 Fans Soccer Jersey",
        "team": "Manchester City",
        "collection": "Clubes",
        "player": "Sin nombre",
        "url": "https://www.gmkitsc.com/26-27-Man-City-Home-1-1-Fans-Soccer-Jersey-p28747897.html",
        "tags": ["Manchester City", "Titular", "Novedad"],
    },
    {
        "name": "26-27 Inter Miami Away Fans Soccer Jersey",
        "team": "Inter Miami",
        "collection": "Clubes",
        "player": "Sin nombre",
        "url": "https://www.gmkitsc.com/26-27-Inter-Miami-Away-Fans-Soccer-Jersey-p28879175.html",
        "tags": ["Inter Miami", "Alternativa", "Novedad"],
    },
    {
        "name": "25-26 Bayern Oktoberfest 1:1 Fans Soccer Jersey",
        "team": "Bayern Munich",
        "collection": "Clubes",
        "player": "Sin nombre",
        "url": "https://www.gmkitsc.com/25-26-Bayern-Oktoberfest-1-1-Fans-Soccer-Jersey-p28496438.html",
        "tags": ["Bayern Munich", "Edicion especial", "Novedad"],
    },
    {
        "name": "25-26 BAR Black Joint Edition 1:1 Fans Soccer Jersey",
        "team": "Barcelona",
        "collection": "Clubes",
        "player": "Sin nombre",
        "url": "https://www.gmkitsc.com/25-26-BAR-Black-Joint-Edition-1-1-Fans-Soccer-Jersey-p28359752.html",
        "tags": ["Barcelona", "Edicion especial", "Novedad"],
    },
]


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def extract_image_urls(html: str) -> list[str]:
    urls: list[str] = []
    seen: set[str] = set()
    for match in SCRIPT_PATTERN.findall(html):
        try:
            payload = json.loads(match)
        except json.JSONDecodeError:
            continue

        items = payload if isinstance(payload, list) else [payload]
        for item in items:
            if not isinstance(item, dict):
                continue
            image_value = item.get("image")
            if isinstance(image_value, list):
                values = image_value
            elif isinstance(image_value, str):
                values = [image_value]
            else:
                values = []
            for url in values:
                if isinstance(url, str) and url.startswith("http") and url not in seen:
                    seen.add(url)
                    urls.append(url)

    if not urls:
        raise RuntimeError("No product images found.")
    return urls


def file_extension(image_url: str) -> str:
    path = urlparse(image_url).path.lower()
    suffix = Path(path).suffix
    if suffix in {".jpg", ".jpeg", ".png", ".webp"}:
        return suffix
    return ".jpg"


def build_short_name(name: str) -> str:
    return (
        name.replace("Fans Soccer Jersey", "")
        .replace("Soccer Jersey", "")
        .replace(" 1:1", "")
        .replace("RMA", "Real Madrid")
        .replace("BAR", "Barcelona")
        .strip()
    )


def main() -> None:
    session = requests.Session()
    session.headers.update({"User-Agent": "Mozilla/5.0"})
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "supplier": "gmkitsc.com",
        "products": [],
    }

    for pick in PICKS:
        slug = slugify(pick["name"])
        destination_dir = OUTPUT_DIR / slug
        if destination_dir.exists():
            shutil.rmtree(destination_dir)
        destination_dir.mkdir(parents=True, exist_ok=True)

        html = session.get(pick["url"], timeout=30).text
        image_urls = extract_image_urls(html)[:6]
        gallery = []

        for index, image_url in enumerate(image_urls, start=1):
            extension = file_extension(image_url)
            filename = f"{index:02d}{extension}"
            response = session.get(image_url, timeout=60)
            response.raise_for_status()
            local_path = destination_dir / filename
            local_path.write_bytes(response.content)
            gallery.append(f"/top-picks/{slug}/{filename}")

        payload["products"].append(
            {
                "id": slug,
                "name": pick["name"],
                "shortName": build_short_name(pick["name"]),
                "team": pick["team"],
                "collection": pick["collection"],
                "player": pick["player"],
                "eraLabel": pick["name"].split(" ", 1)[0],
                "tags": pick["tags"],
                "sourceUrl": pick["url"],
                "image": gallery[0] if gallery else None,
                "gallery": gallery,
            }
        )
        print(f"Downloaded top pick {pick['name']}")

    OUTPUT_JSON.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {OUTPUT_JSON}")


if __name__ == "__main__":
    main()
