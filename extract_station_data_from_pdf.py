"""
Extract water quality station data from PDF reports.
Extracts: Station name, Temperature, Water Level, EC, Salinity, DO
Supports both text-based and image-based (scanned) PDFs using OCR
"""

import re
import json
import csv
import urllib.parse
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional, Tuple
import pdfplumber
import pandas as pd

# OCR imports (optional - only if needed)
try:
    from pdf2image import convert_from_path
    import pytesseract
    from PIL import Image
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False
    print("WARNING: OCR libraries not installed. Install with: pip install pdf2image pytesseract pillow")
    print("   Also install Tesseract OCR: brew install tesseract (macOS) or apt-get install tesseract-ocr (Linux)")

# Networking imports (optional for auto-downloading PDFs)
try:
    import requests
    from bs4 import BeautifulSoup
    HTTP_AVAILABLE = True
except ImportError:
    HTTP_AVAILABLE = False
    print("WARNING: requests/bs4 not installed. Install with: pip install requests beautifulsoup4")


def extract_text_with_ocr(pdf_path: Path) -> str:
    """Extract text from image-based PDF using OCR."""
    if not OCR_AVAILABLE:
        return ""
    
    text = ""
    try:
        print(f"    Using OCR to extract text from {pdf_path.name}...")
        
        # Check if Tesseract is available
        try:
            pytesseract.get_tesseract_version()
        except Exception:
            print(f"    WARNING: Tesseract OCR not found!")
            print(f"    Install Tesseract:")
            print(f"       macOS: brew install tesseract tesseract-lang")
            print(f"       Linux: sudo apt-get install tesseract-ocr tesseract-ocr-vie")
            print(f"       Windows: Download from https://github.com/UB-Mannheim/tesseract/wiki")
            return ""
        
        # Convert PDF pages to images
        try:
            images = convert_from_path(str(pdf_path), dpi=300)
            print(f"    Converted {len(images)} pages to images")
        except Exception as e:
            if "poppler" in str(e).lower() or "pdfinfo" in str(e).lower():
                print(f"    WARNING: Poppler not installed!")
                print(f"    Install Poppler:")
                print(f"       macOS: brew install poppler")
                print(f"       Linux: sudo apt-get install poppler-utils")
                print(f"       Windows: Download from https://github.com/oschwartz10612/poppler-windows/releases")
            else:
                print(f"    Error converting PDF to images: {e}")
            return ""
        
        # OCR each page
        for i, image in enumerate(images):
            print(f"    OCRing page {i+1}/{len(images)}...", end='\r')
            try:
                # Try Vietnamese + English
                page_text = pytesseract.image_to_string(image, lang='vie+eng')
                if not page_text or len(page_text.strip()) < 10:
                    # Fallback to English only
                    page_text = pytesseract.image_to_string(image, lang='eng')
                if page_text:
                    text += page_text + "\n"
            except Exception as e:
                if "Error opening data file" in str(e):
                    print(f"\n    WARNING: Vietnamese language pack not found, using English only")
                    page_text = pytesseract.image_to_string(image, lang='eng')
                    if page_text:
                        text += page_text + "\n"
                else:
                    print(f"\n    Error OCRing page {i+1}: {e}")
        print(f"    OK: OCR completed for {len(images)} pages")
    except Exception as e:
        print(f"    Error during OCR: {e}")
    return text


def extract_text_from_pdf(pdf_path: Path) -> Tuple[str, list]:
    """Extract all text and tables from PDF file."""
    text = ""
    all_tables = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
                
                # Try to extract tables
                tables = page.extract_tables()
                if tables:
                    all_tables.extend(tables)
    except Exception as e:
        print(f"Error reading {pdf_path}: {e}")
    return text, all_tables


def parse_station_name(text: str) -> List[str]:
    """Extract station names from text."""
    # Patterns for station names
    patterns = [
        r'Trạm\s+QT\s+Nước\s+mặt\s+([^\n\d]+)',
        r'Trạm\s+([^\n\d]+?)\s+\d{1,2}/\d{1,2}/\d{4}',
        r'([A-Z][^\n\d]{5,30}?)\s+\d{1,2}/\d{1,2}/\d{4}',
        r'Trạm\s+([A-Z][a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ\s]+)',
    ]
    
    stations = []
    for pattern in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE | re.MULTILINE)
        stations.extend([m.strip() for m in matches if len(m.strip()) > 3])
    
    # Remove duplicates while preserving order
    seen = set()
    unique_stations = []
    for station in stations:
        if station not in seen and len(station) > 3:
            seen.add(station)
            unique_stations.append(station)
    
    return unique_stations


