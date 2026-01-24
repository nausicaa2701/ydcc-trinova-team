#!/usr/bin/env python3
"""
Crawl both TH2I and Salinity PDFs for training data collection.
Merges logic from extract_th2i_from_pdf.py and extract_station_data_from_pdf.py
After crawling, automatically extracts data and saves to dataset/
"""

import re
import json
import urllib.parse
import sys
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional, List, Tuple, Dict
import time

# Import extract functions from original files (DO NOT MODIFY ORIGINAL FILES)
# We'll import them as modules and use their functions
import importlib.util

# Import pandas for CSV export
try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False
    print("WARNING: pandas not installed. Install with: pip install pandas")

# Import pdfplumber for PDF extraction
try:
    import pdfplumber
    PDFPLUMBER_AVAILABLE = True
except ImportError:
    PDFPLUMBER_AVAILABLE = False
    print("WARNING: pdfplumber not installed. Install with: pip install pdfplumber")

# Import extract modules from original files (DO NOT MODIFY ORIGINAL FILES)
def load_extract_module(module_path: str, module_name: str):
    """Load a Python module from file path."""
    spec = importlib.util.spec_from_file_location(module_name, module_path)
    if spec is None or spec.loader is None:
        return None
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module

# Load extract modules
EXTRACT_TH2I_MODULE = None
EXTRACT_SALINITY_MODULE = None

# Load extract modules (silently, will print errors only if extraction is attempted)
try:
    th2i_extract_path = Path(__file__).parent / "extract_th2i_from_pdf.py"
    if th2i_extract_path.exists():
        EXTRACT_TH2I_MODULE = load_extract_module(str(th2i_extract_path), "extract_th2i")
except Exception as e:
    EXTRACT_TH2I_MODULE = None

try:
    salinity_extract_path = Path(__file__).parent / "extract_station_data_from_pdf.py"
    if salinity_extract_path.exists():
        EXTRACT_SALINITY_MODULE = load_extract_module(str(salinity_extract_path), "extract_salinity")
except Exception as e:
    EXTRACT_SALINITY_MODULE = None

# Networking imports
try:
    import requests
    from bs4 import BeautifulSoup
    HTTP_AVAILABLE = True
except ImportError:
    HTTP_AVAILABLE = False
    print("WARNING: requests/bs4 not installed. Install with: pip install requests beautifulsoup4")

# ===================== CONFIG =====================
CRAWL_DATA_DIR = Path("Crawl_data")
CRAWL_DATA_DIR.mkdir(exist_ok=True)

# TH2I PDF sources
TH2I_BASE_URL = "https://www.phongchonglutbaotphcm.gov.vn"
TH2I_CATEGORY_URL = f"{TH2I_BASE_URL}/index.php/dubaocanhbao/du-bao-thuy-van"

# Salinity PDF sources
SALINITY_BASE_URL = "http://www.kttv-nb.org.vn"
SALINITY_CATEGORY_URL = f"{SALINITY_BASE_URL}/index.php/thong-tin-kttv/thuy-van"

# ===================== HELPERS =====================
def extract_date_from_filename(filename: str) -> Optional[datetime]:
    """Extract date from filename like HCMC_TVHN_20260123.pdf or HOCM_XMAN_20240331_1530.pdf"""
    # TH2I pattern: HCMC_TVHN_YYYYMMDD.pdf
    match = re.search(r'HCMC_TVHN_(\d{8})\.pdf', filename, re.IGNORECASE)
    if match:
        try:
            date_str = match.group(1)
            return datetime.strptime(date_str, '%Y%m%d')
        except ValueError:
            pass
    
    # Salinity pattern: HOCM_XMAN_YYYYMMDD_HHMM.pdf
    match = re.search(r'HOCM_XMAN_(\d{8})', filename, re.IGNORECASE)
    if match:
        try:
            date_str = match.group(1)
            return datetime.strptime(date_str, '%Y%m%d')
        except ValueError:
            pass
    
    return None

