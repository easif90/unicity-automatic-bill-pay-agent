
```bash
cd /workspaces/unicity-automatic-bill-pay-agent/bill-pay-agent

cat > README.md << 'EOF'
# 🚀 Bill Pay Agent v2

**Fully Autonomous Bill Payment Agent** built with **Unicity Sphere SDK**

An intelligent, self-operating economic agent that automatically monitors balance and pays bills without human intervention.

---

## ✨ Features

- **Automatic Balance Monitoring** — Checks balance every 5 minutes
- **Auto Bill Payment** — Pays bills when balance exceeds threshold
- **Monthly Budget Management** — Respects monthly spending limit
- **Real-time Event Handling** — Incoming transfers, Payment Requests
- **Telegram Notifications** — Instant alerts for payments & activity
- **Smart Conditions** — Budget check before every payment
- **Retry Logic** — Automatic retry on failed payments
- **Detailed Logging** — Complete transaction history
- **Web Dashboard** (Upcoming)

---

## 🛠️ Tech Stack

- **Unicity Sphere SDK** — Core blockchain interaction
- **Node.js + TypeScript**
- **Telegram Bot API** — Notifications
- **PM2 / Docker** — Production deployment

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/ashuvo671/unicity-automatic-bill-pay-agent.git
cd bill-pay-agent
npm install
```

### 2. Configure `.env`

```env
WALLET_PASSWORD=your_strong_password
NETWORK=testnet2

PAYMENT_THRESHOLD=10
BILL_RECIPIENT=your.recipient.nametag
BILL_AMOUNT=5
COIN_ID=UCT
MEMO=Automatic monthly bill payment - Agent v2

TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

MONTHLY_BUDGET=20000
```

### 3. Run the Agent

```bash
# Development
npx ts-node src/agent.ts

# Production (Recommended)
npm run build
pm2 start ecosystem.config.js
```

---

## 📋 How It Works

1. **Wallet Initialization** — Secure encrypted wallet
2. **Real-time Monitoring** — Listens to transfers and payment requests
3. **Balance Check** — Every 5 minutes
4. **Smart Decision** — Checks budget → then pays bill
5. **Notifications** — Sends update to Telegram
6. **Logging** — Saves everything locally

---

## 🧠 Agentic Level

This is a **truly autonomous agent**:
- Humans only set the initial goal (who to pay, threshold, budget)
- Agent makes all decisions independently
- Runs 24/7 without manual intervention

---

## 📁 Project Structure

```
bill-pay-agent/
├── src/agent.ts              # Main agent logic
├── .env                      # Configuration (gitignored)
├── payment-history.jsonl     # Transaction logs
├── budget.json               # Monthly budget tracking
├── ecosystem.config.js       # PM2 config
├── Dockerfile                # Docker support
└── README.md
```

---

## 🏗️ Production Deployment

### PM2 (Recommended)
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Docker
```bash
docker-compose up -d --build
```

---

## 🎯 Unicity Sphere SDK Usage

- `Sphere.init()` — Wallet initialization
- `payments.getAssets()` — Balance checking
- `payments.send()` — Automatic payments
- `on('transfer:incoming')` — Real-time events
- `onPaymentRequest()` — Auto payment requests

---

## 📈 Future Roadmap

- Web Dashboard
- Multi-bill support (Electricity, Internet, Rent etc.)
- Date-based payment rules
- Advanced analytics

---

**Built for Unicity SphereQuests**  
A practical demonstration of **Autonomous Economic Agents** on Unicity Network.

---

**Made with ❤️ by aShuvo**
