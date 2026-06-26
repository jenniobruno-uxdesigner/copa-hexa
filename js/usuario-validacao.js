export function usernameValido(u) {
  return typeof u === 'string' && /^[a-zA-Z0-9_.]{3,20}$/.test(u);
}

export function pinValido(p) {
  return typeof p === 'string' && /^[0-9]{4,6}$/.test(p);
}
