export function linkWhatsApp(texto, url) {
  const mensagem = `${texto} ${url}`.trim();
  return `https://wa.me/?text=${encodeURIComponent(mensagem)}`;
}
