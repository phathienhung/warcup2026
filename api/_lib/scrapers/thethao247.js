import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { countryNameMap } from '../countryMap.js';

export async function getMatchResultTheThao247(teamA, teamB, date) {
  try {
    const res = await fetch('https://thethao247.vn/ket-qua-bong-da-hom-nay.html');
    if (!res.ok) return null;
    
    const text = await res.text();
    const $ = cheerio.load(text);
    
    let foundScore = null;
    
    const nameA_VN = getVietnameseName(teamA);
    const nameB_VN = getVietnameseName(teamB);

    $('li, tr, .match-item').each((i, el) => {
      const textContext = $(el).text().toLowerCase();
      
      if ((textContext.includes(teamA.toLowerCase()) || (nameA_VN && textContext.includes(nameA_VN))) &&
          (textContext.includes(teamB.toLowerCase()) || (nameB_VN && textContext.includes(nameB_VN)))) {
        
        const match = textContext.match(/(\d+)\s*[-:]\s*(\d+)/);
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
    console.error('thethao247 scraper error:', e.message);
    return null;
  }
}

function getVietnameseName(isoCode) {
  for (const [viName, code] of Object.entries(countryNameMap)) {
    if (code === isoCode) return viName;
  }
  return null;
}
