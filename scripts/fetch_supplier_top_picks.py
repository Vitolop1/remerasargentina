from __future__ import annotations

import json
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote
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
    {"team": "Boca Juniors", "url": "https://www.gmkitsc.com/1986-1988-Boca-Juniors-Home-Retro-Soccer-Jersey-p28018753.html"},
    {"team": "Boca Juniors", "url": "https://www.gmkitsc.com/25-26-Boca-Juniors-Home-Fans-Soccer-Jersey-p27999208.html"},
    {"team": "Boca Juniors", "url": "https://www.gmkitsc.com/25-26-Boca-Juniors-Away-Fans-Soccer-Jersey-p28219074.html"},
    {"team": "Boca Juniors", "url": "https://www.gmkitsc.com/2001-Boca-Juniors-Away-Retro-Soccer-Jersey-p19927222.html"},
    {"team": "Boca Juniors", "url": "https://www.gmkitsc.com/2001-Boca-Juniors-Home-Retro-Soccer-Jersey-p18034105.html"},
    {"team": "Boca Juniors", "url": "https://www.gmkitsc.com/1999-Boca-Juniors-Away-Retro-Soccer-Jersey-p19388936.html"},
    {"team": "Boca Juniors", "url": "https://www.gmkitsc.com/1999-2000-Boca-Juniors-Third-Retro-Soccer-Jersey-p28233543.html"},
    {"team": "Boca Juniors", "url": "https://www.gmkitsc.com/1999-Boca-Juniors-Away-White-Retro-Soccer-Jersey-p18043414.html"},
    {"team": "Boca Juniors", "url": "https://www.gmkitsc.com/1999-2000-Boca-Juniors-Home-Retro-Soccer-Jersey-p18034566.html"},
    {"team": "Boca Juniors", "url": "https://www.gmkitsc.com/1998-1999-Boca-Juniors-Home-Retro-Soccer-Jersey-p18034765.html"},
    {"team": "Boca Juniors", "url": "https://www.gmkitsc.com/1996-1997-Boca-Juniors-Home-Retro-Soccer-Jersey-p18034082.html"},
    {"team": "Boca Juniors", "url": "https://www.gmkitsc.com/1996-1997-Boca-Juniors-Away-Retro-Soccer-Jersey-p18034061.html"},
    {"team": "Boca Juniors", "url": "https://www.gmkitsc.com/2002-Boca-Juniors-Away-Retro-Soccer-Jersey-p18034671.html"},
    {"team": "Boca Juniors", "url": "https://www.gmkitsc.com/2002-Boca-Juniors-Home-Retro-Soccer-Jersey-p18034364.html"},
    {"team": "Boca Juniors", "url": "https://www.gmkitsc.com/2003-2004-Boca-juniors-Home-Retro-Soccer-Jersey-p20485300.html"},
    {"team": "Boca Juniors", "url": "https://www.gmkitsc.com/2006-2007-Boca-Juniors-Home-Retro-Soccer-Jersey-p27621553.html"},
    {"team": "Boca Juniors", "url": "https://www.gmkitsc.com/1981-Boca-Juniors-Home-Retro-Soccer-Jersey-p18034750.html"},
    {"team": "Boca Juniors", "url": "https://www.gmkitsc.com/1993-1995-Boca-Juniors-Home-Retro-Soccer-Jersey-p18036995.html"},
    {"team": "Boca Juniors", "url": "https://www.gmkitsc.com/1996-1997-Boca-Home-Long-Sleeve-Retro-Soccer-Jersey-%E9%95%BF%E8%A2%96-p27559748.html"},
    {"team": "Boca Juniors", "url": "https://www.gmkitsc.com/1994-Boca-Juniors-Away-White-Retro-Soccer-Jersey-%E8%83%8C%E5%90%8E%E5%B8%A6%E5%B9%BF%E5%91%8A-p18037178.html"},
    {"team": "River Plate", "url": "https://www.gmkitsc.com/1996-1997-River-Plate-Third-Retro-Soccer-Jersey-p28857752.html"},
    {"team": "Barcelona", "url": "https://www.gmkitsc.com/25-26-BAR-Black-Joint-Edition-1-1-Fans-Soccer-Jersey-p28359752.html"},
    {"team": "Real Madrid", "url": "https://www.gmkitsc.com/2004-2005-RMA-Third-Retro-Soccer-Jersey-p27061835.html"},
    {"team": "AC Milan", "url": "https://www.gmkitsc.com/1997-1998-ACM-Home-Retro-Soccer-Jersey-p28687074.html"},
    {"team": "Inter", "url": "https://www.gmkitsc.com/1996-1997-INT-Third-Retro-Soccer-Jersey-p27975452.html"},
    {"team": "Liverpool", "url": "https://www.gmkitsc.com/2006-2007-LIV-Yellow-Retro-Soccer-Jersey-p28746932.html"},
    {"team": "Manchester United", "url": "https://www.gmkitsc.com/2003-2004-Man-Utd-Away-Retro-Soccer-Jersey-p25062009.html"},
    {"team": "Manchester City", "url": "https://www.gmkitsc.com/1986-1987-Man-City-Home-Retro-Soccer-Jersey-p28511705.html"},
    {"team": "Chelsea", "url": "https://www.gmkitsc.com/2009-2010-CHE-Home-Retro-Soccer-Jersey-p27903330.html"},
    {"team": "Arsenal", "url": "https://www.gmkitsc.com/1992-1994-ARS-Away-Retro-Soccer-Jersey-p28843338.html"},
    {"team": "Juventus", "url": "https://www.gmkitsc.com/2016-2017-JUV-Home-Retro-Soccer-Jersey-p28327293.html"},
    {"team": "Atletico Madrid", "url": "https://www.gmkitsc.com/2003-2004-ATM-100th-Anniversary-Retro-Soccer-Jersey-p28202668.html"},
    {"team": "Borussia Dortmund", "url": "https://www.gmkitsc.com/1996-1997-Dortmund-UCL-Away-Retro-Soccer-Jersey-p28018848.html"},
    {"team": "Leverkusen", "url": "https://www.gmkitsc.com/1999-2000-LeverKusen-Home-Retro-Soccer-Jersey-p28886561.html"},
    {"team": "Bayern Munich", "url": "https://www.gmkitsc.com/2001-2002-Bayern-Home-Retro-Soccer-Jersey-p28745212.html"},
    {"team": "PSG", "url": "https://www.gmkitsc.com/1995-1996-PSG-Paris-Away-Retro-Soccer-Jersey-p28689882.html"},
    {"team": "Flamengo", "url": "https://www.gmkitsc.com/2006-2007-Flamengo-Home-Retro-Soccer-Jersey-p27880844.html"},
    {"team": "Boca Juniors", "url": "https://www.gmkitsc.com/2007-2008-Boca-Juniors-Home-Retro-Soccer-Jersey-p28204633.html"},
    {"team": "River Plate", "url": "https://www.gmkitsc.com/1992-1993-River-Plate-Away-Retro-Soccer-Jersey-p28765078.html"},
    {"team": "Barcelona", "url": "https://www.gmkitsc.com/25-26-BAR-Purple-Joint-Edition-Fans-Soccer-Jersey-p28478443.html"},
    {"team": "Real Madrid", "url": "https://www.gmkitsc.com/25-26-RMA-White-125th-Anniversary-Fans-Soccer-Jersey-p28894887.html"},
    {"team": "AC Milan", "url": "https://www.gmkitsc.com/2004-2005-ACM-Away-Retro-Soccer-Jersey-p28300840.html"},
    {"team": "Inter", "url": "https://www.gmkitsc.com/2019-2020-INT-Third-Retro-Soccer-Jersey-p28291779.html"},
    {"team": "Liverpool", "url": "https://www.gmkitsc.com/2008-2009-LIV-Third-Retro-Soccer-Jersey-p28687081.html"},
    {"team": "Manchester United", "url": "https://www.gmkitsc.com/2011-2012-Man-Utd-Home-Retro-Soccer-Jersey-p28682212.html"},
    {"team": "Manchester City", "url": "https://www.gmkitsc.com/2018-2019-Man-City-Home-Retro-Soccer-Jersey-p28089235.html"},
    {"team": "Chelsea", "url": "https://www.gmkitsc.com/1998-CHE-White-Out-Retro-Soccer-Jersey-p28711301.html"},
    {"team": "Arsenal", "url": "https://www.gmkitsc.com/2010-2011-ARS-Home-Retro-Soccer-Jersey-p28690922.html"},
    {"team": "Juventus", "url": "https://www.gmkitsc.com/2014-2015-JUV-Away-Retro-Soccer-Jersey-p28600941.html"},
    {"team": "Atletico Madrid", "url": "https://www.gmkitsc.com/2011-2012-ATM-Home-UCL-Retro-Soccer-Jersey-%E6%AC%A7%E5%86%A0%E7%89%88-p28629818.html"},
    {"team": "Borussia Dortmund", "url": "https://www.gmkitsc.com/25-26-Dortmund-Rote-Erde-100th-Anniversary-Fans-Soccer-Jersey-p28892746.html"},
    {"team": "Bayern Munich", "url": "https://www.gmkitsc.com/25-26-Bayern-Oktoberfest-1-1-Fans-Soccer-Jersey-p28496438.html"},
    {"team": "PSG", "url": "https://www.gmkitsc.com/25-26-PSG-Jordan-Night-Edition-Fans-Soccer-jersey-p28885076.html"},
    {"team": "Flamengo", "url": "https://www.gmkitsc.com/2002-2003-Flamengo-Home-Retro-Soccer-Jersey-p27966542.html"},
    {"team": "Boca Juniors", "url": "https://www.gmkitsc.com/26-27-Boca-Juniors-Third-Fans-Soccer-Jersey-p28884179.html"},
    {"team": "River Plate", "url": "https://www.gmkitsc.com/25-26-River-Plate-Home-Fans-Soccer-Jersey-p28096183.html"},
    {"team": "Barcelona", "url": "https://www.gmkitsc.com/1990-1992-BAR-Away-Retro-Soccer-Jersey-p28367900.html"},
    {"team": "Real Madrid", "url": "https://www.gmkitsc.com/26-27-RMA-Home-1-1-Fans-Soccer-Jersey-p28715126.html"},
    {"team": "AC Milan", "url": "https://www.gmkitsc.com/25-26-ACM-Red-Special-Edition-Fans-Soccer-Jersey-p28327290.html"},
    {"team": "Inter", "url": "https://www.gmkitsc.com/25-26-INT-Third-1-1-Fans-Soccer-Jersey-p28478442.html"},
    {"team": "Liverpool", "url": "https://www.gmkitsc.com/25-26-LIV-Away-1-1-Fans-Soccer-Jersey-p28361214.html"},
    {"team": "Manchester United", "url": "https://www.gmkitsc.com/26-27-Man-Utd-Red-Special-Edition-Fans-Soccer-Jersey-p28890147.html"},
    {"team": "Manchester City", "url": "https://www.gmkitsc.com/26-27-Man-City-Home-1-1-Fans-Soccer-Jersey-p28747897.html"},
    {"team": "Chelsea", "url": "https://www.gmkitsc.com/25-26-CHE-Home-120th-Anniversary-Fans-Soccer-Jersey-%E5%91%A8%E5%B9%B4%E7%89%88-p28408849.html"},
    {"team": "Arsenal", "url": "https://www.gmkitsc.com/26-27-ARS-Home-Fans-Soccer-Jersey-p28884195.html"},
    {"team": "Juventus", "url": "https://www.gmkitsc.com/25-26-JUV-Fourth-Fans-Soccer-Jersey-p28878766.html"},
    {"team": "Atletico Madrid", "url": "https://www.gmkitsc.com/25-26-ATM-Third-Fans-Soccer-Jersey-VIS-NDA-p28482510.html"},
    {"team": "Borussia Dortmund", "url": "https://www.gmkitsc.com/26-27-Dortmund-Home-Fans-Soccer-Jersey-p28751756.html"},
    {"team": "Bayern Munich", "url": "https://www.gmkitsc.com/25-26-Bayern-Third-1-1-Fans-Soccer-Jersey-p28357952.html"},
    {"team": "PSG", "url": "https://www.gmkitsc.com/25-26-PSG-Jordan-Fourth-1-1-Fans-Soccer-jersey-p28572567.html"},
    {"team": "Flamengo", "url": "https://www.gmkitsc.com/25-26-Flamengo-Third-1-1-Fans-Soccer-Jersey-p28387852.html"},
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
        .replace("ACM", "AC Milan")
        .replace("LeverKusen", "Leverkusen")
        .strip()
    )


