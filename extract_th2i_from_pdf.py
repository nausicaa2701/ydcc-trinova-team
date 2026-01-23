"""
TH2I (HCMC TVHN) PDF extractor.

This file was accidentally truncated. It has been restored with:
- Optional auto-fetch of the newest `HCMC_TVHN_YYYYMMDD.pdf` from
  https://www.phongchonglutbaotphcm.gov.vn/index.php/dubaocanhbao/du-bao-thuy-van
- The extraction helpers expected by `crawl_training_pdfs.py`:
  - extract_all_rows
  - extract_full_text
  - parse_forecast_from_text
  - is_valid_station
  - is_number
  - clean
  - normalize_time

Outputs are written to `th2i_output/`.
"""

from __future__ import annotations

import json
import re
import urllib.parse
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import pdfplumber

# Networking imports (optional for auto-downloading PDFs)
try:
    import requests
    from bs4 import BeautifulSoup

    HTTP_AVAILABLE = True
except Exception:
    HTTP_AVAILABLE = False


# ===================== CONFIG =====================
PDF_DIR = Path("ref/paper")
PDF_DIR.mkdir(parents=True, exist_ok=True)

OUTPUT_DIR = Path("th2i_output")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

BASE_URL = "https://www.phongchonglutbaotphcm.gov.vn"
CATEGORY_URL = f"{BASE_URL}/index.php/dubaocanhbao/du-bao-thuy-van"

# Used by `crawl_training_pdfs.py` if present
SECTION_PATTERNS: Dict[str, str] = {}


# ===================== HELPERS (expected by other scripts) =====================
def clean(x: Any) -> Optional[float]:
    """Best-effort numeric cleaner. Returns float if possible, else None."""
    if x is None:
        return None
    if isinstance(x, (int, float)):
        return float(x)
    s = str(x).strip()
    if not s:
        return None
    # remove thousand separators, normalize decimal comma
    s = s.replace("\u00a0", " ").replace(" ", "")
    s = s.replace(",", ".")
    # strip non-numeric (keep - and .)
    s2 = re.sub(r"[^0-9.\-]+", "", s)
    if s2 in ("", "-", ".", "-."):
        return None
    try:
        return float(s2)
    except Exception:
        return None


def is_number(x: Any) -> bool:
    return clean(x) is not None


def is_valid_station(name: Any) -> bool:
    if name is None:
        return False
    s = str(name).strip()
    if not s:
        return False
    s_upper = s.upper()
    # Common header/garbage tokens
    bad = [
        "TRẠM",
        "TRAM",
        "GHI CHÚ",
        "GHI CHU",
        "DỰ BÁO",
        "DU BAO",
        "THỜI GIAN",
        "THOI GIAN",
        "MỰC NƯỚC",
        "MUC NUOC",
        "LƯỢNG MƯA",
        "LUONG MUA",
    ]
    return not any(b in s_upper for b in bad)


def normalize_time(x: Any) -> Optional[str]:
    """Normalize common time tokens to HH:MM when possible."""
    if x is None:
        return None
    s = str(x).strip()
    if not s:
        return None

    # 6h / 6H / 06h
    m = re.match(r"^\s*(\d{1,2})\s*[hH]\s*$", s)
    if m:
        hh = int(m.group(1))
        if 0 <= hh <= 23:
            return f"{hh:02d}:00"

    # 6:30 / 06:30
    m = re.match(r"^\s*(\d{1,2})\s*[:.]\s*(\d{1,2})\s*$", s)
    if m:
        hh = int(m.group(1))
        mm = int(m.group(2))
        if 0 <= hh <= 23 and 0 <= mm <= 59:
            return f"{hh:02d}:{mm:02d}"

    return s


def extract_full_text(pdf: pdfplumber.PDF) -> str:
    parts: List[str] = []
    for page in pdf.pages:
        try:
            t = page.extract_text() or ""
        except Exception:
            t = ""
        if t:
            parts.append(t)
    return "\n".join(parts)


