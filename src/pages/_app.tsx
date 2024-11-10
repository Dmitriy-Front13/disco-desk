"use client"
import { useEffect } from 'react';
import type { AppProps } from 'next/app';

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Вызов API маршрута, чтобы инициализировать Socket.IO сервер
    fetch('/api/signal').catch((err) => console.error('Ошибка при вызове /api/signal', err));
  }, []);

  return <Component {...pageProps} />;
}

export default MyApp;
