const amqp = require('amqplib');

let channel = null;

async function connect(retries = 10, delay = 5000) {
  for (let i = 1; i <= retries; i++) {
    try {
      const connection = await amqp.connect(process.env.RABBITMQ_URL);
      channel = await connection.createChannel();
      await channel.assertQueue('estatisticas_fila', { durable: true });
      console.log('RabbitMQ conectado');
      return;
    } catch (err) {
      console.log(`RabbitMQ tentativa ${i}/${retries} falhou. Aguardando ${delay / 1000}s...`);
      if (i === retries) throw err;
      await new Promise((res) => setTimeout(res, delay));
    }
  }
}

function getChannel() {
  return channel;
}

module.exports = { connect, getChannel };
