export function isAuthenticated() {
  const token = localStorage.getItem('token');
  return !!token; // retorna true si hay token
}
