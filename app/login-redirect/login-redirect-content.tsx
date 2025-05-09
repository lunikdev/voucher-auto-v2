'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from '../../public/voucher.module.css';

// Definir a URL do portal de login a partir de variável de ambiente
const LOGIN_PORTAL_URL = process.env.NEXT_PUBLIC_LOGIN_PORTAL_URL || 'https://hsevento.internet10.net.br';

// Chave para armazenar informações sobre tentativas de redirecionamento
const REDIRECT_ATTEMPT_KEY = 'redirect_attempt';

export default function LoginRedirectContent() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('Redirecionando para o portal de acesso...');
  const [error, setError] = useState('');
  const [redirectAttempted, setRedirectAttempted] = useState(false);

  useEffect(() => {
    // Verificar se já tentamos redirecionar antes para evitar loops
    const redirectAttempt = sessionStorage.getItem(REDIRECT_ATTEMPT_KEY);
    const currentTimestamp = Date.now();
    
    // Se já tentamos redirecionar nos últimos 10 segundos, evitar loop
    if (redirectAttempt && (currentTimestamp - parseInt(redirectAttempt)) < 10000) {
      setError('Erro ao conectar ao portal de login. Por favor, tente novamente mais tarde.');
      setRedirectAttempted(true);
      return;
    }
    
    // Extrair username e password dos parâmetros da URL
    const username = searchParams.get('username');
    const password = searchParams.get('password');
    
    if (!username || !password) {
      setError('Parâmetros de login inválidos ou ausentes');
      return;
    }
    
    try {
      // Registrar a tentativa de redirecionamento com timestamp
      sessionStorage.setItem(REDIRECT_ATTEMPT_KEY, currentTimestamp.toString());
      
      // Construir a URL de redirecionamento
      const encodedUsername = encodeURIComponent(username);
      const encodedPassword = encodeURIComponent(password);
      const loginUrl = `${LOGIN_PORTAL_URL}/login?username=${encodedUsername}&password=${encodedPassword}`;
      
      // Redirecionar após um breve atraso para que o usuário possa ver a mensagem
      const redirectTimer = setTimeout(() => {
        window.location.href = loginUrl;
      }, 1500);
      
      // Limpar o timer se o componente for desmontado
      return () => clearTimeout(redirectTimer);
      
    } catch (err) {
      console.error('Erro no redirecionamento:', err);
      setError('Ocorreu um erro durante o redirecionamento. Por favor, tente novamente.');
    }
  }, [searchParams]);

  if (error) {
    return (
      <div className={styles.error}>
        <p>{error}</p>
        <button 
          className={styles.button}
          onClick={() => {
            // Limpar o registro de tentativa de redirecionamento
            sessionStorage.removeItem(REDIRECT_ATTEMPT_KEY);
            window.location.href = '/';
          }}
        >
          Voltar para o Início
        </button>
      </div>
    );
  }

  return (
    <div className={styles.success}>
      <p>{message}</p>
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
      </div>
    </div>
  );
}
