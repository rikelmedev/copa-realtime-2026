const { getChannel } = require('../config/rabbitmq');
const { processEvent } = require('../processors/stats');

function startConsumer() {
  const channel = getChannel();

  channel.prefetch(1);
  channel.consume('estatisticas_fila', async (msg) => {
    if (!msg) return;

    const event = JSON.parse(msg.content.toString());
    console.log(`Worker: processando ${event.type} - partida ${event.matchId}`);

    try {
      await processEvent(event);
      channel.ack(msg);
    } catch (err) {
      console.error('Erro ao processar evento:', err.message);
      channel.nack(msg, false, false);
    }
  });

  console.log('Consumer aguardando eventos na fila: estatisticas_fila');
}

module.exports = { startConsumer };
