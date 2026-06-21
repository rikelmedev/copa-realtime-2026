require('dotenv').config();
const amqp = require('amqplib');
const { processEvent } = require('./processors/stats');

async function start(retries = 10, delay = 5000) {
  for (let i = 1; i <= retries; i++) {
    try {
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

      return;
    } catch (err) {
      console.log(`Tentativa ${i}/${retries} falhou. Aguardando ${delay / 1000}s...`);
      if (i === retries) {
        console.error('Não foi possível conectar ao RabbitMQ:', err.message);
        process.exit(1);
      }
      await new Promise((res) => setTimeout(res, delay));
    }
  }
}

start();
