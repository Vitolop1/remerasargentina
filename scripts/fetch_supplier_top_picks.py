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
OG_IMAGE_PATTERN = re.compile(
    r'<meta\s+property="og:image"\s+content="(?P<url>https?://[^"]+)"',
    re.I,
)

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
    {
        "name": "25-26 LIV Third 1:1 Fans Soccer Jersey",
        "team": "Liverpool",
        "collection": "Clubes",
        "player": "Sin nombre",
        "url": "https://www.gmkitsc.com/25-26-LIV-Third-1-1-Fans-Soccer-Jersey-p28347266.html",
        "tags": ["Liverpool", "Tercera", "Novedad"],
    },
    {
        "name": "25-26 Man Utd Third 1:1 Fans Soccer Jersey",
        "team": "Manchester United",
        "collection": "Clubes",
        "player": "Sin nombre",
        "url": "https://www.gmkitsc.com/25-26-Man-Utd-Third-1-1-Fans-Soccer-Jersey-p28096185.html",
        "tags": ["Manchester United", "Tercera", "Novedad"],
    },
    {
        "name": "25-26 CHE Third 1:1 Fans Soccer Jersey",
        "team": "Chelsea",
        "collection": "Clubes",
        "player": "Sin nombre",
        "url": "https://www.gmkitsc.com/25-26-CHE-Third-1-1-Fans-Soccer-Jersey-p28434052.html",
        "tags": ["Chelsea", "Tercera", "Novedad"],
    },
    {
        "name": "25-26 ARS Third 1:1 Fans Soccer Jersey",
        "team": "Arsenal",
        "collection": "Clubes",
        "player": "Sin nombre",
        "url": "https://www.gmkitsc.com/25-26-ARS-Third-1-1-Fans-Soccer-Jersey-p28383465.html",
        "tags": ["Arsenal", "Tercera", "Novedad"],
    },
    {
        "name": "25-26 TOT Third Fans Soccer Jersey",
        "team": "Tottenham",
        "collection": "Clubes",
        "player": "Sin nombre",
        "url": "https://www.gmkitsc.com/25-26-TOT-Third-Fans-Soccer-Jersey-p28451243.html",
        "tags": ["Tottenham", "Tercera", "Novedad"],
    },
    {
        "name": "25-26 ATM Third Fans Soccer Jersey",
        "team": "Atletico Madrid",
        "collection": "Clubes",
        "player": "Sin nombre",
        "url": "https://www.gmkitsc.com/25-26-ATM-Third-Fans-Soccer-Jersey-VIS-NDA-p28482510.html",
        "tags": ["Atletico Madrid", "Tercera", "Novedad"],
    },
    {
        "name": "25-26 Dortmund Cup Match Home Fans Soccer Jersey",
        "team": "Borussia Dortmund",
        "collection": "Clubes",
        "player": "Sin nombre",
        "url": "https://www.gmkitsc.com/25-26-Dortmund-Cup-Match-Home-Fans-Soccer-Jersey-%E6%9D%AF%E8%B5%9B%E7%89%88-p28478445.html",
        "tags": ["Borussia Dortmund", "Titular", "Novedad"],
    },
    {
        "name": "25-26 Flamengo Third 1:1 Fans Soccer Jersey",
        "team": "Flamengo",
        "collection": "Clubes",
        "player": "Sin nombre",
        "url": "https://www.gmkitsc.com/25-26-Flamengo-Third-1-1-Fans-Soccer-Jersey-p28387852.html",
        "tags": ["Flamengo", "Tercera", "Novedad"],
    },
    {
        "name": "25-26 INT Third 1:1 Fans Soccer Jersey",
        "team": "Inter",
        "collection": "Clubes",
        "player": "Sin nombre",
        "url": "https://www.gmkitsc.com/25-26-INT-Third-1-1-Fans-Soccer-Jersey-p28478442.html",
        "tags": ["Inter", "Tercera", "Novedad"],
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


def extract_og_image_url(html: str) -> str | None:
    match = OG_IMAGE_PATTERN.search(html)
    if not match:
        return None
    return match.group("url")


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
        .replace("LIV", "Liverpool")
        .replace("CHE", "Chelsea")
        .replace("ARS", "Arsenal")
        .replace("JUV", "Juventus")
        .replace("INT", "Inter")
        .replace("ATM", "Atletico Madrid")
        .replace("TOT", "Tottenham")
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
        image_urls: list[str] = []
        seen_urls: set[str] = set()

        og_image = extract_og_image_url(html)
        if og_image:
            image_urls.append(og_image)
            seen_urls.add(og_image)

        for image_url in extract_image_urls(html):
            if image_url in seen_urls:
                continue
            seen_urls.add(image_url)
            image_urls.append(image_url)

        image_urls = image_urls[:12]
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
