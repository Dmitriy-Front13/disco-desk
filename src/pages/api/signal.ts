import { NextApiRequest, NextApiResponse } from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

type ExtendedServer = HTTPServer & {
  io?: SocketIOServer;
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  
  if (!res.socket) {
    res.status(500).send('Socket not found.');
    return;
  }
  // @ts-expect-error
  const httpServer = res.socket.server as ExtendedServer;
  

  if (!httpServer.io) {
    console.log('Создание нового Socket.IO сервера...');
    const io = new SocketIOServer(httpServer, {
      path: '/api/signal', // Соответствует пути, по которому будут идти запросы.
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

      socket.on('disconnect', () => {
        console.log('Клиент отключился: ', socket.id);
      });
    });
  } else {
    console.log('Socket.IO сервер уже существует.');
  }

  res.end();
}