def _extract_article_id(url: str) -> int:
    """Extract numeric article id from url if present, else -1."""
    m = re.search(r'/article/(\d+)', url)
    if not m:
        m = re.search(r'attachments/[^/]+/(\d+)', url)
    try:
        return int(m.group(1)) if m else -1
    except Exception:
        return -1

def _extract_pdf_url_from_viewer(href: str) -> Optional[str]:
    """Extract the real PDF URL from Google viewer links."""
    m = re.search(r"url=([^&]+\.pdf)", href, flags=re.IGNORECASE)
    if m:
        return urllib.parse.unquote(m.group(1))
    return None

def _download_pdf(session: requests.Session, pdf_url: str, dest_dir: Path) -> Optional[Path]:
    """Download a PDF file."""
    try:
        filename = Path(urllib.parse.urlparse(pdf_url).path).name or "download.pdf"
        dest = dest_dir / filename
        
        # Skip if already exists
        if dest.exists():
            return dest
        
        r = session.get(pdf_url, stream=True, timeout=60)
        r.raise_for_status()
        
        # Check if it's actually a PDF
        content_type = r.headers.get("Content-Type", "").lower()
        if "pdf" not in content_type and not pdf_url.lower().endswith('.pdf'):
            print(f"      WARNING: {pdf_url} might not be a PDF (Content-Type: {content_type})")
        
        with open(dest, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
        
        return dest
    except Exception as e:
        print(f"      ERROR: Failed to download {pdf_url}: {e}")
        return None

# ===================== TH2I PDF CRAWLING =====================
def fetch_multiple_th2i_pdfs(download_dir: Path, max_pdfs: int = 134, days_back: int = 180) -> List[Path]:
    """
    Fetch multiple TH2I PDFs (HCMC_TVHN_*.pdf) from HCM City website.
    
    Args:
        download_dir: Directory to save PDFs
        max_pdfs: Maximum number of PDFs to download
        days_back: How many days back to search (default 180 = ~6 months)
    
    Returns:
        List of downloaded PDF file paths
    """
    if not HTTP_AVAILABLE:
        print("WARNING: Skipping TH2I PDF fetch (requests/bs4 not installed)")
        return []
    
    download_dir.mkdir(parents=True, exist_ok=True)
    th2i_dir = download_dir / "th2i"
    th2i_dir.mkdir(exist_ok=True)
    
    print(f"\n{'='*80}")
    print(f"FETCHING TH2I PDFs (HCMC_TVHN_*.pdf)")
    print(f"{'='*80}")
    print(f"Target: {max_pdfs} PDFs")
    print(f"Source: {TH2I_CATEGORY_URL}")
    print()
    
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    })
    
    downloaded_files: List[Path] = []
    pdf_urls: List[Tuple[str, datetime]] = []
    
    # Method 1: Try to fetch from category page
    try:
        print(f"Connecting to {TH2I_CATEGORY_URL}...")
        resp = session.get(TH2I_CATEGORY_URL, timeout=45)
        resp.raise_for_status()
        print(f"OK: Got response: {len(resp.text)} characters, status: {resp.status_code}")
        
        try:
            soup = BeautifulSoup(resp.text, "lxml")
        except Exception:
            soup = BeautifulSoup(resp.text, "html.parser")
        
        print(f"Parsed HTML, looking for PDF links...")
        all_links = soup.find_all("a", href=True)
        print(f"   Found {len(all_links)} total <a> tags")
        
        # Find all PDF links matching HCMC_TVHN pattern
        for a in all_links:
            href = a.get("href", "")
            link_text = re.sub(r'\s+', ' ', a.get_text() or "").strip()
            
            if not href:
                continue
            
            # Extract filename
            filename = None
            if link_text:
                match = re.search(r'HCMC[_\s]*TVHN[_\s]*(\d{8})\.pdf', link_text, re.IGNORECASE)
                if match:
                    date_part = match.group(1)
                    filename = f"HCMC_TVHN_{date_part}.pdf"
            
            if not filename and "/phocadownload/" in href:
                path_name = Path(urllib.parse.urlparse(href).path).name
                if path_name and "HCMC" in path_name.upper() and "TVHN" in path_name.upper() and path_name.endswith('.pdf'):
                    filename = path_name
            
            if not filename:
                match = re.search(r'HCMC[_\s]*TVHN[_\s]*(\d{8})\.pdf', href, re.IGNORECASE)
                if match:
                    date_part = match.group(1)
                    filename = f"HCMC_TVHN_{date_part}.pdf"
            
            if not filename or "HCMC" not in filename.upper() or "TVHN" not in filename.upper():
                continue
            
            # Determine PDF URL
            if "/phocadownload/" in href:
                pdf_url = urllib.parse.urljoin(TH2I_BASE_URL, href)
            elif "download=" in href or ".pdf" in href.lower():
                date = extract_date_from_filename(filename)
                if date:
                    year = date.strftime('%Y')
                    month_year = date.strftime('%m-%Y')
                    preview_path = f"/phocadownload/{year}/{month_year}/{filename}"
                    pdf_url = urllib.parse.urljoin(TH2I_BASE_URL, preview_path)
                else:
                    pdf_url = urllib.parse.urljoin(TH2I_BASE_URL, href)
            else:
                continue
            
            # Extract date
            date = extract_date_from_filename(filename)
            if date:
                pdf_urls.append((pdf_url, date))
                print(f"   Found: {filename} (date: {date.strftime('%Y-%m-%d')})")
            else:
                pdf_urls.append((pdf_url, datetime(2000, 1, 1)))
                print(f"   Found: {filename} (date: unknown)")
    
    except Exception as e:
        print(f"ERROR: Cannot fetch category page: {e}")
        resp = None
    
    # Method 2: Fallback - Direct URL scan by date pattern
    if len(pdf_urls) < max_pdfs:
        print(f"\nFallback: Trying direct URL scan (last {days_back} days)...")
        today = datetime.today()
        for delta in range(0, days_back):
            d = today - timedelta(days=delta)
            date_str = d.strftime('%Y%m%d')
            filename = f"HCMC_TVHN_{date_str}.pdf"
            year = d.strftime('%Y')
            month_year = d.strftime('%m-%Y')
            direct_path = f"/phocadownload/{year}/{month_year}/{filename}"
            direct_url = urllib.parse.urljoin(TH2I_BASE_URL, direct_path)
            
            # Check if already in list
            if any(url == direct_url for url, _ in pdf_urls):
                continue
            
            pdf_urls.append((direct_url, d))
            
            if len(pdf_urls) >= max_pdfs * 2:  # Get more URLs than needed for deduplication
                break
    
    # Deduplicate by URL and sort by date (newest first)
    seen_urls = set()
    unique_pdf_urls = []
    for url, date in pdf_urls:
        if url not in seen_urls:
            seen_urls.add(url)
            unique_pdf_urls.append((url, date))
    
    unique_pdf_urls.sort(key=lambda x: x[1], reverse=True)
    
    # Limit to max_pdfs
    unique_pdf_urls = unique_pdf_urls[:max_pdfs]
    
    print(f"\nFound {len(unique_pdf_urls)} unique TH2I PDF URLs")
    print(f"Downloading up to {max_pdfs} PDFs...")
    
    # Download PDFs
    for i, (pdf_url, date) in enumerate(unique_pdf_urls, 1):
        print(f"  [{i}/{len(unique_pdf_urls)}] Downloading: {Path(urllib.parse.urlparse(pdf_url).path).name}")
        dest = _download_pdf(session, pdf_url, th2i_dir)
        if dest:
            downloaded_files.append(dest)
            print(f"    ✅ Saved: {dest.name}")
        else:
            print(f"    ❌ Failed")
        
        # Small delay to avoid overwhelming server
        if i < len(unique_pdf_urls):
            time.sleep(0.5)
    
    print(f"\n✅ TH2I: Downloaded {len(downloaded_files)} PDF(s) to {th2i_dir}")
    return downloaded_files

