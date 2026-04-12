from __future__ import annotations

import json
import re
import shutil
from collections import OrderedDict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlparse

import requests


ROOT = Path(__file__).resolve().parent.parent
CATALOG_PATH = ROOT / "src" / "data" / "catalog.json"
OUTPUT_JSON = ROOT / "src" / "data" / "supplier-images.json"
OUTPUT_DIR = ROOT / "public" / "catalog"
SEARCH_URL = "https://www.gmkitsc.com/h-product-listBySearch.html"
SITE_ROOT = "https://www.gmkitsc.com"
RESULT_PATTERN = re.compile(
    r'<a href="(?P<href>/[^"#]+?\.html)"[^>]*class="name">(?P<title>.*?)</a>',
    re.S,
)
SCRIPT_PATTERN = re.compile(
    r'<script type="application/ld\+json">\s*(?P<json>.*?)\s*</script>',
    re.S,
)


PRODUCT_MATCHES: dict[str, dict[str, Any]] = {
    "1996-97 Argentina Home  #10 MEMI": {
        "query": "1996-97 Argentina Home",
        "fragments": ["1996-1997 Argentina Home Retro Soccer Jersey"],
    },
    "2005-06 BAR Away UCL  #10 Ronaldinho": {
        "query": "2005-06 BAR Away",
        "fragments": ["2005-2006 BAR Away Retro Soccer Jersey"],
    },
    "2004 Brazil Home  Ronaldinho #10": {
        "query": "2004 Brazil Home",
        "fragments": ["2004 Brazil Home Retro Soccer Jersey"],
    },
    "1986 Argentina Home  #10 MARADONA": {
        "query": "1986 Argentina Home",
        "fragments": ["1986 Argentina Home Retro Soccer Jersey"],
    },
    "1978 Argentina Home  #10 KEMPES": {
        "query": "1978 Argentina Home",
        "fragments": ["1978 Argentina Home Retro Soccer Jersey"],
    },
    "1994 Argentina Away  #10 MARADONA": {
        "query": "1994 Argentina Away",
        "fragments": ["1994 Argentina Away Retro Soccer Jersey"],
    },
    "2006 Argentina Home WC  #10 RIQUELME": {
        "query": "2006 Argentina Home WC",
        "fragments": ["2006 Argentina Home Retro Retro Soccer Jersey"],
    },
    "2006 Argentina Home WC  #19 MESSI": {
        "query": "2006 Argentina Home WC",
        "fragments": ["2006 Argentina Home Retro Retro Soccer Jersey"],
    },
    "2006 Argentina Away WC  (sin nombre)": {
        "query": "2006 Argentina Away WC",
        "fragments": ["2006 Argentina Away Retro Soccer Jersey"],
    },
    "2006-07 AC Milan Away Player UCL  #22 KAKA": {
        "query": "2006-2007 ACM UCL",
        "fragments": [
            "2006-2007 ACM Away Player Version",
            "2006-2007 ACM Away White Retro Soccer Jersey",
        ],
    },
    "2006-07 AC Milan Home UCL  #22 KAKA": {
        "query": "2006-2007 ACM Home",
        "fragments": ["2006-2007 ACM Home Retro Soccer Jersey"],
    },
    "1998-99 Real Madrid Third  (sin nombre)": {
        "query": "1998-1999 RMA Third",
        "fragments": ["1998-1999 RMA Third Retro Soccer Jersey"],
    },
    "2008-09 BAR Home Player UCL Final  #10 MESSI": {
        "query": "2008-2009 BAR UCL Version Home",
        "fragments": [
            "2008-2009 BAR Home Player Version",
            "2008-2009 BAR UCL Version Home Retro",
        ],
    },
    "1998 Argentina Away  (sin nombre)": {
        "query": "1998 Argentina Away",
        "fragments": ["1998 Argentina Away Retro Soccer Jersey"],
    },
    "1981 Boca Juniors Home  #10 MARADONA": {
        "query": "1981 Boca Juniors Home",
        "fragments": ["1981 Boca Juniors Home Retro Soccer Jersey"],
    },
    "1996-97 Boca Juniors Home  (sin nombre)": {
        "query": "1996-97 Boca Juniors Home",
        "fragments": ["1996-1997 Boca Juniors Home Retro Soccer Jersey"],
    },
    "2018-19 River Plate Home  (sin nombre)": {
        "query": "2018-19 River Plate Home",
        "fragments": ["2018-2019 River Plate Home Retro Soccer Jersey"],
    },
    "1998-99 River Plate Home  (sin nombre)": {
        "query": "1998-99 River Plate Home",
        "fragments": ["1998-1999 River Plate Home Retro Soccer Jersey"],
    },
    "1996-97 River Plate Home  (sin nombre)": {
        "query": "1996-97 River Plate Home",
        "fragments": ["1996-1997 River Plate Home Retro Soccer Jersey"],
    },
    "26-27 Argentina Away WC2022  #10 MESSI": {
        "query": "26-27 Argentina Away",
        "fragments": ["26-27 Argentina Away 1:1 Fans Soccer Jersey"],
    },
    "26-27 Argentina Home WC2022  #10 MESSI": {
        "query": "26-27 Argentina Home",
        "fragments": ["26-27 Argentina Home 1:1 Fans Soccer Jersey"],
    },
}


