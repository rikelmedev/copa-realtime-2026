const amqp = require('amqplib');

let channel = null;

async function connect() {
  const connection = await amqp.connect(process.env.RABBITMQ_URL);
  channel = await connection.createChannel();
  await channel.assertQueue('estatisticas_fila', { durable: true });
  console.log('RabbitMQ conectado');
}

function getChannel() {
  return channel;
}

module.exports = { connect, getChannel };
