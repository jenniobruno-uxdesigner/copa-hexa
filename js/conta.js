const CHAVE_TOKEN = 'copaSessao';
const CHAVE_PERFIL = 'copaPerfil';

export function perfilAtual() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_PERFIL));
  } catch {
    return null;
  }
}

export function tokenAtual() {
  return localStorage.getItem(CHAVE_TOKEN);
}

export function sair() {
  localStorage.removeItem(CHAVE_TOKEN);
  localStorage.removeItem(CHAVE_PERFIL);
}

function salvar({ token, perfil }) {
  localStorage.setItem(CHAVE_TOKEN, token);
  localStorage.setItem(CHAVE_PERFIL, JSON.stringify(perfil));
}

async function postAuth(corpo) {
  const r = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(dados.erro || 'Não rolou agora, tenta de novo.');
  return dados;
}

export async function registrar(username, pin) {
  const d = await postAuth({ acao: 'registrar', username, pin });
  salvar(d);
  return d.perfil;
}

export async function entrar(username, pin) {
  const d = await postAuth({ acao: 'entrar', username, pin });
  salvar(d);
  return d.perfil;
}

export async function entrarComGoogle(idToken) {
  const d = await postAuth({ acao: 'google', idToken });
  salvar(d);
  return d.perfil;
}