# ===================== SALINITY PDF CRAWLING =====================
def fetch_multiple_salinity_pdfs(download_dir: Path, max_pdfs: int = 134, max_articles: int = 200) -> List[Path]:
    """
    Fetch multiple Salinity PDFs (HOCM_XMAN_*.pdf) from kttv-nb.org.vn.
    
    Args:
        download_dir: Directory to save PDFs
        max_pdfs: Maximum number of PDFs to download
        max_articles: Maximum number of articles to check
    
    Returns:
        List of downloaded PDF file paths
    """
    if not HTTP_AVAILABLE:
        print("WARNING: Skipping Salinity PDF fetch (requests/bs4 not installed)")
        return []
    
    download_dir.mkdir(parents=True, exist_ok=True)
    salinity_dir = download_dir / "salinity"
    salinity_dir.mkdir(exist_ok=True)
    
    print(f"\n{'='*80}")
    print(f"FETCHING SALINITY PDFs (HOCM_XMAN_*.pdf)")
    print(f"{'='*80}")
    print(f"Target: {max_pdfs} PDFs")
    print(f"Source: {SALINITY_CATEGORY_URL}")
    print()
    
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    })
    
    downloaded_files: List[Path] = []
    
    try:
        print(f"Connecting to {SALINITY_CATEGORY_URL}...")
        resp = session.get(SALINITY_CATEGORY_URL, timeout=45)
        resp.raise_for_status()
        print(f"OK: Got response: {len(resp.text)} characters, status: {resp.status_code}")
    except Exception as e:
        print(f"ERROR: Cannot fetch category page: {e}")
        return []
    
    try:
        soup = BeautifulSoup(resp.text, "lxml")
    except:
        soup = BeautifulSoup(resp.text, "html.parser")
    
    print(f"Parsed HTML, looking for links...")
    all_links = soup.find_all("a", href=True)
    print(f"   Found {len(all_links)} total <a> tags")
    
    # Find article links
    article_links: List[str] = []
    for a in all_links:
        text = (a.get_text() or "").lower()
        href = a.get("href", "")
        
        # Check if link text matches xâm nhập mặn + HCM
        if "xâm nhập mặn" in text and any(k in text for k in ["tphcm", "tp.hcm", "hồ chí minh", "ho chi minh", "thành phố"]):
            url = urllib.parse.urljoin(SALINITY_BASE_URL, href)
            if url not in article_links:
                article_links.append(url)
        
        # Fallback: links in category path
        elif "thong-tin-kttv" in href and "thuy-van" in href and "article" in href:
            url = urllib.parse.urljoin(SALINITY_BASE_URL, href)
            if url not in article_links:
                article_links.append(url)
    
    # Sort by article id (newest first) and limit
    article_links = sorted(article_links, key=_extract_article_id, reverse=True)[:max_articles]
    
    print(f"\nFound {len(article_links)} article links")
    print(f"Visiting articles to find PDFs...")
    
    all_pdf_urls: List[Tuple[str, Optional[datetime]]] = []
    
    # Visit articles to find PDFs
    for i, article_url in enumerate(article_links, 1):
        if len(all_pdf_urls) >= max_pdfs * 2:  # Get more than needed for deduplication
            break
        
        try:
            print(f"  [{i}/{len(article_links)}] Checking: {article_url[:80]}...")
            ar = session.get(article_url, timeout=45)
            ar.raise_for_status()
            asoup = BeautifulSoup(ar.text, "lxml") if 'lxml' in BeautifulSoup.__module__ else BeautifulSoup(ar.text, "html.parser")
            
            pdf_urls: List[str] = []
            for aa in asoup.find_all("a", href=True):
                href = aa["href"]
                if ".pdf" in href and "attachments/article" in href:
                    pdf_urls.append(urllib.parse.urljoin(SALINITY_BASE_URL, href))
                elif "viewer" in href or "gview" in href:
                    real = _extract_pdf_url_from_viewer(href)
                    if real:
                        pdf_urls.append(real)
            
            # Filter for HOCM_XMAN pattern
            for pdf_url in pdf_urls:
                filename = Path(urllib.parse.urlparse(pdf_url).path).name
                if "HOCM" in filename.upper() and "XMAN" in filename.upper():
                    date = extract_date_from_filename(filename)
                    all_pdf_urls.append((pdf_url, date))
                    print(f"    Found: {filename}")
            
            time.sleep(0.3)  # Small delay
            
        except Exception as e:
            print(f"    WARNING: Skip article {article_url}: {e}")
            continue
    
    # Deduplicate and sort by date (newest first)
    seen_urls = set()
    unique_pdf_urls = []
    for url, date in all_pdf_urls:
        if url not in seen_urls:
            seen_urls.add(url)
            unique_pdf_urls.append((url, date))
    
    # Sort by date (newest first), use article id as fallback
    unique_pdf_urls.sort(key=lambda x: (x[1] or datetime(2000, 1, 1), _extract_article_id(x[0])), reverse=True)
    unique_pdf_urls = unique_pdf_urls[:max_pdfs]
    
    print(f"\nFound {len(unique_pdf_urls)} unique Salinity PDF URLs")
    print(f"Downloading up to {max_pdfs} PDFs...")
    
    # Download PDFs
    for i, (pdf_url, date) in enumerate(unique_pdf_urls, 1):
        filename = Path(urllib.parse.urlparse(pdf_url).path).name
        print(f"  [{i}/{len(unique_pdf_urls)}] Downloading: {filename}")
        dest = _download_pdf(session, pdf_url, salinity_dir)
        if dest:
            downloaded_files.append(dest)
            print(f"    ✅ Saved: {dest.name}")
        else:
            print(f"    ❌ Failed")
        
        if i < len(unique_pdf_urls):
            time.sleep(0.5)
    
    print(f"\n✅ Salinity: Downloaded {len(downloaded_files)} PDF(s) to {salinity_dir}")
    return downloaded_files