def slugify(value: str) -> str:
    text = value.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def strip_html(value: str) -> str:
    return re.sub(r"<.*?>", "", value).strip()


def load_unique_products() -> list[str]:
    payload = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    return list(OrderedDict.fromkeys(row["name"] for row in payload["orderLines"]))


def get_search_results(session: requests.Session, query: str) -> list[dict[str, str]]:
    html = session.get(SEARCH_URL, params={"keywords": query}, timeout=30).text
    results = []
    seen = set()
    for href, title in RESULT_PATTERN.findall(html):
        clean_title = strip_html(title)
        full_url = urljoin(SITE_ROOT, href)
        if full_url in seen:
            continue
        seen.add(full_url)
        results.append({"title": clean_title, "url": full_url})
    return results


def select_sources(results: list[dict[str, str]], fragments: list[str]) -> list[dict[str, str]]:
    selected = []
    used = set()
    for fragment in fragments:
        match = next((item for item in results if fragment.lower() in item["title"].lower()), None)
        if not match:
            raise RuntimeError(f"No result matched fragment '{fragment}'.")
        if match["url"] in used:
            continue
        used.add(match["url"])
        selected.append(match)
    return selected


def extract_image_urls(html: str) -> list[str]:
    urls = []
    seen = set()
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
                for url in image_value:
                    if isinstance(url, str) and url.startswith("http") and url not in seen:
                        seen.add(url)
                        urls.append(url)
            elif isinstance(image_value, str) and image_value.startswith("http") and image_value not in seen:
                seen.add(image_value)
                urls.append(image_value)
    if not urls:
        raise RuntimeError("No image URLs found in product page.")
    return urls


def file_extension(image_url: str) -> str:
    path = urlparse(image_url).path.lower()
    suffix = Path(path).suffix
    if suffix in {".jpg", ".jpeg", ".png", ".webp"}:
        return suffix
    return ".jpg"


def download_images(
    session: requests.Session,
    product_slug: str,
    source_pages: list[dict[str, Any]],
) -> list[dict[str, str]]:
    destination_dir = OUTPUT_DIR / product_slug
    if destination_dir.exists():
        shutil.rmtree(destination_dir)
    destination_dir.mkdir(parents=True, exist_ok=True)

    all_urls = []
    for source_page in source_pages:
        product_html = session.get(source_page["url"], timeout=30).text
        source_page["images"] = extract_image_urls(product_html)
        for image_url in source_page["images"]:
            if image_url not in all_urls:
                all_urls.append(image_url)

    downloaded = []
    for index, image_url in enumerate(all_urls, start=1):
        extension = file_extension(image_url)
        filename = f"{index:02d}{extension}"
        local_file = destination_dir / filename
        response = session.get(image_url, stream=True, timeout=60)
        response.raise_for_status()
        with local_file.open("wb") as output:
            for chunk in response.iter_content(chunk_size=1024 * 64):
                if chunk:
                    output.write(chunk)
        downloaded.append(
            {
                "url": image_url,
                "path": f"/catalog/{product_slug}/{filename}",
            }
        )
    return downloaded


def main() -> None:
    unique_products = load_unique_products()
    session = requests.Session()
    session.headers.update({"User-Agent": "Mozilla/5.0"})

    metadata: dict[str, Any] = {
        "generatedAt": None,
        "supplier": "gmkitsc.com",
        "products": {},
    }

    for product_name in unique_products:
        if product_name not in PRODUCT_MATCHES:
            raise RuntimeError(f"No supplier mapping configured for '{product_name}'.")

        config = PRODUCT_MATCHES[product_name]
        query = config["query"]
        fragments = config["fragments"]
        product_slug = slugify(product_name)
        results = get_search_results(session, query)
        source_pages = select_sources(results, fragments)
        images = download_images(session, product_slug, source_pages)

        metadata["products"][product_name] = {
            "slug": product_slug,
            "query": query,
            "sources": source_pages,
            "images": images,
        }
        print(f"Downloaded {len(images)} images for {product_name}")

    metadata["generatedAt"] = datetime.now(timezone.utc).isoformat()
    OUTPUT_JSON.write_text(json.dumps(metadata, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote supplier metadata to {OUTPUT_JSON}")


if __name__ == "__main__":
    main()
