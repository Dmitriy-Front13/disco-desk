// Импортируем необходимые хуки и зависимости
"use client";
import { useEffect } from "react";

// Определяем компонент SocketInitializer
// Этот компонент используется для инициализации Socket.IO сервера или другого соединения
const SocketInitializer = () => {
  useEffect(() => {
    const initializeSocket = async () => {
      try {
        const response = await fetch("/api/signal");
        if (!response.ok) {
          throw new Error("Ошибка при вызове /api/signal");
        }
      } catch (err) {
        console.error("Ошибка при вызове /api/signal", err);
      }
    };

    initializeSocket();
  }, []);

  return null; // Этот компонент не отображает ничего в интерфейсе
};

export default SocketInitializer;
