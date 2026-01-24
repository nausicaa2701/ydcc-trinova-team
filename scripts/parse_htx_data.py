"""Script to parse HTX.md and generate cooperative data for backend and frontend."""

import re
from pathlib import Path

# Tọa độ trung tâm các quận/huyện TPHCM (approximate)
DISTRICT_COORDS = {
    "Quận 9": (10.8422, 106.8099),
    "Thủ Đức": (10.8497, 106.7637),
    "Bình Chánh": (10.6994, 106.6067),
    "Quận 8": (10.7400, 106.6290),
    "Củ Chi": (11.1572, 106.4967),
    "Cần Giờ": (10.4114, 106.9547),
    "Quận 12": (10.8639, 106.6544),
}

def parse_htx_file(file_path: str):
    """Parse HTX.md file and extract cooperative data."""
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    cooperatives = []
    
    # Skip header lines (first 2 lines)
    for line in lines[2:]:
        line = line.strip()
        if not line:
            continue
        
        # Parse tab-separated values
        parts = line.split('\t')
        if len(parts) < 5:
            continue
        
        stt = parts[0].strip()
        ten_htx = parts[1].strip()
        ten_chu_nhiem = parts[2].strip()
        dia_chi = parts[3].strip()
        quan_huyen = parts[4].strip()
        
        # Get coordinates for district
        lat, lon = DISTRICT_COORDS.get(quan_huyen, (10.7769, 106.7009))  # Default to TPHCM center
        
        # Generate ID
        htx_id = f"htx-hcm-{stt.zfill(3)}"
        
        # Clean up name (remove extra spaces, normalize)
        ten_htx = re.sub(r'\s+', ' ', ten_htx)
        
        cooperatives.append({
            'id': htx_id,
            'stt': stt,
            'name': ten_htx,
            'chairman': ten_chu_nhiem,
            'address': dia_chi,
            'district': quan_huyen,
            'province': 'TP. Hồ Chí Minh',
            'lat': lat,
            'lon': lon,
        })
    
    return cooperatives

def generate_backend_code(cooperatives):
    """Generate Python code for backend/database.py"""
    code = "    # Create cooperatives from HTX.md data\n"
    code += "    cooperatives_db = {\n"
    
    for coop in cooperatives:
        code += f'        "{coop["id"]}": Cooperative(\n'
        code += f'            id="{coop["id"]}",\n'
        code += f'            name="{coop["name"]}",\n'
        code += f'            province="{coop["province"]}",\n'
        code += f'            center_lat={coop["lat"]},\n'
        code += f'            center_lon={coop["lon"]},\n'
        code += '            status="active",\n'
        code += '            config={"threshold_salinity": 4.0, "crops": ["rice", "shrimp"]}\n'
        code += '        ),\n'
    
    code += "    }\n"
    return code

def generate_frontend_code(cooperatives):
    """Generate TypeScript code for frontend/src/data/mockFarms.ts"""
    code = "export const mockCooperatives: Cooperative[] = [\n"
    
    for i, coop in enumerate(cooperatives):
        # Generate some mock stats
        total_farms = 20 + (i % 30)  # 20-50 farms
        total_area = 50.0 + (i % 50)  # 50-100 ha
        average_risk_score = 30 + (i % 50)  # 30-80
        affected_farms = int(total_farms * (0.3 + (i % 40) / 100))  # 30-70% affected
        
        code += "  {\n"
        code += f'    id: "{coop["id"]}",\n'
        code += f'    name: "{coop["name"]}",\n'
        code += f'    location: "{coop["district"]}, {coop["province"]}",\n'
        code += f"    totalFarms: {total_farms},\n"
        code += f"    totalArea: {total_area:.1f},\n"
        code += f"    averageRiskScore: {average_risk_score},\n"
        code += f"    affectedFarms: {affected_farms},\n"
        code += "  },\n"
    
    code += "];\n"
    return code

if __name__ == "__main__":
    # Parse HTX.md
    htx_file = Path(__file__).parent.parent / "HTX.md"
    cooperatives = parse_htx_file(str(htx_file))
    
    print(f"Parsed {len(cooperatives)} cooperatives from HTX.md\n")
    
    # Generate backend code
    print("=" * 80)
    print("BACKEND CODE (for backend/database.py):")
    print("=" * 80)
    print(generate_backend_code(cooperatives))
    
    print("\n" + "=" * 80)
    print("FRONTEND CODE (for frontend/src/data/mockFarms.ts):")
    print("=" * 80)
    print(generate_frontend_code(cooperatives))
    
    # Save to files
    backend_output = Path(__file__).parent.parent / "backend" / "htx_data.py"
    frontend_output = Path(__file__).parent.parent / "frontend" / "src" / "data" / "htx_data.ts"
    
    with open(backend_output, 'w', encoding='utf-8') as f:
        f.write("# Auto-generated from HTX.md\n")
        f.write("from .models import Cooperative\n\n")
        f.write("HTX_DATA = [\n")
        for coop in cooperatives:
            f.write(f"    {{\n")
            f.write(f'        "id": "{coop["id"]}",\n')
            f.write(f'        "name": "{coop["name"]}",\n')
            f.write(f'        "province": "{coop["province"]}",\n')
            f.write(f'        "center_lat": {coop["lat"]},\n')
            f.write(f'        "center_lon": {coop["lon"]},\n')
            f.write(f'        "district": "{coop["district"]}",\n')
            f.write(f'        "address": "{coop["address"]}",\n')
            f.write(f'        "chairman": "{coop["chairman"]}",\n')
            f.write(f"    }},\n")
        f.write("]\n")
    
    with open(frontend_output, 'w', encoding='utf-8') as f:
        f.write("// Auto-generated from HTX.md\n")
        f.write("import { Cooperative } from '@/types'\n\n")
        f.write("export const htxCooperatives: Cooperative[] = [\n")
        for i, coop in enumerate(cooperatives):
            total_farms = 20 + (i % 30)
            total_area = 50.0 + (i % 50)
            average_risk_score = 30 + (i % 50)
            affected_farms = int(total_farms * (0.3 + (i % 40) / 100))
            
            f.write("  {\n")
            f.write(f'    id: "{coop["id"]}",\n')
            f.write(f'    name: "{coop["name"]}",\n')
            f.write(f'    location: "{coop["district"]}, {coop["province"]}",\n')
            f.write(f"    totalFarms: {total_farms},\n")
            f.write(f"    totalArea: {total_area:.1f},\n")
            f.write(f"    averageRiskScore: {average_risk_score},\n")
            f.write(f"    affectedFarms: {affected_farms},\n")
            f.write("  },\n")
        f.write("]\n")
    
    print(f"\n✓ Generated {backend_output}")
    print(f"✓ Generated {frontend_output}")
