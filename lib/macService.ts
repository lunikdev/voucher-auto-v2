// lib/macService.ts
import Cookies from 'js-cookie';

const MAC_COOKIE_NAME = 'user_mac_address';
const MAC_EXPIRY_DAYS = 30; // Define por quanto tempo o cookie do MAC será válido

// Usar variável de ambiente para a URL do provedor de MAC
// Com fallback para o valor original caso não esteja definido
const MAC_PROVIDER_URL = process.env.NEXT_PUBLIC_MAC_PROVIDER_URL || 'http://192.168.52.1/extra.html';

export const getMacFromCookie = (): string | undefined => {
  return Cookies.get(MAC_COOKIE_NAME);
};

export const saveMacToCookie = (mac: string): void => {
  // Validar o MAC antes de salvar
  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$|^([0-9A-Fa-f]{4}[.]){2}([0-9A-Fa-f]{4})$/;
  if (macRegex.test(mac)) {
    Cookies.set(MAC_COOKIE_NAME, mac, { expires: MAC_EXPIRY_DAYS, sameSite: 'strict' });
  }
};

export const needsMacAddress = (): boolean => {
  return !getMacFromCookie();
};

export const redirectToMacProvider = (): void => {
  // URL da página que fornece o MAC address (agora usando a variável de ambiente)
  const macProviderUrl = MAC_PROVIDER_URL;
  
  // A origem para onde queremos voltar (URL atual)
  const origin = window.location.origin;
  
  // Encode os parâmetros da URL para evitar injeção
  const encodedOrigin = encodeURIComponent(origin);
  
  // Montamos a URL completa
  const redirectUrl = `${macProviderUrl}?userId=null&origin=${encodedOrigin}&verifier=null`;
  
  // Redirecionamos o usuário
  window.location.href = redirectUrl;
};

export const extractMacFromUrl = (): string | null => {
  const params = new URLSearchParams(window.location.search);
  const mac = params.get('mac');
  
  // Validar o MAC antes de retornar
  if (mac) {
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$|^([0-9A-Fa-f]{4}[.]){2}([0-9A-Fa-f]{4})$/;
    if (macRegex.test(mac)) {
      return mac;
    }
  }
  
  return null;
};
