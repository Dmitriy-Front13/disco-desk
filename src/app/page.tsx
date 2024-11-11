"use client"
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export default function ScreenSharing() {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);

  const servers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' }, // Используем публичный STUN сервер Google
    ],
  };

  useEffect(() => {
    socketRef.current = io(
      { path: '/api/signal' });

    socketRef.current.on('connect', () => {
      console.log('Подключен к серверу сигнализации');
    });

    // Создание RTCPeerConnection
    peerConnectionRef.current = new RTCPeerConnection(servers);

    // Создание Data Channel для передачи управления
    const dataChannel = peerConnectionRef.current.createDataChannel('remoteControl');
    dataChannelRef.current = dataChannel;

    dataChannel.onopen = () => {
      console.log('Data channel открыто, можно передавать команды управления');
    };

    dataChannel.onclose = () => {
      console.log('Data channel закрыто');
    };

    peerConnectionRef.current.ondatachannel = (event) => {
      const remoteDataChannel = event.channel;
      remoteDataChannel.onmessage = handleRemoteControlMessage; // Обработка входящих команд
    };

    // Обработка ICE кандидатов
    socketRef.current.on('candidate', (candidate: RTCIceCandidateInit) => {
      peerConnectionRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
    });

    peerConnectionRef.current.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('candidate', event.candidate);
      }
    };

    peerConnectionRef.current.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    return () => {
      socketRef.current?.disconnect();
      peerConnectionRef.current?.close();
    };
  }, []);

  // Начало трансляции экрана
  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      stream.getTracks().forEach((track) => {
        peerConnectionRef.current?.addTrack(track, stream);
      });

      const offer = await peerConnectionRef.current?.createOffer();
      await peerConnectionRef.current?.setLocalDescription(offer!);
      socketRef.current?.emit('offer', offer);
    } catch (error) {
      console.error('Ошибка при попытке начать трансляцию экрана:', error);
    }
  };

  // Получение offer от другого клиента
  useEffect(() => {
    socketRef.current?.on('offer', async (offer: RTCSessionDescriptionInit) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));

        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);

        socketRef.current?.emit('answer', answer);
      }
    });

    // Получение answer от другого клиента
    socketRef.current?.on('answer', async (answer: RTCSessionDescriptionInit) => {
      await peerConnectionRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
    });
  }, []);

  // Обработка событий управления, поступающих с удаленного клиента
  const handleRemoteControlMessage = (event: MessageEvent) => {
    console.log('Получено сообщение управления:', event.data);
    const message = JSON.parse(event.data);
    if (!localVideoRef.current) return;

    const { type, clientX, clientY, key, code } = message;

    const videoElement = localVideoRef.current;
    const rect = videoElement.getBoundingClientRect(); // Положение видео на странице

    // Преобразование координат мыши относительно видео
    const x = rect.left + (clientX / videoElement.offsetWidth) * rect.width;
    const y = rect.top + (clientY / videoElement.offsetHeight) * rect.height;

    if (type === 'mousemove' || type === 'click') {
      simulateMouseEvent(type, x, y);
    } else if (type === 'keydown' || type === 'keyup') {
      simulateKeyboardEvent(type, key, code);
    }
  };

  // Функция для симуляции событий мыши
  const simulateMouseEvent = (type: string, x: number, y: number) => {
    const event = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
    });
    console.log('asdasdasd');

    document.elementFromPoint(x, y)?.dispatchEvent(event);
  };

  // Функция для симуляции событий клавиатуры
  const simulateKeyboardEvent = (type: string, key: string, code: string) => {
    const event = new KeyboardEvent(type, {
      bubbles: true,
      cancelable: true,
      key: key,
      code: code,
    });
    console.log('asdasdasd');
    
    document.dispatchEvent(event);
  };

  // Обработка событий мыши и клавиатуры для удаленного управления
  const handleMouseEvent = (event: React.MouseEvent) => {
    const { clientX, clientY, type } = event;
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      const message = {
        type,
        clientX,
        clientY,
      };
      console.log('Отправка события мыши:', message);
      dataChannelRef.current.send(JSON.stringify(message));
    }
  };

  const handleKeyEvent = (event: React.KeyboardEvent) => {
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      const message = {
        type: event.type,
        key: event.key,
        code: event.code,
      };
      console.log('Отправка события клавы:', message);
      dataChannelRef.current.send(JSON.stringify(message));
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4"
      onMouseMove={handleMouseEvent}
      onClick={handleMouseEvent}
      onKeyDown={handleKeyEvent}
      onKeyUp={handleKeyEvent}
      tabIndex={0}
    >
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Screen Sharing Component</h2>

      <div className="flex flex-col md:flex-row items-center gap-8 mb-6">
        <div className="w-full md:w-1/2 flex flex-col items-center">
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Ваш экран</h3>
          <video
            ref={localVideoRef}
            autoPlay
            muted
            className="w-full max-w-sm border-2 border-blue-500 rounded-md shadow-md"
          />
        </div>

        <div className="w-full md:w-1/2 flex flex-col items-center">
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Удаленный экран</h3>
          <video
            ref={remoteVideoRef}
            autoPlay
            className="w-full max-w-sm border-2 border-green-500 rounded-md shadow-md"
          />
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 mb-6">
        <button className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition">
          Тестовая кнопка
        </button>
        <input
          type="text"
          className="px-3 py-2 border rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Введите текст для теста"
        />
        <div
          className="w-24 h-24 bg-red-500 flex items-center justify-center text-white rounded-md shadow-md cursor-pointer"
          onClick={() => console.log('Тестовый div кликнут')}
        >
          Тестовый Div
        </div>
      </div>

      <button
        onClick={startScreenShare}
        className="px-6 py-3 text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-lg transition duration-200"
      >
        Начать трансляцию экрана
      </button>
    </div>
  );
}
