'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from '../../public/voucher.module.css';

// Definir a URL do portal de login a partir de variável de ambiente
const LOGIN_PORTAL_URL = process.env.NEXT_PUBLIC_LOGIN_PORTAL_URL || 'https://hsevento.internet10.net.br';

export default function LoginRedirectContent() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('Redirecionando para o portal de acesso...');
  const [error, setError] = useState('');

  useEffect(() => {
    // Extrair username e password dos parâmetros da URL
    const username = searchParams.get('username');
    const password = searchParams.get('password');
    
    if (!username || !password) {
      setError('Parâmetros de login inválidos ou ausentes');
      return;
    }
    
    try {
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
          onClick={() => window.location.href = '/'}
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
