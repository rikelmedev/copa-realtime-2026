require('dotenv').config();
const express = require('express');
const cors = require('cors');
const eventsRouter = require('./routes/events');
const { connect } = require('./config/rabbitmq');
const { startPoller } = require('./jobs/poller');
const { startConsumer } = require('./jobs/consumer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/events', eventsRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'copa-api' });
});

async function bootstrap() {
  await connect();
  startPoller();
  startConsumer();
  app.listen(PORT, () => {
    console.log(`API rodando na porta ${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Erro ao iniciar API:', err);
  process.exit(1);
});
