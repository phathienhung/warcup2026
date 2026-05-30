const fs = require('fs');
let matchesContent = fs.readFileSync('c:/Users/ADMIN/.antigravity/projects/worldcup2026/src/data/matches.js', 'utf8');

matchesContent = matchesContent.replace(/stage: 'Bảng A', date: '2026-06-17T08:00:00\+07:00', teamA: 'AR', teamB: 'DZ'/, "stage: 'Bảng J', date: '2026-06-17T08:00:00+07:00', teamA: 'AR', teamB: 'DZ'");
matchesContent = matchesContent.replace(/Bảng /g, 'Group ');
matchesContent = matchesContent.replace(/Lượt /g, 'Matchday ');

fs.writeFileSync('c:/Users/ADMIN/.antigravity/projects/worldcup2026/src/data/matches.js', matchesContent, 'utf8');
console.log('matches.js updated.');