# ===================== EXTRACTION LOGIC =====================
def extract_th2i_from_pdf(pdf_path: Path) -> Dict:
    """
    Extract TH2I data from a single PDF using logic from extract_th2i_from_pdf.py
    Returns dict with observation, tide_measured, tide_forecast
    """
    if not PDFPLUMBER_AVAILABLE:
        print(f"  ERROR: pdfplumber not available, skipping {pdf_path.name}")
        return {}
    
    if EXTRACT_TH2I_MODULE is None:
        print(f"  ERROR: extract_th2i module not loaded, skipping {pdf_path.name}")
        return {}
    
    try:
        observation = []
        tide_measured = []
        
        # Get constants from module
        section_patterns = getattr(EXTRACT_TH2I_MODULE, 'SECTION_PATTERNS', {})
        
        with pdfplumber.open(pdf_path) as pdf:
            rows = EXTRACT_TH2I_MODULE.extract_all_rows(pdf)
            full_text = EXTRACT_TH2I_MODULE.extract_full_text(pdf)
        
        # Parse forecast from text
        tide_forecast = EXTRACT_TH2I_MODULE.parse_forecast_from_text(full_text)
        
        # Parse observation and tide_measured from rows
        mode = None
        current_station = None
        
        for r in rows:
            if not r:
                continue
            
            joined = " ".join([str(x) for x in r if x]).strip()
            
            # Detect section
            for k, p in section_patterns.items():
                if p.search(joined):
                    mode = k
                    current_station = None
                    break
            
            # OBSERVATION
            if mode == "observation":
                if len(r) >= 9:
                    station = (r[0] or "").strip() if isinstance(r[0], str) else r[0]
                    if not EXTRACT_TH2I_MODULE.is_valid_station(station):
                        continue
                    
                    if not (EXTRACT_TH2I_MODULE.is_number(r[5]) or EXTRACT_TH2I_MODULE.is_number(r[6])):
                        continue
                    
                    record = {
                        "station": station,
                        "rain_mm": EXTRACT_TH2I_MODULE.clean(r[1]),
                        "reservoir": r[2],
                        "river": r[3],
                        "basin": r[4],
                        "water_level_m": EXTRACT_TH2I_MODULE.clean(r[5]),
                        "inflow_m3s": EXTRACT_TH2I_MODULE.clean(r[6]),
                        "turbine_flow_m3s": EXTRACT_TH2I_MODULE.clean(r[7]),
                        "discharge_m3s": EXTRACT_TH2I_MODULE.clean(r[8]),
                        "source_file": pdf_path.name,
                    }
                    if len(r) >= 10:
                        record["note"] = r[9]
                    observation.append(record)
            
            # TIDE MEASURED
            elif mode == "tide_measured":
                if len(r) >= 8:
                    if EXTRACT_TH2I_MODULE.is_valid_station(r[0]):
                        current_station = str(r[0]).strip()
                        river = r[1]
                    elif current_station:
                        river = None
                    else:
                        continue
                    
                    if EXTRACT_TH2I_MODULE.is_number(r[2]):
                        tide_measured.append({
                            "station": current_station,
                            "river": river,
                            "high_tides": [
                                {"level_m": EXTRACT_TH2I_MODULE.clean(r[2]), "time": EXTRACT_TH2I_MODULE.normalize_time(r[3])},
                                {"level_m": EXTRACT_TH2I_MODULE.clean(r[4]), "time": EXTRACT_TH2I_MODULE.normalize_time(r[5])}
                            ],
                            "low_tides": [
                                {"level_m": EXTRACT_TH2I_MODULE.clean(r[6]), "time": EXTRACT_TH2I_MODULE.normalize_time(r[7])}
                            ],
                            "source_file": pdf_path.name,
                        })
        
        return {
            "observation": observation,
            "tide_measured": tide_measured,
            "tide_forecast": tide_forecast,
        }
    except Exception as e:
        print(f"  ERROR: Failed to extract from {pdf_path.name}: {e}")
        import traceback
        traceback.print_exc()
        return {}

