import { readFile } from 'node:fs/promises';
import { montarDados } from '../js/normalizar.js';

const BASE = 'https://api.football-data.org/v4';
const COMPETICAO = 'WC'; // código da Copa do Mundo na football-data.org

async function buscar(caminho, chave) {
  const resp = await fetch(`${BASE}/competitions/${COMPETICAO}/${caminho}`, {
    headers: { 'X-Auth-Token': chave },
  });
  if (!resp.ok) {
    throw new Error(`football-data /${caminho} respondeu ${resp.status}`);
  }
  return resp.json();
}

async function fallbackManual() {
  const conteudo = await readFile(
    new URL('../dados-manual.json', import.meta.url),
    'utf-8'
  );
  const manual = JSON.parse(conteudo);
  return { ...manual, fonte: 'manual', atualizadoEm: new Date().toISOString() };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  const chave = process.env.API_KEY;
  try {
    if (!chave) throw new Error('API_KEY ausente');
    const [standings, matches, scorers] = await Promise.all([
      buscar('standings', chave),
      buscar('matches', chave),
      buscar('scorers', chave),
    ]);
    res.status(200).json(montarDados({ standings, matches, scorers }));
  } catch (erro) {
    res.status(200).json(await fallbackManual());
  }
}
