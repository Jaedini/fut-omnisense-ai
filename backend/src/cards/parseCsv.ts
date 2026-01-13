// very small CSV parser (supports commas, quoted fields)
export function parseCsv(csv: string): any[] {
  const lines = csv.split(/\r?\n/).filter(l => l.trim().length);
  if (lines.length < 2) return [];

  const headers = splitLine(lines[0]).map(h => h.trim());
  const out: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitLine(lines[i]);
    const row: any = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] ?? "";
    });
    out.push(row);
  }
  return out;
}

function splitLine(line: string): string[] {
  const res: string[] = [];
  let cur = "";
  let inQ = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' ) {
      if (inQ && line[i+1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
      continue;
    }
    if (ch === "," && !inQ) { res.push(cur); cur = ""; continue; }
    cur += ch;
  }
  res.push(cur);
  return res;
}
