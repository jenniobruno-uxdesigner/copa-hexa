import { perfilAtual, sair, entrar, registrar, entrarComGoogle } from './conta.js';

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

function avatarHtml(p) {
  const letra = esc((p.nome || '?').trim().charAt(0).toUpperCase() || '?');
  const interno = p.foto ? `<img src="${esc(p.foto)}" alt="" />` : letra;
  return `<span class="conta__avatar" data-letra="${letra}">${interno}</span>`;
}

export function montarBarraConta(el, { aoMudar } = {}) {
  function render() {
    const p = perfilAtual();
    if (p) {
      el.innerHTML = `
        <div class="conta">
          ${avatarHtml(p)}
          <span class="conta__nome">Olá, ${esc(p.nome)}</span>
          <button type="button" class="conta__sair" id="conta-sair">sair</button>
        </div>`;
      const img = el.querySelector('.conta__avatar img');
      if (img) {
        img.addEventListener('error', () => {
          const span = img.parentElement;
          span.textContent = span.dataset.letra;
        });
      }
      el.querySelector('#conta-sair').addEventListener('click', () => {
        sair();
        render();
        if (aoMudar) aoMudar();
      });
    } else {
      el.innerHTML = `<button type="button" class="conta__entrar" id="conta-entrar">Entrar pra disputar o pódio 🏆</button>`;
      el.querySelector('#conta-entrar').addEventListener('click', abrirModal);
    }
  }

  function abrirModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-conta';
    overlay.innerHTML = `
      <div class="modal-conta__caixa" role="dialog" aria-label="Entrar pra competir">
        <button class="modal-conta__fechar" id="mc-fechar" aria-label="Fechar">×</button>
        <h3>Entrar pra competir 🏆</h3>
        <p class="modal-conta__sub">Anônimo joga e palpita normal. Logado, você entra no pódio. Sem e-mail.</p>
        <div class="modal-conta__abas">
          <button type="button" class="aba ativa" data-aba="entrar">Entrar</button>
          <button type="button" class="aba" data-aba="criar">Criar conta</button>
        </div>
        <form id="mc-form">
          <input id="mc-user" placeholder="Usuário" maxlength="20" autocomplete="username" />
          <input id="mc-pin" placeholder="PIN (4 a 6 números)" inputmode="numeric" maxlength="6" autocomplete="off" />
          <button type="submit" id="mc-enviar">Entrar</button>
        </form>
        <p class="modal-conta__aviso">O PIN não tem recuperação — anota num cantinho. 🙂</p>
        <div class="modal-conta__ou" id="mc-ou">ou</div>
        <div id="mc-google"></div>
        <p class="modal-conta__erro" id="mc-erro" aria-live="polite"></p>
      </div>`;
    document.body.appendChild(overlay);

    let aba = 'entrar';
    const erro = overlay.querySelector('#mc-erro');
    const fechar = () => overlay.remove();
    const aoLogar = () => { fechar(); render(); if (aoMudar) aoMudar(); };

    overlay.querySelector('#mc-fechar').addEventListener('click', fechar);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) fechar(); });

    overlay.querySelectorAll('.aba').forEach((b) => {
      b.addEventListener('click', () => {
        aba = b.dataset.aba;
        overlay.querySelectorAll('.aba').forEach((x) => x.classList.toggle('ativa', x === b));
        overlay.querySelector('#mc-enviar').textContent = aba === 'criar' ? 'Criar conta' : 'Entrar';
      });
    });

    overlay.querySelector('#mc-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      erro.textContent = '';
      const u = overlay.querySelector('#mc-user').value.trim();
      const pin = overlay.querySelector('#mc-pin').value.trim();
      try {
        if (aba === 'criar') await registrar(u, pin);
        else await entrar(u, pin);
        aoLogar();
      } catch (err) {
        erro.textContent = err.message;
      }
    });

    prepararGoogle(overlay, erro, aoLogar);
  }

  render();
}

async function prepararGoogle(overlay, erro, aoLogar) {
  let cfg = {};
  try {
    cfg = await (await fetch('/api/config')).json();
  } catch {
    cfg = {};
  }
  if (!cfg.googleClientId) {
    overlay.querySelector('#mc-ou').style.display = 'none';
    return;
  }
  await carregarGIS();
  window.google.accounts.id.initialize({
    client_id: cfg.googleClientId,
    callback: async (resp) => {
      try {
        await entrarComGoogle(resp.credential);
        aoLogar();
      } catch (err) {
        erro.textContent = err.message;
      }
    },
  });
  window.google.accounts.id.renderButton(overlay.querySelector('#mc-google'), {
    theme: 'filled_black', size: 'large', text: 'continue_with', shape: 'pill',
  });
}

function carregarGIS() {
  return new Promise((resolve) => {
    if (window.google && window.google.accounts) return resolve();
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => resolve();
    document.head.appendChild(s);
  });
}
