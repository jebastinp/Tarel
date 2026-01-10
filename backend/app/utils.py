from datetime import datetime
import re
from typing import Dict

from sqlalchemy import Integer, cast, func
from sqlalchemy.orm import Session

from .models import User

POSTCODE_TO_AREA: Dict[str, str] = {
    "EH": "Edinburgh",
    "G": "Glasgow",
    "FK": "Falkirk",
    "KY": "Kirkcaldy",
    "DD": "Dundee",
    "AB": "Aberdeen",
    "IV": "Inverness",
    "PA": "Paisley",
    "KA": "Kilmarnock",
    "ML": "Motherwell",
    "DG": "Dumfries",
    "TD": "Galashiels",
    "PH": "Perth",
    "HS": "Harris",
    "ZE": "Shetland",
    "KW": "Kirkwall",
    "BT": "Belfast",
    "L": "Liverpool",
    "M": "Manchester",
    "B": "Birmingham",
    "LS": "Leeds",
    "S": "Sheffield",
    "NE": "Newcastle",
    "SR": "Sunderland",
    "DH": "Durham",
    "TS": "Teesside",
    "DL": "Darlington",
    "HG": "Harrogate",
    "YO": "York",
    "BD": "Bradford",
    "HU": "Hull",
    "DN": "Doncaster",
    "WF": "Wakefield",
    "HD": "Huddersfield",
    "OL": "Oldham",
    "BL": "Bolton",
    "WN": "Wigan",
    "PR": "Preston",
    "FY": "Blackpool",
    "LA": "Lancaster",
    "BB": "Blackburn",
    "CA": "Carlisle",
    "CH": "Chester",
    "WA": "Warrington",
    "CW": "Crewe",
    "ST": "Stoke",
    "TF": "Telford",
    "WS": "Walsall",
    "WV": "Wolverhampton",
    "DY": "Dudley",
    "CV": "Coventry",
    "LE": "Leicester",
    "NG": "Nottingham",
    "DE": "Derby",
    "LN": "Lincoln",
    "PE": "Peterborough",
    "CB": "Cambridge",
    "IP": "Ipswich",
    "NR": "Norwich",
    "CO": "Colchester",
    "CM": "Chelmsford",
    "SS": "Southend",
    "RM": "Romford",
    "EN": "Enfield",
    "N": "North London",
    "E": "East London",
    "SE": "South East London",
    "SW": "South West London",
    "W": "West London",
    "NW": "North West London",
    "EC": "East Central London",
    "WC": "West Central London",
    "BR": "Bromley",
    "CR": "Croydon",
    "DA": "Dartford",
    "KT": "Kingston",
    "SM": "Sutton",
    "TW": "Twickenham",
    "UB": "Uxbridge",
    "HA": "Harrow",
    "IG": "Ilford",
    "WD": "Watford",
    "SG": "Stevenage",
    "AL": "St Albans",
    "HP": "Hemel Hempstead",
    "LU": "Luton",
    "MK": "Milton Keynes",
    "NN": "Northampton",
    "OX": "Oxford",
    "RG": "Reading",
    "SL": "Slough",
    "GU": "Guildford",
    "RH": "Redhill",
    "BN": "Brighton",
    "TN": "Tonbridge",
    "ME": "Medway",
    "CT": "Canterbury",
    "PO": "Portsmouth",
    "SO": "Southampton",
    "BH": "Bournemouth",
    "DT": "Dorchester",
    "BA": "Bath",
    "BS": "Bristol",
    "SN": "Swindon",
    "GL": "Gloucester",
    "HR": "Hereford",
    "WR": "Worcester",
    "EX": "Exeter",
    "PL": "Plymouth",
    "TQ": "Torquay",
    "TR": "Truro",
    "TA": "Taunton",
    "SP": "Salisbury",
}

# Edinburgh postcode check (EH1–EH17 typically; adjust as needed)
EDINBURGH_POSTCODES = re.compile(r"^EH(1[0-7]|[1-9])\s?\d[A-Z]{2}$", re.IGNORECASE)


def is_edinburgh_postcode(pc: str) -> bool:
    return bool(EDINBURGH_POSTCODES.match(pc.strip()))


def _extract_area_code(postcode: str) -> str:
    cleaned = re.sub(r"\s+", "", postcode.upper())
    if not cleaned:
        raise ValueError("Postcode must not be empty")

    prefix = cleaned[:2]
    area = POSTCODE_TO_AREA.get(prefix)
    if not area:
        prefix = cleaned[:1]
        area = POSTCODE_TO_AREA.get(prefix)

    if not area:
        raise ValueError("Unsupported postcode prefix for user code generation")

    return area[:2].upper()


def _next_sequential_suffix(db: Session, year_suffix: str) -> int:
    pattern = f"__{year_suffix}%"
    max_suffix = (
        db.query(func.max(cast(func.substr(User.user_code, 5), Integer)))
        .filter(User.user_code.isnot(None))
        .filter(User.user_code.like(pattern))
        .scalar()
    )

    if not max_suffix or max_suffix < 0:
        return 1
    return max_suffix + 1


def generate_user_code(db: Session, postcode: str) -> str:
    area_code = _extract_area_code(postcode)
    year_suffix = datetime.utcnow().strftime("%y")
    next_seq = _next_sequential_suffix(db, year_suffix)
    return f"{area_code}{year_suffix}{str(next_seq).zfill(4)}"
