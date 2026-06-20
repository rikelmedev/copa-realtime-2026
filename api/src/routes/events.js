const express = require('express');
const { publisher } = require('../config/redis');
const { getChannel } = require('../config/rabbitmq');

const router = express.Router();

router.post('/', async (req, res) => {
  const { type, matchId, data } = req.body;

  if (!type || !matchId || !data) {
    return res.status(400).json({ error: 'Campos obrigatórios: type, matchId, data' });
  }

  const event = {
    type,
    matchId,
    data,
    timestamp: new Date().toISOString(),
  };

  await publisher.publish('eventos_copa', JSON.stringify(event));

  const channel = getChannel();
  channel.sendToQueue(
    'estatisticas_fila',
    Buffer.from(JSON.stringify(event)),
    { persistent: true }
  );

  res.status(201).json({ message: 'Evento recebido', event });
});

module.exports = router;
