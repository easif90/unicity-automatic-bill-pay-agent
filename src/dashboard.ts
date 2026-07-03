import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.DASHBOARD_PORT || 3000;

app.use(express.static('public'));

app.get('/api/status', (req, res) => {
  try {
    const historyPath = 'payment-history.jsonl';
    const history = fs.existsSync(historyPath) 
      ? fs.readFileSync(historyPath, 'utf8')
          .split('\n')
          .filter(Boolean)
          .map(line => JSON.parse(line))
          .slice(0, 20)
      : [];

    res.json({
      balance: "Check in agent",
      monthlyBudget: 10000000,
      spentThisMonth: 0,
      remaining: 10000000,
      history: history.reverse(),
      status: "Running"
    });
  } catch (e) {
    res.json({ error: "Status load failed" });
  }
});

app.listen(PORT, () => {
  console.log(`🌐 Dashboard running → http://localhost:${PORT}`);
});