def parse_parameter_value(text: str, param_name: str, unit: str = None) -> Optional[float]:
    """Extract parameter value from text."""
    # Clean parameter name for regex
    param_clean = re.escape(param_name)
    
    # Patterns for different parameters
    patterns = []
    
    if unit:
        # Pattern: "Parameter: value unit" or "Parameter value unit"
        patterns.extend([
            rf'{param_clean}[:\s]+([\d,]+\.?\d*)\s*{re.escape(unit)}',
            rf'{param_clean}[:\s]+([\d,]+\.?\d*)\s*{re.escape(unit)}',
            # Pattern with Vietnamese spacing
            rf'{param_clean}\s*([\d,]+\.?\d*)\s*{re.escape(unit)}',
        ])
    
    # Pattern without unit
    patterns.extend([
        rf'{param_clean}[:\s]+([\d,]+\.?\d*)',
        # Pattern: "value unit Parameter"
        rf'([\d,]+\.?\d*)\s*{re.escape(unit) if unit else ""}[^\n]*{param_clean}',
    ])
    
    for pattern in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE | re.UNICODE)
        if matches:
            # Get the first match and clean it
            value_str = matches[0].replace(',', '').replace(' ', '')
            try:
                value = float(value_str)
                # Basic validation: reasonable ranges
                if param_name in ['Nhiệt độ', 'Temperature'] and (value < -10 or value > 50):
                    continue
                if param_name in ['DO', 'Oxy hòa tan'] and (value < 0 or value > 20):
                    continue
                return value
            except ValueError:
                continue
    
    return None


def extract_station_data(text: str, station_name: str) -> Dict:
    """Extract all parameters for a specific station."""
    # Find the section for this station - try multiple patterns
    patterns = [
        # Pattern 1: Station name followed by data
        rf'{re.escape(station_name)}[^\n]*\n(.*?)(?=\n\s*(?:Trạm|Station|\d+\.|$))',
        # Pattern 2: Station name with date
        rf'{re.escape(station_name)}[^\n]*\d{{1,2}}/\d{{1,2}}/\d{{4}}[^\n]*\n(.*?)(?=\n\s*(?:Trạm|Station|\d+\.|$))',
        # Pattern 3: Numbered station
        rf'\d+\.\s*{re.escape(station_name)}[^\n]*\n(.*?)(?=\n\s*(?:\d+\.|Trạm|Station|$))',
    ]
    
    station_context = None
    for pattern in patterns:
        station_match = re.search(pattern, text, re.IGNORECASE | re.DOTALL | re.UNICODE)
        if station_match:
            station_context = station_match.group(0)
            break
    
    if not station_context:
        # Try to find station name in context - use larger context window
        station_idx = text.find(station_name)
        if station_idx != -1:
            # Get 2000 characters around the station name
            start = max(0, station_idx - 500)
            end = min(len(text), station_idx + 2000)
            station_context = text[start:end]
        else:
            station_context = text
    
    # Extract parameters
    data = {
        'station_name': station_name,
        'temperature': None,
        'water_level': None,
        'ec': None,
        'salinity': None,
        'do': None,
    }
    
    # Temperature (Nhiệt độ) - try multiple patterns
    temp = None
    for pattern in ['Nhiệt độ', 'Temperature', 'Nhiệt', 'Temp']:
        temp = parse_parameter_value(station_context, pattern, '°C')
        if temp is not None:
            break
    data['temperature'] = temp
    
    # Water Level (Mực nước) - try multiple patterns
    wl = None
    for pattern in ['Mực nước G3', 'Mực nước', 'Water Level', 'Mực nước', 'Mực nước']:
        wl = parse_parameter_value(station_context, pattern, 'm')
        if wl is not None:
            break
    data['water_level'] = wl
    
    # EC (Electrical Conductivity) - try multiple patterns and units
    ec = None
    for pattern in ['EC', 'Độ dẫn điện', 'Electrical Conductivity']:
        for unit in ['uS/cm', 'μS/cm', 'µS/cm', 'mS/cm']:
            ec = parse_parameter_value(station_context, pattern, unit)
            if ec is not None:
                break
        if ec is not None:
            break
    data['ec'] = ec
    
    # Salinity (Độ mặn) - try multiple patterns and units
    sal = None
    for pattern in ['Độ Mặn', 'Độ mặn', 'Salinity', 'Độ mặn']:
        for unit in ['psu', 'ppt', 'g/L', '‰']:
            sal = parse_parameter_value(station_context, pattern, unit)
            if sal is not None:
                break
        if sal is not None:
            break
    data['salinity'] = sal
    
    # DO (Dissolved Oxygen) - try multiple patterns
    do = None
    for pattern in ['DO', 'Oxy hòa tan', 'Dissolved Oxygen', 'Oxy']:
        do = parse_parameter_value(station_context, pattern, 'mg/L')
        if do is not None:
            break
    data['do'] = do
    
    return data