def extract_all_rows(pdf: pdfplumber.PDF) -> List[List[str]]:
    """
    Extract all table rows (best-effort) across pages.
    Returns rows as list of strings (None -> "").
    """
    all_rows: List[List[str]] = []
    for page in pdf.pages:
        try:
            tables = page.extract_tables() or []
        except Exception:
            tables = []
        for table in tables:
            for row in table or []:
                if not row:
                    continue
                all_rows.append([(c if c is not None else "").strip() for c in row])
    return all_rows


def parse_forecast_from_text(full_text: str) -> Dict[str, Any]:
    """
    Best-effort tide forecast parser from full text.
    This is intentionally conservative; if patterns are not found, returns {}.
    """
    text = full_text or ""
    # Example: capture any lines that look like forecast bullets
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    forecast_lines = [ln for ln in lines if "DỰ BÁO" in ln.upper() or "DU BAO" in ln.upper()]
    return {"raw_lines": forecast_lines[:200]} if forecast_lines else {}


# ===================== FILE FETCHING =====================
def extract_date_from_filename(filename: str) -> Optional[datetime]:
    """Extract date from filename like HCMC_TVHN_20260123.pdf."""
    m = re.search(r"HCMC_TVHN_(\d{8})\.pdf", filename, re.IGNORECASE)
    if not m:
        return None
    try:
        return datetime.strptime(m.group(1), "%Y%m%d")
    except Exception:
        return None