def sanitize_product_name(name: str) -> str:
    cleaned = name.encode("ascii", "ignore").decode()
    cleaned = re.sub(r"\([^)]*(?:VIS|NDA)[^)]*\)", " ", cleaned, flags=re.I)
    cleaned = cleaned.replace("()", " ")
    cleaned = cleaned.replace("..", " ")
    cleaned = re.sub(r"\bBoca juniors\b", "Boca Juniors", cleaned, flags=re.I)
    cleaned = re.sub(r"\bLeverKusen\b", "Leverkusen", cleaned, flags=re.I)
    return re.sub(r"\s+", " ", cleaned).strip(" -")


def extract_product_name(html: str, fallback_url: str) -> str:
    for match in SCRIPT_PATTERN.findall(html):
        try:
            payload = json.loads(match)
        except json.JSONDecodeError:
            continue

        items = payload if isinstance(payload, list) else [payload]
        for item in items:
            if isinstance(item, dict) and item.get("@type") == "Product" and item.get("name"):
                return sanitize_product_name(str(item["name"]))

    slug = unquote(Path(urlparse(fallback_url).path).name)
    slug = re.sub(r"-p\d+\.html$", "", slug)
    slug = slug.replace("-", " ")
    return sanitize_product_name(slug)


def build_tags(team: str, name: str) -> list[str]:
    tags = {team}
    normalized = name.lower()

    if "home" in normalized:
        tags.add("Titular")
    if "away" in normalized:
        tags.add("Alternativa")
    if "third" in normalized:
        tags.add("Tercera")
    if "fourth" in normalized:
        tags.add("Cuarta")
    if "retro" in normalized:
        tags.add("Retro")
    if any(marker in normalized for marker in ["special edition", "anniversary", "jordan", "oktoberfest", "joint edition"]):
        tags.add("Edicion especial")

    return list(tags)


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
        source_slug = re.sub(r"-p\d+\.html$", "", unquote(Path(urlparse(pick["url"]).path).name))
        slug = slugify(source_slug)
        destination_dir = OUTPUT_DIR / slug
        if destination_dir.exists():
            shutil.rmtree(destination_dir)
        destination_dir.mkdir(parents=True, exist_ok=True)

        html = session.get(pick["url"], timeout=30).text
        product_name = extract_product_name(html, pick["url"])
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

        if not image_urls:
            raise RuntimeError(f"No product images found for {pick['url']}")

        image_urls = image_urls[:6]
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
                "name": product_name,
                "shortName": build_short_name(product_name),
                "team": pick["team"],
                "collection": "Clubes",
                "player": "Sin nombre",
                "eraLabel": product_name.split(" ", 1)[0],
                "tags": build_tags(pick["team"], product_name),
                "sourceUrl": pick["url"],
                "image": gallery[0] if gallery else None,
                "gallery": gallery,
            }
        )
        print(f"Downloaded top pick {product_name}")

    OUTPUT_JSON.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {OUTPUT_JSON}")


if __name__ == "__main__":
    main()