def extract_date_from_text(text: str) -> Optional[str]:
    """Extract date from PDF text."""
    # Patterns for dates
    patterns = [
        r'(\d{1,2}/\d{1,2}/\d{4})',
        r'(\d{4}-\d{2}-\d{2})',
        r'Ngày\s+(\d{1,2}/\d{1,2}/\d{4})',
    ]
    
    for pattern in patterns:
        matches = re.findall(pattern, text)
        if matches:
            return matches[0]
    return None


def extract_stations_from_tables(tables: list) -> List[Dict]:
    """Extract station data from PDF tables."""
    stations_data = []
    
    for table in tables:
        if not table or len(table) < 2:
            continue
        
        # Look for header row
        header_row = None
        for i, row in enumerate(table[:5]):
            if row and any(keyword in str(row).lower() for keyword in ['trạm', 'station', 'nhiệt độ', 'temperature', 'mực nước', 'độ mặn', 'salinity']):
                header_row = i
                break
        
        if header_row is None:
            continue
        
        # Find column indices
        headers = table[header_row]
        header_text_joined = " ".join(str(h).lower() for h in headers if h)

        # --- Special handling for salinity forecast tables (Độ mặn dự báo) ---
        # These tables typically have columns:
        # Trạm | Sông | K/c đến cửa sông (km) | Smax thực đo từ xx/xx-yy/yy (‰) | Độ mặn dự báo Smax (‰) | ngày XH
        if (
            'độ mặn dự báo' in header_text_joined
            or 'smax thực đo' in header_text_joined
            or 'k/c đến cửa sông' in header_text_joined
        ):
            forecast_indices: Dict[str, int] = {}
            observed_period: Optional[str] = None

            for idx, header in enumerate(headers):
                if not header:
                    continue
                header_str = str(header).strip()
                header_lower = header_str.lower()

                if any(k in header_lower for k in ['trạm', 'station', 'tên trạm']):
                    forecast_indices['station'] = idx
                # River column is typically just "Sông" (avoid matching "cửa sông")
                elif ('sông' in header_lower) and ('cửa sông' not in header_lower):
                    forecast_indices['river'] = idx
                # Distance column should reference the river mouth explicitly (avoid matching any random "km")
                elif (
                    'cửa sông' in header_lower
                    or 'đến cửa sông' in header_lower
                    or ('k/c' in header_lower and 'sông' in header_lower)
                    or ('khoảng cách' in header_lower and 'sông' in header_lower)
                    or '(km' in header_lower
                ):
                    forecast_indices['distance'] = idx
                elif 'smax' in header_lower and 'thực đo' in header_lower:
                    forecast_indices['smax_observed'] = idx
                    observed_period = header_str
                elif ('độ mặn' in header_lower and 'dự báo' in header_lower) or (
                    'smax' in header_lower and 'dự báo' in header_lower
                ):
                    forecast_indices['smax_forecast'] = idx
                elif 'ngày' in header_lower and ('xh' in header_lower or 'xuất hiện' in header_lower):
                    forecast_indices['forecast_date'] = idx

            # If we have at least station and a salinity forecast column, treat this as forecast table
            if 'station' in forecast_indices and 'smax_forecast' in forecast_indices:
                for row in table[header_row + 1 :]:
                    if not row or len(row) < 2:
                        continue

                    station_cell = row[forecast_indices['station']] if forecast_indices['station'] < len(row) else None
                    station_name = str(station_cell).strip() if station_cell is not None else ""
                    if not station_name or station_name in ['None', 'nan']:
                        continue

                    def _to_float(val: Optional[str]) -> Optional[float]:
                        if val is None:
                            return None
                        s = str(val).strip()
                        if not s or s in ['None', 'nan']:
                            return None
                        try:
                            # Remove any non-numeric characters except .,- and ,
                            numeric = re.sub(r'[^\d,.\-]', '', s)
                            numeric = numeric.replace(',', '')
                            return float(numeric) if numeric else None
                        except ValueError:
                            return None
                    
                    def _looks_like_text(val: Optional[str]) -> bool:
                        if val is None:
                            return False
                        s = str(val).strip()
                        if not s or s in ['None', 'nan']:
                            return False
                        # If it contains letters (including Vietnamese chars), treat as text-ish
                        return bool(re.search(r'[A-Za-zÀ-ỹđĐ]', s))

                    record = {
                        'station_name': station_name,
                        'river_name': None,
                        'distance_km': None,
                        'smax_observed': None,
                        'observed_period': observed_period,
                        'smax_forecast': None,
                        'forecast_date': None,
                        # Keep existing keys so CSV has consistent columns
                        'temperature': None,
                        'water_level': None,
                        'ec': None,
                        'salinity': None,
                        'do': None,
                    }

                    # River name
                    river_raw = None
                    if 'river' in forecast_indices and forecast_indices['river'] < len(row):
                        river_raw = row[forecast_indices['river']]
                        river = str(river_raw).strip()
                        if river and river not in ['None', 'nan']:
                            record['river_name'] = river

                    # Distance to river mouth (km)
                    distance_raw = None
                    if 'distance' in forecast_indices and forecast_indices['distance'] < len(row):
                        distance_raw = row[forecast_indices['distance']]
                        record['distance_km'] = _to_float(distance_raw)

                    # Row-level sanity check: if river looks numeric and distance looks like text, swap
                    # (pdfplumber sometimes shifts these two columns)
                    river_as_float = _to_float(river_raw) if river_raw is not None else None
                    if (
                        river_as_float is not None
                        and record['distance_km'] is None
                        and _looks_like_text(distance_raw)
                    ):
                        record['distance_km'] = river_as_float
                        record['river_name'] = str(distance_raw).strip()

                    # Robust fallback: some PDFs produce shifted columns / broken headers.
                    # If river is still numeric (e.g. "7") and distance is missing, infer from row values.
                    if (record['river_name'] is None or _to_float(record['river_name']) is not None) or record['distance_km'] is None:
                        row_cells = [c for c in row if c is not None and str(c).strip() not in ['', 'None', 'nan']]

                        # Infer forecast_date if missing (typically last column like "31/01")
                        if not record.get('forecast_date'):
                            for c in reversed(row_cells):
                                s = str(c).strip()
                                if re.fullmatch(r'\d{1,2}/\d{1,2}', s):
                                    record['forecast_date'] = s
                                    break

                        # Infer river_name: first text-ish cell that isn't the station name
                        if record.get('river_name') is None or _to_float(record.get('river_name')) is not None:
                            for c in row_cells:
                                s = str(c).strip()
                                if s != record['station_name'] and _looks_like_text(s):
                                    record['river_name'] = s
                                    break

                        # Infer distance_km: choose an integer-ish km value (0..200) not equal to smax values
                        if record.get('distance_km') is None:
                            smax_vals = set()
                            if record.get('smax_observed') is not None:
                                smax_vals.add(float(record['smax_observed']))
                            if record.get('smax_forecast') is not None:
                                smax_vals.add(float(record['smax_forecast']))

                            best = None
                            for c in row_cells:
                                f = _to_float(c)
                                if f is None:
                                    continue
                                if f < 0 or f > 200:
                                    continue
                                # prefer integer-ish values for distance
                                if abs(f - round(f)) > 1e-6:
                                    continue
                                # avoid accidentally selecting Smax values
                                if any(abs(f - sv) < 1e-6 for sv in smax_vals):
                                    continue
                                best = f
                                break
                            record['distance_km'] = best

                    # Historical observed Smax
                    if 'smax_observed' in forecast_indices and forecast_indices['smax_observed'] < len(row):
                        record['smax_observed'] = _to_float(row[forecast_indices['smax_observed']])

                    # Forecast Smax
                    if 'smax_forecast' in forecast_indices and forecast_indices['smax_forecast'] < len(row):
                        record['smax_forecast'] = _to_float(row[forecast_indices['smax_forecast']])

                    # Forecast date (ngày XH)
                    if 'forecast_date' in forecast_indices and forecast_indices['forecast_date'] < len(row):
                        date_raw = str(row[forecast_indices['forecast_date']]).strip()
                        if date_raw and date_raw not in ['None', 'nan']:
                            record['forecast_date'] = date_raw

                    stations_data.append(record)

                # This table has been handled as a forecast table, move to next table
                continue

        # --- Default handling for regular water-quality station tables ---
        col_indices: Dict[str, int] = {}
        for idx, header in enumerate(headers):
            if not header:
                continue
            header_str = str(header).lower()
            if 'trạm' in header_str or 'station' in header_str or 'tên' in header_str:
                col_indices['station'] = idx
            elif 'nhiệt độ' in header_str or 'temperature' in header_str or 'temp' in header_str:
                col_indices['temperature'] = idx
            elif 'mực nước' in header_str or 'water level' in header_str or 'g3' in header_str:
                col_indices['water_level'] = idx
            elif 'ec' in header_str or 'độ dẫn' in header_str or 'conductivity' in header_str:
                col_indices['ec'] = idx
            elif 'độ mặn' in header_str or 'salinity' in header_str:
                col_indices['salinity'] = idx
            elif 'do' in header_str or 'oxy' in header_str or 'oxygen' in header_str:
                col_indices['do'] = idx
        
        # Extract data rows
        for row in table[header_row + 1:]:
            if not row or len(row) < 2:
                continue
            
            station_data = {
                'station_name': None,
                # Forecast-related fields (will remain None for regular tables)
                'river_name': None,
                'distance_km': None,
                'smax_observed': None,
                'observed_period': None,
                'smax_forecast': None,
                'forecast_date': None,
                'temperature': None,
                'water_level': None,
                'ec': None,
                'salinity': None,
                'do': None,
            }
            
            # Extract station name
            if 'station' in col_indices and col_indices['station'] < len(row):
                station_name = str(row[col_indices['station']]).strip()
                if station_name and len(station_name) > 3:
                    station_data['station_name'] = station_name
            
            # Extract parameters
            for param, col_idx in col_indices.items():
                if param == 'station' or col_idx >= len(row):
                    continue
                
                value_str = str(row[col_idx]).strip()
                if value_str and value_str not in ['', 'None', 'nan']:
                    try:
                        # Remove units and clean
                        value_clean = re.sub(r'[^\d,.-]', '', value_str.replace(',', ''))
                        if value_clean:
                            value = float(value_clean)
                            station_data[param] = value
                    except (ValueError, AttributeError):
                        pass
            
            if station_data['station_name']:
                stations_data.append(station_data)
    
    return stations_data


