import { NextApiRequest, NextApiResponse } from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { mouse, keyboard, Key, left, up,  } from '@nut-tree-fork/nut-js';

type ExtendedServer = HTTPServer & {
  io?: SocketIOServer;
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!res.socket) {
    res.status(500).send('Socket not found.');
    return;
  }
// @ts-expect-error: res.socket.server может отсутствовать в типе Socket
  const httpServer: ExtendedServer = res.socket.server;

  if (!httpServer.io) {
    console.log('Создание нового Socket.IO сервера...');
    const io = new SocketIOServer(httpServer, {
      path: '/api/signal',
    });
    httpServer.io = io;

    io.on('connection', (socket) => {
      console.log('Новое соединение: ', socket.id);

      socket.on('offer', (data) => {
        console.log('Получен offer от клиента');
        socket.broadcast.emit('offer', data);
      });

      socket.on('answer', (data) => {
        console.log('Получен answer от клиента');
        socket.broadcast.emit('answer', data);
      });

      socket.on('candidate', (data) => {
        console.log('Получен ICE candidate');
        socket.broadcast.emit('candidate', data);
      });

      socket.on('remoteControl', async (message) => {
        console.log('Получено сообщение управления:', message);
        await handleRemoteControlMessage(message);
      });

      socket.on('disconnect', () => {
        console.log('Клиент отключился: ', socket.id);
      });
    });
  } else {
    console.log('Socket.IO сервер уже существует.');
  }

  res.end();
}

async function handleRemoteControlMessage(message: string) {
  const parsedMessage = JSON.parse(message);
  const { type, clientX, clientY, key } = parsedMessage;

  try {
    if (type === 'mousemove') {
      // Двигаем мышь на указанные координаты
      console.log(`Перемещение мыши к: x=${clientX}, y=${clientY}`);
      // @ts-expect-error: res.socket.server может отсутствовать в типе Socket
      await mouse.move([left(clientX), up(clientY)]);
    } else if (type === 'click') {
      // Клик мышью
      console.log('Клик мышью');
      await mouse.leftClick();
    } else if (type === 'keydown') {
      // Нажатие клавиши
      console.log(`Нажатие клавиши: ${key}`);
      await keyboard.pressKey(Key[key.toUpperCase() as keyof typeof Key]);
    } else if (type === 'keyup') {
      // Отпускание клавиши
      console.log(`Отпускание клавиши: ${key}`);
      await keyboard.releaseKey(Key[key.toUpperCase() as keyof typeof Key]);
    }
  } catch (error) {
    console.error('Ошибка при обработке команды управления:', error);
  }
}
