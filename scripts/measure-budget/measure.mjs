#!/usr/bin/env node
/**
 * Budget measurement harness for carGPT (issue #76).
 *
 * Runs each measurement prompt against a running carGPT server, parses the
 * price of every suggested car and reports how many suggestions exceed the
 * user's budget. Repeatable before/after enforcement changes.
 *
 * Usage:
 *   node scripts/measure-budget/measure.mjs [--runs N] [--base-url URL] [--out FILE]
 *
 * Defaults: runs=1, base-url=http://localhost:3001/api, out=<repo>/budget-report.json
 */

const BASE_URL = process.env.MEASURE_BASE_URL || 'http://localhost:3001/api';
const RUNS = Number(process.argv.includes('--runs') ? process.argv[process.argv.indexOf('--runs') + 1] : 1);

/**
 * Measurement prompts. `cap` is the maximum acceptable price in EUR/USD units
 * as expressed by the user (null = no budget in the prompt, control case).
 */
const PROMPTS = [
  {
    id: 'sportive-50k',
    lang: 'it',
    prompt: 'Con un budget di 50000 euro, che auto sportive mi consigliate?\nAl massimo 10 anni.',
    cap: 50000,
    note: 'issue #76 original reproduction'
  },
  {
    id: 'famiglia-range',
    lang: 'it',
    prompt: 'Cerco un auto familiare affidabile per 2 adulti e 2 bambini, bagagliaio grande per 3 valigie. Budget: 25000-35000 euro.',
    cap: 35000
  },
  {
    id: 'sportiva-40k',
    lang: 'it',
    prompt: 'Voglio un coupé sportivo diviso per la guida di tutti i giorni. Budget massimo 40000 euro.',
    cap: 40000
  },
  {
    id: 'city-20k',
    lang: 'en',
    prompt: 'Need a compact car for city driving:\n- Easy to park\n- Low fuel consumption\n- Hybrid preferred\n- Budget-friendly (under €20k)',
    cap: 20000
  },
  {
    id: 'suv-30k',
    lang: 'en',
    prompt: 'Looking for a family SUV with good fuel economy. My budget is up to $30,000.',
    cap: 30000
  },
  {
    id: 'berlina-15k',
    lang: 'it',
    prompt: 'Cerco una berlina usata economica per il tragitto giornaliero, massimo 15000 euro.',
    cap: 15000
  },
  {
    id: 'no-budget-control',
    lang: 'it',
    prompt: 'Consigliami un SUV robusto per avventure in montagna, affidabile e capiente.',
    cap: null
  }
];

/**
 * Parse a free-form price string into the maximum number it references.
 * Handles: "€25.000", "$25,000", "25.000 €", "35k", "25000-35000", "€25,000-35,000".
 * Returns null when no price can be extracted.
 */
function parsePriceMax(priceString) {
  if (typeof priceString !== 'string' || !priceString.trim()) return null;
  const cleaned = priceString.toLowerCase().replace(/[^\dkm.,0-9]/g, ' ');
  let max = null;
  // "35k" / "1.2m" style suffixes first
  for (const m of cleaned.matchAll(/(\d+(?:[.,]\d+)?)\s*(km?)\b/gi)) {
    const n = parseFloat(m[1].replace(',', '.'));
    if (!Number.isFinite(n)) continue;
    const value = m[2].toLowerCase() === 'm' ? n * 1_000_000 : n * 1_000;
    if (value > 500) max = Math.max(max ?? 0, value); // ignore sub-500 noise
  }
  const withoutK = cleaned.replace(/(\d+(?:[.,]\d+)?)\s*(km?)\b/gi, ' ');
  for (const m of withoutK.matchAll(/\d[\d.,]*\d|\d/g)) {
    let s = m[0];
    if (/^\d{1,3}([.,]\d{3})+$/.test(s)) {
      // unambiguous thousands: 25.000 or 25,000,0.. no decimals
      s = s.replace(/[.,]/g, '');
    } else {
      s = s.replace(/,/g, '.');
    }
    const n = parseFloat(s);
    if (!Number.isFinite(n)) continue;
    if (n > 500) max = Math.max(max ?? 0, n);
  }
  return max;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runSearch(prompt) {
  const res = await fetch(`${BASE_URL}/find-cars`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requirements: prompt }),
    signal: AbortSignal.timeout(300_000)
  });
  const data = await res.json().catch(() => ({}));
  return res.ok ? data : { error: data.error || `HTTP ${res.status}` };
}