def _extract_pdf_url_from_viewer(href: str) -> Optional[str]:
    """Extract the real PDF URL from Google viewer links."""
    m = re.search(r"url=([^&]+\\.pdf)", href, flags=re.IGNORECASE)
    if m:
        return urllib.parse.unquote(m.group(1))
    return None


def _extract_article_id(url: str) -> int:
    """Extract numeric article id from url if present, else -1."""
    m = re.search(r'/article/(\\d+)', url)
    if not m:
        m = re.search(r'attachments/[^/]+/(\\d+)', url)
    try:
        return int(m.group(1)) if m else -1
    except Exception:
        return -1


def fetch_tphcm_salinity_pdfs(download_dir: Path, max_articles: int = 10) -> List[Path]:
    """
    Crawl the HCM salinity forecast category, find PDF links, and download them.
    Returns a list of downloaded file paths.
    """
    if not HTTP_AVAILABLE:
        print("WARNING: Skipping PDF fetch (requests/bs4 not installed)")
        return []

    base = "http://www.kttv-nb.org.vn"
    category_url = f"{base}/index.php/thong-tin-kttv/thuy-van"
    download_dir.mkdir(parents=True, exist_ok=True)

    print(f"\nFetching PDFs from: {category_url}")
    
    session = requests.Session()
    # Add user agent to avoid blocking
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    })
    downloaded_files: List[Path] = []

    try:
        print(f"Connecting to {category_url}...")
        resp = session.get(category_url, timeout=45)  # slow legacy PHP site
        resp.raise_for_status()
        print(f"OK: Got response: {len(resp.text)} characters, status: {resp.status_code}")
    except Exception as e:
        print(f"ERROR: Cannot fetch category page: {e}")
        print(f"   Check your internet connection and try again.")
        return []

    try:
        soup = BeautifulSoup(resp.text, "lxml")
    except:
        soup = BeautifulSoup(resp.text, "html.parser")
    
    print(f"Parsed HTML, looking for links...")

    # Find ALL links first for debugging
    all_links = soup.find_all("a", href=True)
    print(f"   Found {len(all_links)} total <a> tags")
    
    # 1) Direct PDF links on category page (fallback if article detection fails)
    direct_pdf_urls: List[str] = []
    for a in all_links:
        href = a.get("href", "")
        if ".pdf" in href.lower() and "attachments/article" in href:
            pdf_url = urllib.parse.urljoin(base, href)
            direct_pdf_urls.append(pdf_url)
            print(f"   Direct PDF: {pdf_url}")
    # Keep only the latest direct PDF (by article id)
    if direct_pdf_urls:
        direct_pdf_urls = sorted(direct_pdf_urls, key=_extract_article_id, reverse=True)[:1]

    # 2) Find article links that mention xâm nhập mặn + HCM
    article_links: List[str] = []
    for a in all_links:
        text = (a.get_text() or "").lower()
        href = a.get("href", "")
        
        # Check if link text matches
        if "xâm nhập mặn" in text and any(k in text for k in ["tphcm", "tp.hcm", "hồ chí minh", "ho chi minh", "thành phố"]):
            url = urllib.parse.urljoin(base, href)
            article_links.append(url)
            print(f"   Article link (text match): {text[:60]}... -> {url}")
        
        # Fallback: links in the same category path that look like article pages
        elif "thong-tin-kttv" in href and "thuy-van" in href and "article" in href:
            url = urllib.parse.urljoin(base, href)
            if url not in article_links:
                article_links.append(url)
                print(f"   Article link (href pattern): {url}")

    # De-duplicate while preserving order, then sort by article id desc (latest first)
    seen = set()
    unique_articles = []
    for url in article_links:
        if url not in seen:
            seen.add(url)
            unique_articles.append(url)
    article_links = sorted(unique_articles, key=_extract_article_id, reverse=True)[:max_articles]

    print(f"\nSummary:")
    print(f"   Direct PDFs found: {len(direct_pdf_urls)}")
    print(f"   Article links found: {len(article_links)}")
    
    if not article_links and not direct_pdf_urls:
        print("WARNING: No matching articles or PDF links found on category page.")
        print("   Trying fallback: looking for any article links...")
        # Fallback: find any article links
        for a in all_links[:100]:  # Check first 100 links
            href = a.get("href", "")
            if "/article/" in href:
                url = urllib.parse.urljoin(base, href)
                if url not in article_links:
                    article_links.append(url)
                    print(f"   Found article (fallback): {url}")
        if not article_links and not direct_pdf_urls:
            print("ERROR: Still no links found. The page structure may have changed.")
            return []

    def _download_pdf(pdf_url: str) -> Optional[Path]:
        try:
            fname = Path(urllib.parse.urlparse(pdf_url).path).name or "download.pdf"
            dest = download_dir / fname
            if dest.exists():
                return dest
            r = session.get(pdf_url, stream=True, timeout=60)  # allow slow download
            r.raise_for_status()
            with open(dest, "wb") as f:
                for chunk in r.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
            return dest
        except Exception as e:
            print(f"WARNING: Failed to download {pdf_url}: {e}")
            return None

    # Download any direct PDFs from category page
    for pdf_url in direct_pdf_urls:
        dest = _download_pdf(pdf_url)
        if dest:
            downloaded_files.append(dest)

    # Then visit articles and look for more PDFs
    for article_url in article_links:
        try:
            ar = session.get(article_url, timeout=45)  # slow legacy PHP site
            ar.raise_for_status()
            asoup = BeautifulSoup(ar.text, "lxml") if 'lxml' in BeautifulSoup.__module__ else BeautifulSoup(ar.text, "html.parser")

            pdf_urls: List[str] = []
            for aa in asoup.find_all("a", href=True):
                href = aa["href"]
                if ".pdf" in href and "attachments/article" in href:
                    pdf_urls.append(urllib.parse.urljoin(base, href))
                elif "viewer" in href or "gview" in href:
                    real = _extract_pdf_url_from_viewer(href)
                    if real:
                        pdf_urls.append(real)

            # De-duplicate
            uniq_pdf = []
            seen_pdf = set()
            for u in pdf_urls:
                if u not in seen_pdf:
                    seen_pdf.add(u)
                    uniq_pdf.append(u)

            if uniq_pdf:
                print(f"  OK: {article_url} -> {len(uniq_pdf)} PDF link(s) found.")
            else:
                print(f"  WARNING: {article_url} -> No PDF links found.")

            for pdf_url in uniq_pdf:
                print(f"    Downloading: {pdf_url}")
                dest = _download_pdf(pdf_url)
                if dest:
                    downloaded_files.append(dest)
                    print(f"    OK: Saved: {dest.name}")
                else:
                    print(f"    ERROR: Failed to download")
        except Exception as e:
            print(f"WARNING: Skip article {article_url}: {e}")
            continue

    if downloaded_files:
        print(f"\nOK: Successfully downloaded {len(downloaded_files)} PDF file(s)")
    else:
        print(f"\nWARNING: No PDFs were downloaded")
    
    return downloaded_files


