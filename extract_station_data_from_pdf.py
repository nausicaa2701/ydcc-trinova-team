"""
Extract water quality station data from PDF reports.
Extracts: Station name, Temperature, Water Level, EC, Salinity, DO
Supports both text-based and image-based (scanned) PDFs using OCR
"""

import re
import json
import csv
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
    print("⚠️  OCR libraries not installed. Install with: pip install pdf2image pytesseract pillow")
    print("   Also install Tesseract OCR: brew install tesseract (macOS) or apt-get install tesseract-ocr (Linux)")


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
            print(f"    ⚠️  Tesseract OCR not found!")
            print(f"    💡 Install Tesseract:")
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
                print(f"    ⚠️  Poppler not installed!")
                print(f"    💡 Install Poppler:")
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
                    print(f"\n    ⚠️  Vietnamese language pack not found, using English only")
                    page_text = pytesseract.image_to_string(image, lang='eng')
                    if page_text:
                        text += page_text + "\n"
                else:
                    print(f"\n    Error OCRing page {i+1}: {e}")
        print(f"    ✓ OCR completed for {len(images)} pages")
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
        col_indices = {}
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


def extract_all_stations_from_pdf(pdf_path: Path) -> List[Dict]:
    """Extract all station data from a PDF file."""
    print(f"\nProcessing: {pdf_path.name}")
    text, tables = extract_text_from_pdf(pdf_path)
    
    all_data = []
    
    # If no text extracted, try OCR for image-based PDFs
    if not text and OCR_AVAILABLE:
        print(f"  ⚠️  No text extracted, attempting OCR...")
        ocr_text = extract_text_with_ocr(pdf_path)
        if ocr_text:
            text = ocr_text
            print(f"  ✓ OCR extracted {len(text)} characters")
        else:
            print(f"  ⚠️  OCR failed or no text found")
    
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
        print(f"  ⚠️  No text extracted from {pdf_path.name}")
        if not OCR_AVAILABLE:
            print(f"  💡 Tip: Install OCR libraries to process image-based PDFs")
        return all_data
    
    # Extract from text if we have text
    if text:
        # Extract date
        date = extract_date_from_text(text)
        
        # Extract station names
        station_names = parse_station_name(text)
        
        if not station_names:
            print(f"  ⚠️  No stations found in text")
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


def main():
    """Main function to extract data from all PDFs."""
    # Path to PDF directory
    pdf_dir = Path('ref/paper')
    output_dir = Path('extracted_data')
    output_dir.mkdir(exist_ok=True)
    
    if not pdf_dir.exists():
        print(f"Error: Directory {pdf_dir} not found!")
        return
    
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
        print("\n⚠️  No data extracted from any PDF!")
        return
    
    # Save to CSV
    csv_path = output_dir / 'station_data_extracted.csv'
    df = pd.DataFrame(all_stations_data)
    df.to_csv(csv_path, index=False, encoding='utf-8-sig')
    print(f"\n✓ Saved {len(df)} records to {csv_path}")
    
    # Save to JSON
    json_path = output_dir / 'station_data_extracted.json'
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(all_stations_data, f, ensure_ascii=False, indent=2)
    print(f"✓ Saved to {json_path}")
    
    # Print summary
    print(f"\n📊 Summary:")
    print(f"  Total stations extracted: {len(df)}")
    print(f"  Unique stations: {df['station_name'].nunique()}")
    print(f"  Parameters found:")
    for param in ['temperature', 'water_level', 'ec', 'salinity', 'do']:
        count = df[param].notna().sum()
        pct = (count / len(df)) * 100 if len(df) > 0 else 0
        print(f"    - {param}: {count}/{len(df)} ({pct:.1f}%)")
    
    # Print all extracted data to console
    print(f"\n📋 All Extracted Data:")
    print("=" * 100)
    for idx, record in enumerate(all_stations_data, 1):
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
    print(f"\n📋 Sample data (first 5 records in table format):")
    print(df.head(5).to_string())


if __name__ == '__main__':
    main()
