from __future__ import annotations

import json
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote, urljoin, urlparse

import requests


ROOT = Path(__file__).resolve().parent.parent
SEARCH_URL = "https://www.gmkitsc.com/h-product-listBySearch.html"
SITE_ROOT = "https://www.gmkitsc.com"
OUTPUT_DIR = ROOT / "public" / "supplier-catalog"
OUTPUT_JSON = ROOT / "src" / "data" / "supplier-search-catalog.json"
RESULT_PATTERN = re.compile(
    r'<a href="(?P<href>/[^"#]+?\.html)"[^>]*class="name">(?P<title>.*?)</a>',
    re.S,
)
SCRIPT_PATTERN = re.compile(r'<script type="application/ld\+json">\s*(?P<json>.*?)\s*</script>', re.S)
OG_IMAGE_PATTERN = re.compile(
    r'<meta\s+property="og:image"\s+content="(?P<url>https?://[^"]+)"',
    re.I,
)
NATIONAL_TEAMS = {
    "Argentina",
    "Brazil",
    "Croatia",
    "France",
    "Germany",
    "Italy",
    "Portugal",
    "Spain",
}
EXCLUDED_TOKENS = [
    "kids",
    "women",
    "shorts",
    "pants",
    "windbreaker",
    "tracksuit",
    "jacket",
    "training",
    "polo",
    "vest",
]
MAX_RESULTS_PER_TEAM = 6

SEARCH_SEEDS = [
    {"team": "Argentina", "query": "Argentina Retro Soccer Jersey", "patterns": [r"\bArgentina\b"]},
    {"team": "Boca Juniors", "query": "Boca Juniors Retro Soccer Jersey", "patterns": [r"\bBoca Juniors\b"]},
    {"team": "River Plate", "query": "River Plate Retro Soccer Jersey", "patterns": [r"\bRiver Plate\b"]},
    {"team": "Barcelona", "query": "BAR Retro Soccer Jersey", "patterns": [r"\bBAR\b", r"\bBarcelona\b"]},
    {"team": "Real Madrid", "query": "RMA Retro Soccer Jersey", "patterns": [r"\bRMA\b", r"\bReal Madrid\b"]},
    {"team": "AC Milan", "query": "ACM Retro Soccer Jersey", "patterns": [r"\bACM\b", r"\bAC Milan\b"]},
    {"team": "Inter", "query": "INT Retro Soccer Jersey", "patterns": [r"\bINT\b", r"\bInter\b"]},
    {"team": "Liverpool", "query": "LIV Retro Soccer Jersey", "patterns": [r"\bLIV\b", r"\bLiverpool\b"]},
    {"team": "Manchester United", "query": "Man Utd Retro Soccer Jersey", "patterns": [r"\bMan Utd\b", r"\bManchester United\b"]},
    {"team": "Manchester City", "query": "Man City Retro Soccer Jersey", "patterns": [r"\bMan City\b", r"\bManchester City\b"]},
    {"team": "Chelsea", "query": "CHE Retro Soccer Jersey", "patterns": [r"\bCHE\b", r"\bChelsea\b"]},
    {"team": "Arsenal", "query": "ARS Retro Soccer Jersey", "patterns": [r"\bARS\b", r"\bArsenal\b"]},
    {"team": "Juventus", "query": "JUV Retro Soccer Jersey", "patterns": [r"\bJUV\b", r"\bJuventus\b"]},
    {"team": "Atletico Madrid", "query": "ATM Retro Soccer Jersey", "patterns": [r"\bATM\b", r"\bAtletico Madrid\b"]},
    {"team": "Borussia Dortmund", "query": "Dortmund Retro Soccer Jersey", "patterns": [r"\bDortmund\b", r"\bBorussia Dortmund\b"]},
    {"team": "Leverkusen", "query": "LeverKusen Retro Soccer Jersey", "patterns": [r"\bLeverKusen\b", r"\bLeverkusen\b"]},
    {"team": "Bayern Munich", "query": "Bayern Retro Soccer Jersey", "patterns": [r"\bBayern\b", r"\bBayern Munich\b"]},
    {"team": "PSG", "query": "PSG Retro Soccer Jersey", "patterns": [r"\bPSG\b", r"\bParis\b"]},
    {"team": "Flamengo", "query": "Flamengo Retro Soccer Jersey", "patterns": [r"\bFlamengo\b"]},
    {"team": "France", "query": "France Retro Soccer Jersey", "patterns": [r"\bFrance\b"]},
    {"team": "Brazil", "query": "Brazil Retro Soccer Jersey", "patterns": [r"\bBrazil\b"]},
    {"team": "Italy", "query": "Italy Retro Soccer Jersey", "patterns": [r"\bItaly\b"]},
    {"team": "Croatia", "query": "Croatia Retro Soccer Jersey", "patterns": [r"\bCroatia\b"]},
    {"team": "Spain", "query": "Spain Retro Soccer Jersey", "patterns": [r"\bSpain\b"]},
    {"team": "Portugal", "query": "Portugal Retro Soccer Jersey", "patterns": [r"\bPortugal\b"]},
    {"team": "Germany", "query": "Germany Retro Soccer Jersey", "patterns": [r"\bGermany\b"]},
    {"team": "Racing Club", "query": "Racing Club Retro Soccer Jersey", "patterns": [r"\bRacing Club\b"]},
    {"team": "CA Independiente", "query": "CA Independiente Retro Soccer Jersey", "patterns": [r"\bCA Independiente\b", r"\bIndependiente\b"]},
    {"team": "Santos FC", "query": "Santos FC Retro Soccer Jersey", "patterns": [r"\bSantos FC\b", r"\bSantos\b"]},
    {"team": "Napoli", "query": "Napoli Retro Soccer Jersey", "patterns": [r"\bNapoli\b"]},
    {"team": "Aston Villa", "query": "Aston Villa Retro Soccer Jersey", "patterns": [r"\bAston Villa\b"]},
]


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def strip_html(value: str) -> str:
    return re.sub(r"<.*?>", "", value).strip()