def extract_all_stations_from_pdf(pdf_path: Path) -> List[Dict]:
    """Extract all station data from a PDF file."""
    print(f"\nProcessing: {pdf_path.name}")
    text, tables = extract_text_from_pdf(pdf_path)
    
    all_data = []
    
    # If no text extracted, try OCR for image-based PDFs
    if not text and OCR_AVAILABLE:
        print(f"  WARNING: No text extracted, attempting OCR...")
        ocr_text = extract_text_with_ocr(pdf_path)
        if ocr_text:
            text = ocr_text
            print(f"  OK: OCR extracted {len(text)} characters")
        else:
            print(f"  WARNING: OCR failed or no text found")
    
    # Try extracting from tables first
    if tables:
        print(f"  Found {len(tables)} table(s), extracting from tables...")
        table_data = extract_stations_from_tables(tables)
        if table_data:
            print(f"  Extracted {len(table_data)} stations from tables")
            for data in table_data:
                data['source_file'] = pdf_path.name
                data['extraction_method'] = 'table'
                data['extraction_timestamp'] = datetime.now().isoformat()
            all_data.extend(table_data)
    
    # Also try text extraction
    if not text and not all_data:
        print(f"  WARNING: No text extracted from {pdf_path.name}")
        if not OCR_AVAILABLE:
            print(f"  Tip: Install OCR libraries to process image-based PDFs")
        return all_data
    
    # Extract from text if we have text
    if text:
        # Extract date
        date = extract_date_from_text(text)
        
        # Extract station names
        station_names = parse_station_name(text)
        
        if not station_names:
            print(f"  WARNING: No stations found in text")
            # Try alternative approach - look for numbered stations
            numbered_stations = re.findall(r'(\d+)\.\s*([^\n]{10,50})', text)
            if numbered_stations:
                station_names = [name.strip() for _, name in numbered_stations]
        
        if station_names:
            print(f"  Found {len(station_names)} stations in text")
            
            # Extract data for each station
            for station_name in station_names:
                station_data = extract_station_data(text, station_name)
                station_data['source_file'] = pdf_path.name
                station_data['extracted_date'] = date
                station_data['extraction_method'] = 'text'
                station_data['extraction_timestamp'] = datetime.now().isoformat()
                all_data.append(station_data)
                
                # Print summary
                params_found = sum(1 for v in station_data.values() if v is not None and isinstance(v, (int, float)) and v != station_data['station_name'])
                print(f"    - {station_name}: {params_found}/5 parameters found")
    
    return all_data


