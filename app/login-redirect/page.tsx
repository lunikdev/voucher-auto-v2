'use client';

import { Suspense } from 'react';
import styles from '../../public/voucher.module.css';
import LoginRedirectContent from './login-redirect-content';

export default function LoginRedirectPage() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <h1 className={styles.title}>Redirecionamento de Acesso</h1>
        
        <Suspense fallback={
          <div className={styles.loading}>
            <p>Carregando...</p>
            <div className={styles.spinner}></div>
          </div>
        }>
          <LoginRedirectContent />
        </Suspense>
      </div>
    </div>
  );
}
