/**
 * Punctul de conectare pentru căutarea cu AI.
 *
 * Pagina cu harta cheamă `askAi(text)` și aplică rezultatul: evidențiază locurile potrivite
 * și, dacă AI-ul a înțeles o dată sau ore, le pune în calendar. Până se conectează backendul,
 * funcția aruncă `AiNotConnectedError`, iar pagina afișează „AI search isn't connected yet”.
 *
 * Pentru conectare se schimbă doar corpul lui `askAi`.
 */

export type AiAttribute = 'window' | 'quiet' | 'dual-monitor' | 'dock';
export type AiKind = 'room' | 'booth';

/** Ce trebuie să returneze AI-ul: filtre structurate, nu text liber. */
export interface AiSearchResult {
  /** Preferințe cerute pentru loc. Listă goală dacă nu a cerut nimic anume. */
  attributes: AiAttribute[];
  /** `room` = sală de ședințe, `booth` = cabină, `null` = un loc obișnuit. */
  kind: AiKind | null;
  /** Data dorită, AAAA-LL-ZZ, sau `null` dacă nu a fost cerută. */
  date: string | null;
  /** Ora de start (9–17) și de final (10–18), sau `null` pentru toată ziua. */
  from: number | null;
  to: number | null;
  /** Un text scurt de la AI, afișat sub câmpul de căutare. */
  message?: string;
}

export class AiNotConnectedError extends Error {
  constructor() {
    super('AI search is not connected yet');
    this.name = 'AiNotConnectedError';
  }
}

export async function askAi(query: string): Promise<AiSearchResult> {
  void query;
  // TODO(backend): exemplu, de adaptat la endpoint-ul real:
  //   const res = await fetch('/ai/search', { method: 'POST', body: JSON.stringify({ query }) });
  //   return (await res.json()) as AiSearchResult;
  throw new AiNotConnectedError();
}