def clean_missing_data(data: List[Dict], required_fields: List[str] = None, max_missing: int = 5) -> List[Dict]:
    """
    Remove records that have too many missing required fields.
    
    Args:
        data: List of station data dictionaries
        required_fields: List of field names that are considered important (default: forecast fields)
        max_missing: Maximum number of missing fields allowed (default: 5)
    
    Returns:
        Filtered list with records that have <= max_missing missing fields
    """
    if required_fields is None:
        required_fields = [
            'station_name',
            'river_name',
            'distance_km',
            'smax_observed',
            'observed_period',
            'smax_forecast',
            'forecast_date'
        ]
    
    cleaned_data = []
    removed_count = 0
    
    for record in data:
        missing_count = 0
        
        for field in required_fields:
            value = record.get(field)
            # Consider None, empty string, or empty list as missing
            if value is None or value == '' or (isinstance(value, (list, dict)) and len(value) == 0):
                missing_count += 1
        
        if missing_count < max_missing:
            cleaned_data.append(record)
        else:
            removed_count += 1
            station_name = record.get('station_name', 'Unknown')
            print(f"  WARNING: Removed record: {station_name} (missing {missing_count}/{len(required_fields)} required fields)")
    
    if removed_count > 0:
        print(f"\nData cleaning:")
        print(f"   Removed {removed_count} record(s) with >= {max_missing} missing fields")
        print(f"   Kept {len(cleaned_data)} record(s)")
    
    return cleaned_data


