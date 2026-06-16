import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { countryNameMap } from '../countryMap.js';

export async function getMatchResult24h(teamA, teamB, date) {
  try {
    const res = await fetch('https://www.24h.com.vn/bong-da/ket-qua-bong-da-hom-nay-c48a466581.html');
    if (!res.ok) return null;
    
    const text = await res.text();
    const $ = cheerio.load(text);
    
    let foundScore = null;
    
    const nameA_VN = getVietnameseName(teamA);
    const nameB_VN = getVietnameseName(teamB);

    $('tr').each((i, el) => {
      const rowText = $(el).text().toLowerCase();
      
      if ((rowText.includes(teamA.toLowerCase()) || (nameA_VN && rowText.includes(nameA_VN))) &&
          (rowText.includes(teamB.toLowerCase()) || (nameB_VN && rowText.includes(nameB_VN)))) {
        
        const match = rowText.match(/(\d+)\s*[-:]\s*(\d+)/);
        if (match) {
          foundScore = {
            scoreA: parseInt(match[1], 10),
            scoreB: parseInt(match[2], 10)
          };
        }
      }
    });
    
    return foundScore;
  } catch (e) {
    console.error('24h scraper error:', e.message);
    return null;
  }
}

function getVietnameseName(isoCode) {
  for (const [viName, code] of Object.entries(countryNameMap)) {
    if (code === isoCode) return viName;
  }
  return null;
}