async function main() {
  const report = { measuredAt: new Date().toISOString(), baseUrl: BASE_URL, runs: [], summary: null };
  let totalCars = 0, totalViolations = 0, totalBudged = 0, totalMissing = 0;

  // Resume support: if the output file exists, keep its completed (id, run) entries.
  const out = process.argv[process.argv.indexOf('--out') + 1] || 'budget-report.json';
  const { writeFileSync, existsSync, readFileSync, mkdirSync } = await import('node:fs');
  const { dirname } = await import('node:path');
  const writeReport = () => {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(report, null, 2));
  };
  const done = new Set();
  if (existsSync(out)) {
    try {
      const prev = JSON.parse(readFileSync(out, 'utf8'));
      for (const entry of prev.runs || []) {
        if (!entry.error) {
          report.runs.push(entry);
          done.add(`${entry.id}#${entry.run}`);
        }
      }
      // Recompute totals from all kept entries
      for (const entry of report.runs) {
        for (const c of entry.cars || []) {
          totalCars++;
          if (entry.cap != null) {
            totalBudged++;
            if (c.parsed == null) totalMissing++;
            if (c.violation) totalViolations++;
          }
        }
      }
      console.log(`Resuming: ${done.size} completed runs found in ${out}`);
    } catch {
      console.log('Could not read previous report, starting fresh');
    }
  }

  for (const p of PROMPTS) {
    for (let i = 0; i < RUNS; i++) {
      if (done.has(`${p.id}#${i + 1}`)) continue;
      const entry = { id: p.id, run: i + 1, cap: p.cap, cars: [], violations: 0, missingPrice: 0, error: null };
      let data;
      try {
        data = await runSearch(p.prompt);
      } catch (e) {
        data = { error: String(e) };
      }
      if (data.error) {
        entry.error = data.error;
      } else {
        for (const car of data.cars || []) {
          const priceNum = parsePriceMax(car.price);
          const violation = p.cap != null && priceNum != null && priceNum > p.cap * 1.1;
          entry.cars.push({
            car: `${car.make} ${car.model} (${car.year ?? ''})`.trim(),
            price: car.price,
            parsed: priceNum,
            violation
          });
          totalCars++;
          if (priceNum == null) entry.missingPrice++;
          if (p.cap != null) {
            totalBudged++;
            if (priceNum == null) totalMissing++;
            if (violation) { entry.violations++; totalViolations++; }
          }
        }
      }
      report.runs.push(entry);
      writeReport(); // incremental write: a kill preserves completed runs
      console.log(`[${p.id}] run ${i + 1}: ${entry.error ? 'ERROR ' + entry.error : (entry.cars.length + ' cars, ' + entry.violations + ' violations')}`);
      await sleep(1000);
    }
  }

  report.summary = {
    prompts: PROMPTS.length,
    runsPerPrompt: RUNS,
    carsTotal: totalCars,
    budgetedCars: totalBudged,
    violations: totalViolations,
    violationRate: totalBudged ? +(totalViolations / totalBudged).toFixed(3) : null,
    missingPrice: totalMissing,
    missingPriceRate: totalBudged ? +(totalMissing / totalBudged).toFixed(3) : null
  };
  report.summary.violationPct = report.summary.violationRate != null ? +(report.summary.violationRate * 100).toFixed(1) + '%' : 'n/a';
  report.summary.missingPricePct = report.summary.missingPriceRate != null ? +(report.summary.missingPriceRate * 100).toFixed(1) + '%' : 'n/a';
  console.log('\n=== SUMMARY ===');
  console.log(JSON.stringify(report.summary, null, 2));

  writeReport();
  console.log(`Report written to ${out}`);
}

main().catch((e) => { console.error(e); process.exit(1); });