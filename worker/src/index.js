require('dotenv').config();
const amqp = require('amqplib');
const { processEvent } = require('./processors/stats');

async function start() {
  const connection = await amqp.connect(process.env.RABBITMQ_URL);
  const channel = await connection.createChannel();

  await channel.assertQueue('estatisticas_fila', { durable: true });
  channel.prefetch(1);

  console.log('Worker aguardando eventos na fila: estatisticas_fila');

  channel.consume('estatisticas_fila', async (msg) => {
    if (!msg) return;

    const event = JSON.parse(msg.content.toString());
    console.log(`Processando evento: ${event.type} - partida ${event.matchId}`);

    await processEvent(event);

    channel.ack(msg);
  });
}

start().catch((err) => {
  console.error('Erro ao iniciar worker:', err);
  process.exit(1);
});
