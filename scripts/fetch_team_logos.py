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
    "Arsenal": "https://en.wikipedia.org/wiki/Arsenal_F.C.",
    "Atletico Madrid": "https://en.wikipedia.org/wiki/Atl%C3%A9tico_Madrid",
    "Boca Juniors": "https://en.wikipedia.org/wiki/Boca_Juniors",
    "Borussia Dortmund": "https://en.wikipedia.org/wiki/Borussia_Dortmund",
    "River Plate": "https://en.wikipedia.org/wiki/Club_Atl%C3%A9tico_River_Plate",
    "Barcelona": "https://en.wikipedia.org/wiki/FC_Barcelona",
    "Bayern Munich": "https://en.wikipedia.org/wiki/FC_Bayern_Munich",
    "Brazil": "https://en.wikipedia.org/wiki/Brazil_national_football_team",
    "AC Milan": "https://en.wikipedia.org/wiki/AC_Milan",
    "Chelsea": "https://en.wikipedia.org/wiki/Chelsea_F.C.",
    "Flamengo": "https://en.wikipedia.org/wiki/CR_Flamengo",
    "Real Madrid": "https://en.wikipedia.org/wiki/Real_Madrid_CF",
    "France": "https://en.wikipedia.org/wiki/France_national_football_team",
    "Spain": "https://en.wikipedia.org/wiki/Spain_national_football_team",
    "Germany": "https://en.wikipedia.org/wiki/Germany_national_football_team",
    "Inter": "https://en.wikipedia.org/wiki/Inter_Milan",
    "Juventus": "https://en.wikipedia.org/wiki/Juventus_FC",
    "Liverpool": "https://en.wikipedia.org/wiki/Liverpool_F.C.",
    "Leverkusen": "https://en.wikipedia.org/wiki/Bayer_04_Leverkusen",
    "Manchester City": "https://en.wikipedia.org/wiki/Manchester_City_F.C.",
    "Manchester United": "https://en.wikipedia.org/wiki/Manchester_United_F.C.",
    "Portugal": "https://en.wikipedia.org/wiki/Portugal_national_football_team",
    "PSG": "https://en.wikipedia.org/wiki/Paris_Saint-Germain_F.C.",
    "Inter Miami": "https://en.wikipedia.org/wiki/Inter_Miami_CF",
    "Tottenham": "https://en.wikipedia.org/wiki/Tottenham_Hotspur_F.C.",
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