def main():
    """Main function to extract data from all PDFs."""
    # Path to PDF directory
    pdf_dir = Path('ref/paper')
    output_dir = Path('extracted_data')
    output_dir.mkdir(exist_ok=True)
    
    if not pdf_dir.exists():
        print(f"Error: Directory {pdf_dir} not found!")
        return

    # Auto-fetch latest HCM salinity forecast PDFs (if networking deps are available)
    fetched = fetch_tphcm_salinity_pdfs(pdf_dir, max_articles=3)
    if fetched:
        print(f"OK: Downloaded {len(fetched)} PDF(s) into {pdf_dir}")
    else:
        print("INFO: No new PDFs downloaded (or networking deps missing).")
    
    # Find all PDF files
    pdf_files = list(pdf_dir.glob('*.pdf'))
    
    if not pdf_files:
        print(f"No PDF files found in {pdf_dir}")
        return
    
    print(f"Found {len(pdf_files)} PDF file(s)")
    
    # Extract data from all PDFs
    all_stations_data = []
    for pdf_path in pdf_files:
        stations_data = extract_all_stations_from_pdf(pdf_path)
        all_stations_data.extend(stations_data)
    
    if not all_stations_data:
        print("\nWARNING: No data extracted from any PDF!")
        return
    
    # Clean data: remove records with >= 5 missing required fields
    print(f"\nCleaning data (removing records with >= 5 missing required fields)...")
    cleaned_data = clean_missing_data(all_stations_data, max_missing=5)
    
    if not cleaned_data:
        print("\nWARNING: No data remaining after cleaning!")
        return
    
    # Save cleaned data to CSV
    csv_path = output_dir / 'station_data_extracted.csv'
    df = pd.DataFrame(cleaned_data)
    df.to_csv(csv_path, index=False, encoding='utf-8-sig')
    print(f"\nOK: Saved {len(df)} records to {csv_path}")
    
    # Save cleaned data to JSON
    json_path = output_dir / 'station_data_extracted.json'
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(cleaned_data, f, ensure_ascii=False, indent=2)
    print(f"OK: Saved to {json_path}")
    
    # Print summary
    print(f"\nSummary:")
    print(f"  Total stations extracted: {len(df)}")
    print(f"  Unique stations: {df['station_name'].nunique()}")
    print(f"  Parameters found:")
    for param in ['temperature', 'water_level', 'ec', 'salinity', 'do']:
        count = df[param].notna().sum()
        pct = (count / len(df)) * 100 if len(df) > 0 else 0
        print(f"    - {param}: {count}/{len(df)} ({pct:.1f}%)")
    
    # Print all extracted data to console (use cleaned_data)
    print(f"\nAll Extracted Data (after cleaning):")
    print("=" * 100)
    for idx, record in enumerate(cleaned_data, 1):
        print(f"\n[{idx}] Station: {record.get('station_name', 'N/A')}")
        print(f"    Source: {record.get('source_file', 'N/A')}")
        print(f"    Method: {record.get('extraction_method', 'text')}")
        if record.get('extracted_date'):
            print(f"    Date: {record.get('extracted_date')}")
        print(f"    Parameters:")
        for param in ['temperature', 'water_level', 'ec', 'salinity', 'do']:
            value = record.get(param)
            if value is not None:
                unit = {
                    'temperature': '°C',
                    'water_level': 'm',
                    'ec': 'uS/cm',
                    'salinity': 'psu/ppt',
                    'do': 'mg/L'
                }.get(param, '')
                print(f"      - {param}: {value} {unit}")
        print("-" * 100)
    
    # Show sample data in table format
    print(f"\nSample data (first 5 records in table format):")
    print(df.head(5).to_string())


if __name__ == '__main__':
    main()
