import { test } from 'node:test';
import assert from 'node:assert/strict';
import { linkWhatsApp } from './compartilhar.js';

test('monta uma URL wa.me com o texto e a URL codificados', () => {
  const link = linkWhatsApp('Bora torcer!', 'https://copa-hexa.vercel.app');
  assert.match(link, /^https:\/\/wa\.me\/\?text=/);
  assert.match(link, /Bora%20torcer!/);
  assert.match(link, /https%3A%2F%2Fcopa-hexa\.vercel\.app/);
});

test('codifica acentos corretamente', () => {
  const link = linkWhatsApp('Hexa é nóis', 'https://x.com');
  assert.match(link, /n%C3%B3is/);
});
