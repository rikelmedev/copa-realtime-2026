require('dotenv').config();
const express = require('express');
const cors = require('cors');
const eventsRouter = require('./routes/events');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/events', eventsRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'copa-api' });
});

app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
