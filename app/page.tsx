'use client';

import { useState, useEffect } from 'react';
import styles from '../public/voucher.module.css';
import { 
  getMacFromCookie, 
  saveMacToCookie, 
  needsMacAddress, 
  redirectToMacProvider, 
  extractMacFromUrl 
} from '@/lib/macService';

// Definir a URL do portal de login a partir de variável de ambiente
const LOGIN_PORTAL_URL = process.env.NEXT_PUBLIC_LOGIN_PORTAL_URL || 'https://hsevento.internet10.net.br';

export default function Home() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [alreadyActive, setAlreadyActive] = useState(false);
  const [macAddress, setMacAddress] = useState<string | undefined>(undefined);
  const [initializing, setInitializing] = useState(true);
  const [formErrors, setFormErrors] = useState({
    name: '',
    email: '',
    phone: ''
  });

  // Função para obter o MAC address quando a página carrega
  useEffect(() => {
    // Limpar qualquer tentativa anterior de redirecionamento ao carregar a página inicial
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.removeItem('redirect_attempt');
    }
    
    const handleMacAddress = () => {
      // Primeiro, verifica se já temos o MAC armazenado em cookie
      const storedMac = getMacFromCookie();
      
      if (storedMac) {
        // Se já temos o MAC, apenas o seta no estado
        setMacAddress(storedMac);
        setInitializing(false);
        return;
      }

      // Se não temos o MAC, verifica se ele está na URL (retorno do redirecionamento)
      const macFromUrl = extractMacFromUrl();
      
      if (macFromUrl) {
        // Validar formato do MAC antes de salvar
        const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$|^([0-9A-Fa-f]{4}[.]){2}([0-9A-Fa-f]{4})$/;
        if (macRegex.test(macFromUrl)) {
          // Se está na URL e é válido, salva no cookie e no estado
          saveMacToCookie(macFromUrl);
          setMacAddress(macFromUrl);
          
          // Limpar os parâmetros da URL para uma navegação mais limpa
          window.history.replaceState({}, document.title, window.location.pathname);
          setInitializing(false);
        } else {
          // MAC inválido, redirecionar para obter um novo
          redirectToMacProvider();
        }
      } else {
        // Se não temos o MAC nem no cookie nem na URL, precisamos redirecionar
        // Mas primeiro verificamos se já estamos em processo de inicialização
        if (initializing) {
          redirectToMacProvider();
        }
      }
    };

    handleMacAddress();
  }, [initializing]);

  const formatPhone = (value: string) => {
    // Limitar a entrada a um tamanho razoável para evitar buffer overflow
    if (value.length > 15) {
      value = value.substring(0, 15);
    }
    
    return value
      .replace(/\D/g, '') // Remove tudo que não é dígito
      .replace(/(\d{2})(\d)/, '($1) $2') // Coloca parênteses em volta dos dois primeiros dígitos
      .replace(/(\d{5})(\d)/, '$1-$2') // Coloca hífen entre o quinto e o sexto dígitos
      .replace(/(-\d{4})\d+?$/, '$1'); // Limita a 4 dígitos depois do hífen
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedPhone = formatPhone(e.target.value);
    setPhone(formattedPhone);
    validateField('phone', formattedPhone);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Limitar o tamanho do nome
    if (value.length <= 100) {
      setName(value);
      validateField('name', value);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Limitar o tamanho do email
    if (value.length <= 100) {
      setEmail(value);
      validateField('email', value);
    }
  };

  const validateField = (field: 'name' | 'email' | 'phone', value: string) => {
    let errors = { ...formErrors };
    
    switch (field) {
      case 'name':
        if (!value.trim()) {
          errors.name = 'Nome é obrigatório';
        } else if (value.trim().length < 8) {
          errors.name = 'Nome deve ter pelo menos 8 caracteres';
        } else {
          errors.name = '';
        }
        break;
      
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!value.trim()) {
          errors.email = 'E-mail é obrigatório';
        } else if (!emailRegex.test(value)) {
          errors.email = 'E-mail inválido';
        } else {
          errors.email = '';
        }
        break;
      
      case 'phone':
        const phoneDigits = value.replace(/\D/g, '');
        if (!phoneDigits) {
          errors.phone = 'Telefone é obrigatório';
        } else if (phoneDigits.length < 10 || phoneDigits.length > 11) {
          errors.phone = 'Telefone inválido';
        } else {
          errors.phone = '';
        }
        break;
    }
    
    setFormErrors(errors);
  };

  const validateForm = (): boolean => {
    validateField('name', name);
    validateField('email', email);
    validateField('phone', phone);
    
    return !formErrors.name && !formErrors.email && !formErrors.phone;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar o formulário antes de enviar
    if (!validateForm()) {
      setErrorMessage('Por favor, corrija os erros no formulário.');
      return;
    }
    
    setErrorMessage('');
    setSuccessMessage('');
    setAlreadyActive(false);
    setLoading(true);
    
    // Assegura que temos um MAC address
    if (!macAddress) {
      setErrorMessage('Não foi possível obter o endereço MAC do seu dispositivo.');
      setLoading(false);
      return;
    }

    try {
      // Usar a rota validate-voucher para compatibilidade com o sistema existente
      const res = await fetch('/api/validate-voucher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.replace(/\D/g, ''), // Remove caracteres não numéricos
          mac: macAddress // Inclui o MAC address na requisição
        }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        if (data.alreadyActive) {
          // Navegação já está liberada - não recebemos mais credenciais por segurança
          setAlreadyActive(true);
          setSuccessMessage(data.message || 'Sua navegação já foi liberada');
          setLoading(false);
        } else if (data.username && data.password) {
          // Novo login foi validado e temos as credenciais necessárias
          setSuccessMessage('Redirecionando para o portal de acesso...');
          
          // Obter username e password da resposta
          const username = data.username || data.voucher;
          const password = data.password || data.voucher;
          
          // Limpar qualquer tentativa anterior de redirecionamento
          if (typeof window !== 'undefined' && window.sessionStorage) {
            sessionStorage.removeItem('redirect_attempt');
          }
          
          // Usar a página de redirecionamento interna
          const encodedUsername = encodeURIComponent(username);
          const encodedPassword = encodeURIComponent(password);
          
          // Redirecionar para nossa página interna de redirecionamento
          window.location.href = `/login-redirect?username=${encodedUsername}&password=${encodedPassword}`;
        } else {
          // Resposta mal formada da API
          setErrorMessage('Erro no servidor. Por favor, tente novamente mais tarde.');
          setLoading(false);
        }
      } else {
        setErrorMessage(data.message || 'Ocorreu um erro ao processar sua solicitação.');
        setLoading(false);
      }
    } catch (error) {
      setErrorMessage('Erro de conexão. Por favor, tente novamente.');
      setLoading(false);
    }
  };

  // Se ainda estamos obtendo o MAC, exibimos um indicador de carregamento
  if (initializing) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.container}>
          <h1 className={styles.title}>Carregando...</h1>
          <p style={{ textAlign: 'center' }}>Obtendo informações do dispositivo</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <h1 className={styles.title}>Acesso à Internet</h1>
        <p className={styles.subtitle}>Preencha seus dados para acessar a internet</p>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <label htmlFor="name" className={styles.label}>Nome Completo</label>
          <input 
            type="text" 
            id="name"
            value={name} 
            onChange={handleNameChange} 
            className={`${styles.input} ${formErrors.name ? styles.inputError : ''}`} 
            placeholder="Digite seu nome completo" 
            maxLength={100}
            required 
          />
          {formErrors.name && <div className={styles.fieldError}>{formErrors.name}</div>}

          <label htmlFor="email" className={styles.label}>E-mail</label>
          <input 
            type="email" 
            id="email"
            value={email} 
            onChange={handleEmailChange} 
            className={`${styles.input} ${formErrors.email ? styles.inputError : ''}`} 
            placeholder="Digite seu e-mail" 
            maxLength={100}
            required 
          />
          {formErrors.email && <div className={styles.fieldError}>{formErrors.email}</div>}

          <label htmlFor="phone" className={styles.label}>Telefone</label>
          <input 
            type="text" 
            id="phone"
            value={phone} 
            onChange={handlePhoneChange} 
            className={`${styles.input} ${formErrors.phone ? styles.inputError : ''}`} 
            placeholder="(99) 99999-9999" 
            required 
          />
          {formErrors.phone && <div className={styles.fieldError}>{formErrors.phone}</div>}

          {errorMessage && <div className={styles.error}>{errorMessage}</div>}
          {successMessage && <div className={styles.success}>{successMessage}</div>}
          
          <button 
            type="submit" 
            className={styles.button}
            disabled={loading}
          >
            {loading ? 'Processando...' : 'Acessar Internet'}
          </button>
        </form>

        {alreadyActive && (
          <div className={styles.voucherResult}>
            <p>Sua navegação já está liberada!</p>
            <p className={styles.success}>Você pode continuar usando a internet normalmente.</p>
          </div>
        )}
      </div>
    </div>
  );
}