def fetch_latest_th2i_pdf(download_dir: Path) -> Optional[Path]:
    """
    Fetch the newest `HCMC_TVHN_YYYYMMDD.pdf` from CATEGORY_URL.
    Downloads into `download_dir` and returns the local path.
    """
    if not HTTP_AVAILABLE:
        return None

    download_dir.mkdir(parents=True, exist_ok=True)
    session = requests.Session()
    session.headers.update(
        {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36"}
    )

    try:
        resp = session.get(CATEGORY_URL, timeout=45)
        resp.raise_for_status()
    except Exception:
        return None

    try:
        soup = BeautifulSoup(resp.text, "lxml")
    except Exception:
        soup = BeautifulSoup(resp.text, "html.parser")

    pdf_urls: List[tuple[str, datetime]] = []

    # Prefer direct preview links (/phocadownload/.../HCMC_TVHN_YYYYMMDD.pdf)
    for a in soup.find_all("a", href=True):
        href = (a.get("href") or "").strip()
        text = (a.get_text() or "").strip()
        candidate = href or ""

        if "HCMC_TVHN" not in (candidate + " " + text).upper():
            continue

        # If href is a "download=" link, sometimes the preview link exists elsewhere.
        # Still keep it, but we prefer direct /phocadownload/ links.
        if "/phocadownload/" in candidate.lower() and candidate.lower().endswith(".pdf"):
            pdf_url = urllib.parse.urljoin(BASE_URL, candidate)
            filename = Path(urllib.parse.urlparse(pdf_url).path).name
        elif text.upper().startswith("HCMC_TVHN_") and text.lower().endswith(".pdf"):
            # Sometimes filename is in text; try to find a nearby preview link
            if candidate.lower().endswith(".pdf"):
                pdf_url = urllib.parse.urljoin(BASE_URL, candidate)
                filename = Path(urllib.parse.urlparse(pdf_url).path).name
            else:
                continue
        else:
            continue

        dt = extract_date_from_filename(filename) or datetime(2000, 1, 1)
        pdf_urls.append((pdf_url, dt))

    if not pdf_urls:
        return None

    pdf_urls.sort(key=lambda x: x[1], reverse=True)
    latest_url, _ = pdf_urls[0]
    filename = Path(urllib.parse.urlparse(latest_url).path).name or "HCMC_TVHN_latest.pdf"
    dest = download_dir / filename

    if dest.exists():
        return dest

    try:
        r = session.get(latest_url, stream=True, timeout=60)
        r.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
        return dest
    except Exception:
        return None


def _pick_local_pdf(pdf_dir: Path) -> Optional[Path]:
    pdfs = list(pdf_dir.glob("HCMC_TVHN_*.pdf"))
    if not pdfs:
        return None
    pdfs.sort(
        key=lambda p: extract_date_from_filename(p.name) or datetime(2000, 1, 1),
        reverse=True,
    )
    return pdfs[0]


@dataclass
class ExtractOutputs:
    observation: List[Dict[str, Any]]
    tide_measured: List[Dict[str, Any]]
    tide_forecast: Dict[str, Any]


def extract_th2i_from_pdf_path(pdf_path: Path) -> ExtractOutputs:
    dt = extract_date_from_filename(pdf_path.name)
    date_str = (dt.strftime("%Y-%m-%d") if dt else None)

    with pdfplumber.open(str(pdf_path)) as pdf:
        rows = extract_all_rows(pdf)
        full_text = extract_full_text(pdf)
        tide_forecast = parse_forecast_from_text(full_text)

    observation: List[Dict[str, Any]] = []
    tide_measured: List[Dict[str, Any]] = []

    # Heuristic row parsing (keeps compatibility with `crawl_training_pdfs.py`)
    for r in rows:
        if not r:
            continue
        # Observation rows (expect >= 9 cols): station, rain, ..., water_level(5), inflow(6), turbine(7), discharge(8)
        if len(r) >= 9 and is_valid_station(r[0]) and (is_number(r[5]) or is_number(r[6])):
            observation.append(
                {
                    "date": date_str,
                    "station": str(r[0]).strip(),
                    "rain_mm": clean(r[1]),
                    "water_level_m": clean(r[5]),
                    "inflow_m3s": clean(r[6]),
                    "turbine_flow_m3s": clean(r[7]),
                    "discharge_m3s": clean(r[8]),
                    "raw_row": r,
                    "source_file": pdf_path.name,
                }
            )
            continue

        # Tide measured rows (varies; expect station name + at least one numeric level)
        if len(r) >= 6 and is_valid_station(r[0]) and is_number(r[2]):
            tide_measured.append(
                {
                    "date": date_str,
                    "station": str(r[0]).strip(),
                    "peaks": [
                        {"level_m": clean(r[2]), "time": normalize_time(r[3])},
                        {"level_m": clean(r[4]), "time": normalize_time(r[5])},
                    ],
                    "raw_row": r,
                    "source_file": pdf_path.name,
                }
            )

    # Attach file/date metadata to forecast
    if isinstance(tide_forecast, dict):
        tide_forecast = {
            **tide_forecast,
            "date": date_str,
            "source_file": pdf_path.name,
        }

    return ExtractOutputs(
        observation=observation,
        tide_measured=tide_measured,
        tide_forecast=tide_forecast,
    )


def _write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def main() -> None:
    # Try fetch newest, else fallback to newest local
    pdf_path = fetch_latest_th2i_pdf(PDF_DIR) or _pick_local_pdf(PDF_DIR)
    if pdf_path is None or not pdf_path.exists():
        raise SystemExit(f"ERROR: No TH2I PDF found in `{PDF_DIR}` and fetch failed.")

    out = extract_th2i_from_pdf_path(pdf_path)

    _write_json(OUTPUT_DIR / "th2i_observation.json", out.observation)
    _write_json(OUTPUT_DIR / "th2i_tide_measured.json", out.tide_measured)
    _write_json(OUTPUT_DIR / "th2i_tide_forecast.json", out.tide_forecast)

    print(f"OK: wrote {len(out.observation)} observation rows to {OUTPUT_DIR/'th2i_observation.json'}")
    print(f"OK: wrote {len(out.tide_measured)} tide rows to {OUTPUT_DIR/'th2i_tide_measured.json'}")
    print(f"OK: wrote forecast to {OUTPUT_DIR/'th2i_tide_forecast.json'}")


if __name__ == "__main__":
    main()
