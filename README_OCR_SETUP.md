# OCR Setup cho PDF Extraction

Script `extract_station_data_from_pdf.py` hỗ trợ OCR để extract text từ image-based PDFs (PDF scan).

## Cài đặt

### 1. Cài đặt Python packages:

```bash
pip3 install pdf2image pytesseract Pillow
```

Hoặc sử dụng requirements.txt:
```bash
pip install -r requirements.txt
```

### 2. Cài đặt Tesseract OCR:

**macOS:**
```bash
brew install tesseract
brew install tesseract-lang  # For Vietnamese language support
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install tesseract-ocr
sudo apt-get install tesseract-ocr-vie  # Vietnamese language pack
```

**Windows:**
- Download installer từ: https://github.com/UB-Mannheim/tesseract/wiki
- Install và thêm vào PATH
- Download Vietnamese language pack: https://github.com/tesseract-ocr/tessdata

### 3. Cấu hình Tesseract path (nếu cần):

Nếu Tesseract không được tìm thấy tự động, bạn có thể set path trong script:

```python
import pytesseract
pytesseract.pytesseract.tesseract_cmd = r'/usr/local/bin/tesseract'  # macOS
# hoặc
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'  # Windows
```

## Sử dụng

Script sẽ tự động detect image-based PDFs và sử dụng OCR nếu:
1. Không extract được text từ PDF
2. OCR libraries đã được cài đặt
3. Tesseract OCR đã được cài đặt

```bash
python extract_station_data_from_pdf.py
```

## Lưu ý

- OCR có thể chậm hơn text extraction (đặc biệt với PDF lớn)
- Chất lượng OCR phụ thuộc vào chất lượng scan
- PDF với resolution thấp có thể cho kết quả không chính xác
- Script sử dụng dpi=300 cho OCR (có thể điều chỉnh nếu cần)

## Troubleshooting

**Lỗi: "TesseractNotFoundError"**
- Đảm bảo Tesseract đã được cài đặt
- Kiểm tra PATH hoặc set `pytesseract.pytesseract.tesseract_cmd`

**Lỗi: "pdf2image.exceptions.PDFInfoNotInstalledError"**
- Cài đặt poppler:
  - macOS: `brew install poppler`
  - Linux: `sudo apt-get install poppler-utils`
  - Windows: Download từ https://github.com/oschwartz10612/poppler-windows/releases

**OCR chậm:**
- Giảm DPI (ví dụ: dpi=200 thay vì 300)
- Chỉ OCR các pages cần thiết
