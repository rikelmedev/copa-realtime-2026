require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const Redis = require('ioredis');

const PORT = process.env.WS_PORT || 3001;

const server = http.createServer();
const io = new Server(server, {
  cors: { origin: '*' },
});

const subscriber = new Redis(process.env.REDIS_URL);

subscriber.subscribe('eventos_copa', () => {
  console.log('Assinando canal Redis: eventos_copa');
});

subscriber.on('message', (channel, message) => {
  const event = JSON.parse(message);
  io.emit('atualizacao', event);
  console.log(`Evento emitido via WebSocket: ${event.type} - partida ${event.matchId}`);
});

io.on('connection', (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`Cliente desconectado: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`Servidor WebSocket rodando na porta ${PORT}`);
});