def sanitize_product_name(name: str) -> str:
    cleaned = name.encode("ascii", "ignore").decode()
    cleaned = re.sub(r"\([^)]*(?:VIS|NDA)[^)]*\)", " ", cleaned, flags=re.I)
    cleaned = cleaned.replace("()", " ")
    cleaned = cleaned.replace("..", " ")
    cleaned = re.sub(r"\bBoca juniors\b", "Boca Juniors", cleaned, flags=re.I)
    cleaned = re.sub(r"\bLeverKusen\b", "Leverkusen", cleaned, flags=re.I)
    return re.sub(r"\s+", " ", cleaned).strip(" -")


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


def extract_player(name: str) -> str:
    match = re.search(r"#\d+\s+([A-Za-z. ]+)", name)
    if match and match.group(1).strip():
        return re.sub(r"\s+", " ", match.group(1)).strip().upper()
    return "Sin nombre"


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
    if "player version" in normalized:
        tags.add("Version jugador")
    if any(token in normalized for token in ["anniversary", "special edition", "joint edition", "jordan"]):
        tags.add("Edicion especial")
    return list(tags)


def get_search_results(session: requests.Session, query: str) -> list[dict[str, str]]:
    html = session.get(SEARCH_URL, params={"keywords": query}, timeout=30).text
    results: list[dict[str, str]] = []
    seen: set[str] = set()
    for href, title in RESULT_PATTERN.findall(html):
        url = urljoin(SITE_ROOT, href)
        if url in seen:
            continue
        seen.add(url)
        results.append({"title": sanitize_product_name(strip_html(title)), "url": url})
    return results


def matches_team(title: str, patterns: list[str]) -> bool:
    return any(re.search(pattern, title, re.I) for pattern in patterns)


def keep_result(title: str, patterns: list[str]) -> bool:
    normalized = title.lower()
    if "soccer jersey" not in normalized:
        return False
    if any(token in normalized for token in EXCLUDED_TOKENS):
        return False
    return matches_team(title, patterns)


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
    return match.group("url") if match else None


def file_extension(image_url: str) -> str:
    suffix = Path(urlparse(image_url).path.lower()).suffix
    return suffix if suffix in {".jpg", ".jpeg", ".png", ".webp"} else ".jpg"


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
    return sanitize_product_name(slug.replace("-", " "))


def main() -> None:
    session = requests.Session()
    session.headers.update({"User-Agent": "Mozilla/5.0"})

    if OUTPUT_DIR.exists():
        shutil.rmtree(OUTPUT_DIR)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "supplier": "gmkitsc.com",
        "products": [],
    }

    seen_urls: set[str] = set()

    for seed in SEARCH_SEEDS:
        candidates = [
            item
            for item in get_search_results(session, seed["query"])
            if keep_result(item["title"], seed["patterns"])
        ]

        selected = candidates[:MAX_RESULTS_PER_TEAM]
        print(f"{seed['team']}: {len(selected)} selected from {len(candidates)} results")

        for candidate in selected:
            if candidate["url"] in seen_urls:
                continue
            seen_urls.add(candidate["url"])

            html = session.get(candidate["url"], timeout=30).text
            product_name = extract_product_name(html, candidate["url"])
            image_url = extract_og_image_url(html)
            if not image_url:
                image_urls = extract_image_urls(html)
                image_url = image_urls[0] if image_urls else None
            if not image_url:
                print(f"Skipping {candidate['url']} because no image was found")
                continue

            source_slug = re.sub(r"-p\d+\.html$", "", unquote(Path(urlparse(candidate["url"]).path).name))
            slug = slugify(source_slug)
            destination_dir = OUTPUT_DIR / slug
            destination_dir.mkdir(parents=True, exist_ok=True)
            extension = file_extension(image_url)
            local_path = destination_dir / f"01{extension}"
            response = session.get(image_url, timeout=60)
            response.raise_for_status()
            local_path.write_bytes(response.content)

            payload["products"].append(
                {
                    "id": slug,
                    "name": product_name,
                    "shortName": build_short_name(product_name),
                    "team": seed["team"],
                    "collection": "Selecciones" if seed["team"] in NATIONAL_TEAMS else "Clubes",
                    "player": extract_player(product_name),
                    "eraLabel": product_name.split(" ", 1)[0],
                    "tags": build_tags(seed["team"], product_name),
                    "sourceUrl": candidate["url"],
                    "image": f"/supplier-catalog/{slug}/01{extension}",
                    "gallery": [f"/supplier-catalog/{slug}/01{extension}"],
                }
            )

    OUTPUT_JSON.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(payload['products'])} supplier search products to {OUTPUT_JSON}")


if __name__ == "__main__":
    main()
