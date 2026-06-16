const countryNameMap = {
  // Châu Âu
  "anh": "GB",
  "pháp": "FR",
  "đức": "DE",
  "ý": "IT",
  "italia": "IT",
  "tây ban nha": "ES",
  "bồ đào nha": "PT",
  "hà lan": "NL",
  "bỉ": "BE",
  "croatia": "HR",
  "thụy sĩ": "CH",
  "thụy sỹ": "CH",
  "ba lan": "PL",
  "đan mạch": "DK",
  "thụy điển": "SE",
  "bắc ireland": "GB", // approximation
  "wales": "GB", // approximation
  "scotland": "GB", // approximation
  "na uy": "NO",
  "séc": "CZ",
  "ch séc": "CZ",
  "serbia": "RS",

  // Châu Mỹ
  "brazil": "BR",
  "argentina": "AR",
  "uruguay": "UY",
  "colombia": "CO",
  "peru": "PE",
  "ecuador": "EC",
  "chile": "CL",
  "mỹ": "US",
  "hoa kỳ": "US",
  "mexico": "MX",
  "canada": "CA",
  "costa rica": "CR",

  // Châu Á
  "nhật bản": "JP",
  "hàn quốc": "KR",
  "iran": "IR",
  "ả rập xê út": "SA",
  "saudi arabia": "SA",
  "úp": "AU", // Úc
  "úc": "AU",
  "australia": "AU",
  "qatar": "QA",
  "việt nam": "VN",
  "trung quốc": "CN",
  "thái lan": "TH",
  "indonesia": "ID",
  "malaysia": "MY",

  // Châu Phi
  "senegal": "SN",
  "marốc": "MA",
  "morocco": "MA",
  "ai cập": "EG",
  "nigeria": "NG",
  "cameroon": "CM",
  "ghana": "GH",
  "algeria": "DZ",
  "bờ biển ngà": "CI",
  "nam phi": "ZA",
  "south africa": "ZA",

  // Châu Đại Dương
  "new zealand": "NZ"
};

/**
 * Clean strings, remove accents, and get ISO country code
 */
function normalizeTeamName(name) {
  if (!name) return null;
  // Lowercase
  let cleaned = name.trim().toLowerCase();
  
  // Try direct match
  if (countryNameMap[cleaned]) {
    return countryNameMap[cleaned];
  }

  // Remove accents
  cleaned = cleaned.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  cleaned = cleaned.replace(/đ/g, "d").replace(/Đ/g, "D");

  // Secondary map for unaccented forms
  const unaccentedMap = {};
  for (const [key, value] of Object.entries(countryNameMap)) {
    let unacc = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
    unaccentedMap[unacc] = value;
  }

  if (unaccentedMap[cleaned]) {
    return unaccentedMap[cleaned];
  }

  // Fallback to ISO-like or original representation
  return name.trim();
}

export { normalizeTeamName, countryNameMap };