def extract_salinity_from_pdf(pdf_path: Path) -> List[Dict]:
    """
    Extract Salinity data from a single PDF using logic from extract_station_data_from_pdf.py
    Returns list of station data dictionaries
    """
    if EXTRACT_SALINITY_MODULE is None:
        print(f"  ERROR: extract_salinity module not loaded, skipping {pdf_path.name}")
        return []
    
    try:
        return EXTRACT_SALINITY_MODULE.extract_all_stations_from_pdf(pdf_path)
    except Exception as e:
        print(f"  ERROR: Failed to extract from {pdf_path.name}: {e}")
        return []

def extract_all_th2i_pdfs(th2i_dir: Path) -> Dict:
    """Extract data from all TH2I PDFs."""
    print(f"\n{'='*80}")
    print(f"EXTRACTING TH2I DATA")
    print(f"{'='*80}")
    
    pdf_files = sorted(th2i_dir.glob("HCMC_TVHN_*.pdf"))
    if not pdf_files:
        print(f"No TH2I PDFs found in {th2i_dir}")
        return {}
    
    print(f"Found {len(pdf_files)} TH2I PDF(s)")
    
    all_observation = []
    all_tide_measured = []
    all_tide_forecast = {}
    
    for i, pdf_path in enumerate(pdf_files, 1):
        print(f"  [{i}/{len(pdf_files)}] Processing: {pdf_path.name}")
        result = extract_th2i_from_pdf(pdf_path)
        
        if result:
            all_observation.extend(result.get("observation", []))
            all_tide_measured.extend(result.get("tide_measured", []))
            # Merge tide_forecast dicts
            for station, forecasts in result.get("tide_forecast", {}).items():
                if station not in all_tide_forecast:
                    all_tide_forecast[station] = []
                all_tide_forecast[station].extend(forecasts)
    
    print(f"\n✅ TH2I Extraction Summary:")
    print(f"   Observation records: {len(all_observation)}")
    print(f"   Tide measured records: {len(all_tide_measured)}")
    print(f"   Tide forecast stations: {len(all_tide_forecast)}")
    
    return {
        "observation": all_observation,
        "tide_measured": all_tide_measured,
        "tide_forecast": all_tide_forecast,
    }

