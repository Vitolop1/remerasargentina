from __future__ import annotations

import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path

import requests


ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = ROOT / "public" / "crests"
OUTPUT_JSON = ROOT / "src" / "data" / "team-logos.json"

TEAM_PAGES = {
    "Argentina": "https://en.wikipedia.org/wiki/Argentina_national_football_team",
    "Boca Juniors": "https://en.wikipedia.org/wiki/Boca_Juniors",
    "River Plate": "https://en.wikipedia.org/wiki/Club_Atl%C3%A9tico_River_Plate",
    "Barcelona": "https://en.wikipedia.org/wiki/FC_Barcelona",
    "Brazil": "https://en.wikipedia.org/wiki/Brazil_national_football_team",
    "AC Milan": "https://en.wikipedia.org/wiki/AC_Milan",
    "Real Madrid": "https://en.wikipedia.org/wiki/Real_Madrid_CF",
    "France": "https://en.wikipedia.org/wiki/France_national_football_team",
    "Spain": "https://en.wikipedia.org/wiki/Spain_national_football_team",
    "Germany": "https://en.wikipedia.org/wiki/Germany_national_football_team",
    "Portugal": "https://en.wikipedia.org/wiki/Portugal_national_football_team",
    "Manchester City": "https://en.wikipedia.org/wiki/Manchester_City_F.C.",
    "PSG": "https://en.wikipedia.org/wiki/Paris_Saint-Germain_F.C.",
    "Inter Miami": "https://en.wikipedia.org/wiki/Inter_Miami_CF",
    "Bayern Munich": "https://en.wikipedia.org/wiki/FC_Bayern_Munich",
}

IMAGE_PATTERN = re.compile(r"https://upload\.wikimedia\.org/[^\"]+")
BAD_SNIPPETS = ("kit_", "semi-protection", "gnome-mime", "openclipart")
GOOD_SNIPPETS = ("logo", "crest", "badge", "seal", "emblem")


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def pick_logo_url(html: str) -> str:
    candidates: list[str] = []
    for match in IMAGE_PATTERN.finditer(html):
        url = match.group(0)
        lower = url.lower()
        if any(snippet in lower for snippet in BAD_SNIPPETS):
            continue
        if url not in candidates:
            candidates.append(url)

    for url in candidates:
        if any(snippet in url.lower() for snippet in GOOD_SNIPPETS):
            return url

    if not candidates:
        raise RuntimeError("No suitable crest image found.")

    return candidates[0]


def download_with_retry(session: requests.Session, url: str, attempts: int = 4) -> bytes:
    last_error: Exception | None = None
    for attempt in range(attempts):
        try:
            response = session.get(url, timeout=60)
            response.raise_for_status()
            return response.content
        except requests.HTTPError as error:
            last_error = error
            if error.response is None or error.response.status_code != 429 or attempt == attempts - 1:
                raise
            time.sleep(2 * (attempt + 1))
    if last_error is not None:
        raise last_error
    raise RuntimeError("Unable to download crest.")


def main() -> None:
    session = requests.Session()
    session.headers.update({"User-Agent": "Mozilla/5.0"})
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": "wikipedia.org",
        "teams": {},
    }

    for team, page_url in TEAM_PAGES.items():
        html = session.get(page_url, timeout=30).text
        logo_url = pick_logo_url(html)
        destination = OUTPUT_DIR / f"{slugify(team)}.png"
        destination.write_bytes(download_with_retry(session, logo_url))

        payload["teams"][team] = {
            "sourcePage": page_url,
            "imageUrl": logo_url,
            "path": f"/crests/{destination.name}",
        }
        print(f"Downloaded crest for {team}")

    OUTPUT_JSON.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {OUTPUT_JSON}")


if __name__ == "__main__":
    main()