def extract_all_salinity_pdfs(salinity_dir: Path) -> List[Dict]:
    """Extract data from all Salinity PDFs."""
    print(f"\n{'='*80}")
    print(f"EXTRACTING SALINITY DATA")
    print(f"{'='*80}")
    
    pdf_files = sorted(salinity_dir.glob("*.pdf"))
    if not pdf_files:
        print(f"No Salinity PDFs found in {salinity_dir}")
        return []
    
    print(f"Found {len(pdf_files)} Salinity PDF(s)")
    
    all_stations_data = []
    for i, pdf_path in enumerate(pdf_files, 1):
        print(f"  [{i}/{len(pdf_files)}] Processing: {pdf_path.name}")
        stations_data = extract_salinity_from_pdf(pdf_path)
        all_stations_data.extend(stations_data)
    
    print(f"\n✅ Salinity Extraction Summary:")
    print(f"   Total records extracted: {len(all_stations_data)}")
    
    return all_stations_data

# ===================== MAIN =====================
def main():
    """Main function to crawl both TH2I and Salinity PDFs."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Crawl TH2I and Salinity PDFs for training data')
    parser.add_argument('--th2i-max', type=int, default=134,
                       help='Maximum number of TH2I PDFs to download (default: 134)')
    parser.add_argument('--salinity-max', type=int, default=134,
                       help='Maximum number of Salinity PDFs to download (default: 134)')
    parser.add_argument('--th2i-days-back', type=int, default=180,
                       help='Days back to search for TH2I PDFs (default: 180)')
    parser.add_argument('--salinity-articles', type=int, default=200,
                       help='Maximum articles to check for Salinity PDFs (default: 200)')
    parser.add_argument('--output-dir', type=str, default='Crawl_data',
                       help='Output directory for PDFs (default: Crawl_data)')
    parser.add_argument('--th2i-only', action='store_true',
                       help='Only crawl TH2I PDFs')
    parser.add_argument('--salinity-only', action='store_true',
                       help='Only crawl Salinity PDFs')
    
    args = parser.parse_args()
    
    output_dir = Path(args.output_dir)
    output_dir.mkdir(exist_ok=True)
    
    print("=" * 80)
    print("CRAWL TRAINING PDFs")
    print("=" * 80)
    print(f"Output directory: {output_dir}")
    print()
    
    th2i_files = []
    salinity_files = []
    
    # Crawl TH2I PDFs
    if not args.salinity_only:
        th2i_files = fetch_multiple_th2i_pdfs(
            output_dir,
            max_pdfs=args.th2i_max,
            days_back=args.th2i_days_back
        )
    
    # Crawl Salinity PDFs
    if not args.th2i_only:
        salinity_files = fetch_multiple_salinity_pdfs(
            output_dir,
            max_pdfs=args.salinity_max,
            max_articles=args.salinity_articles
        )
    
    # Summary
    print()
    print("=" * 80)
    print("CRAWL SUMMARY")
    print("=" * 80)
    print(f"TH2I PDFs:     {len(th2i_files)} files")
    print(f"Salinity PDFs: {len(salinity_files)} files")
    print(f"Total:         {len(th2i_files) + len(salinity_files)} files")
    print()
    print(f"Files saved to:")
    print(f"  - TH2I:     {output_dir / 'th2i'}")
    print(f"  - Salinity: {output_dir / 'salinity'}")
    print()
    
    if len(th2i_files) + len(salinity_files) > 0:
        print("✅ Crawl completed successfully!")
        
        # Auto-extract data from crawled PDFs
        dataset_dir = Path("dataset")
        dataset_dir.mkdir(exist_ok=True)
        
        th2i_dir = output_dir / "th2i"
        salinity_dir = output_dir / "salinity"
        
        # Extract TH2I data
        th2i_data = {}
        if th2i_dir.exists() and list(th2i_dir.glob("*.pdf")):
            th2i_data = extract_all_th2i_pdfs(th2i_dir)
            
            # Save TH2I data to dataset folder
            if th2i_data:
                if th2i_data.get("observation"):
                    json_path = dataset_dir / "th2i_observation.json"
                    with open(json_path, "w", encoding="utf-8") as f:
                        json.dump({"records": th2i_data["observation"]}, f, ensure_ascii=False, indent=2)
                    print(f"   Saved observation data to {json_path}")
                    
                    if PANDAS_AVAILABLE:
                        csv_path = dataset_dir / "th2i_observation.csv"
                        df = pd.DataFrame(th2i_data["observation"])
                        df.to_csv(csv_path, index=False, encoding="utf-8-sig")
                        print(f"   Saved observation CSV to {csv_path}")
                
                if th2i_data.get("tide_measured"):
                    json_path = dataset_dir / "th2i_tide_measured.json"
                    with open(json_path, "w", encoding="utf-8") as f:
                        json.dump({"records": th2i_data["tide_measured"]}, f, ensure_ascii=False, indent=2)
                    print(f"   Saved tide measured data to {json_path}")
                    
                    if PANDAS_AVAILABLE:
                        csv_path = dataset_dir / "th2i_tide_measured.csv"
                        df = pd.DataFrame(th2i_data["tide_measured"])
                        df.to_csv(csv_path, index=False, encoding="utf-8-sig")
                        print(f"   Saved tide measured CSV to {csv_path}")
                
                if th2i_data.get("tide_forecast"):
                    json_path = dataset_dir / "th2i_tide_forecast.json"
                    with open(json_path, "w", encoding="utf-8") as f:
                        json.dump({
                            "stations": th2i_data["tide_forecast"],
                            "metadata": {"note": "Forecast parsed from PDF text"}
                        }, f, ensure_ascii=False, indent=2)
                    print(f"   Saved tide forecast data to {json_path}")
        
        # Extract Salinity data
        salinity_data = []
        if salinity_dir.exists() and list(salinity_dir.glob("*.pdf")):
            salinity_data = extract_all_salinity_pdfs(salinity_dir)
            
            # Clean salinity data
            if salinity_data and EXTRACT_SALINITY_MODULE:
                print(f"\nCleaning salinity data...")
                cleaned_salinity_data = EXTRACT_SALINITY_MODULE.clean_missing_data(salinity_data, max_missing=5)
                
                if cleaned_salinity_data:
                    # Save to dataset folder
                    # Save JSON
                    json_path = dataset_dir / "station_data_extracted.json"
                    with open(json_path, "w", encoding="utf-8") as f:
                        json.dump(cleaned_salinity_data, f, ensure_ascii=False, indent=2)
                    print(f"   Saved to {json_path}")
                    
                    # Save CSV
                    if PANDAS_AVAILABLE:
                        csv_path = dataset_dir / "station_data_extracted.csv"
                        df = pd.DataFrame(cleaned_salinity_data)
                        df.to_csv(csv_path, index=False, encoding="utf-8-sig")
                        print(f"   Saved to {csv_path}")
                    
                    salinity_data = cleaned_salinity_data
        
        # Final summary
        print()
        print("=" * 80)
        print("EXTRACTION SUMMARY")
        print("=" * 80)
        print(f"TH2I Observation:     {len(th2i_data.get('observation', []))} records")
        print(f"TH2I Tide Measured:    {len(th2i_data.get('tide_measured', []))} records")
        print(f"TH2I Tide Forecast:    {len(th2i_data.get('tide_forecast', {}))} stations")
        print(f"Salinity Stations:    {len(salinity_data)} records")
        print()
        print("✅ Data extraction completed!")
        print()
        print("Next steps:")
        print("  1. Run derive_features_from_existing_data.py to create training dataset")
        print("  2. Train model with the generated dataset")
    else:
        print("⚠️  No PDFs were downloaded. Check your internet connection and URLs.")

if __name__ == "__main__":
    main()
