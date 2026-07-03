import { Sphere } from '@unicitylabs/sphere-sdk';
import { createNodeProviders } from '@unicitylabs/sphere-sdk/impl/nodejs';
import { createWalletApiProviders } from '@unicitylabs/sphere-sdk/impl/shared/wallet-api';
import dotenv from 'dotenv';
import fs from 'fs';
import TelegramBot from 'node-telegram-bot-api';

dotenv.config();

// ==================== CONFIG ====================
const dataDir = './wallet-data';
const tokensDir = './tokens-data';
const LOG_FILE = 'payment-history.jsonl';
const BUDGET_FILE = 'budget.json';

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(tokensDir)) fs.mkdirSync(tokensDir, { recursive: true });

// Budget Management
let monthlyBudget = parseFloat(process.env.MONTHLY_BUDGET || '20000000');
let spentThisMonth = 0;
let currentMonth = new Date().getMonth();

function loadBudget() {
  try {
    if (fs.existsSync(BUDGET_FILE)) {
      const data = JSON.parse(fs.readFileSync(BUDGET_FILE, 'utf8'));
      monthlyBudget = data.monthlyBudget || monthlyBudget;
      spentThisMonth = data.spentThisMonth || 0;
      currentMonth = data.currentMonth || currentMonth;
    }
  } catch (e) {}
}

function saveBudget() {
  fs.writeFileSync(BUDGET_FILE, JSON.stringify({ monthlyBudget, spentThisMonth, currentMonth, lastUpdated: new Date().toISOString() }, null, 2));
}

loadBudget();

// Telegram
const telegramBot = process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID 
  ? new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false }) 
  : null;

function sendTelegram(message: string) {
  if (telegramBot) {
    telegramBot.sendMessage(process.env.TELEGRAM_CHAT_ID!, message).catch(() => {});
  }
}

// Wallet Init
async function initializeWallet() {
  const base = createNodeProviders({ network: (process.env.NETWORK || 'testnet2') as any, dataDir, tokensDir });
  const providers = createWalletApiProviders(base, { baseUrl: 'https://wallet-api.unicity.network', network: (process.env.NETWORK || 'testnet2') as any, deviceId: 'bill-pay-agent-001' });

  const { sphere, created, generatedMnemonic } = await Sphere.init({
    ...providers,
    network: (process.env.NETWORK || 'testnet2') as any,
    password: process.env.WALLET_PASSWORD!,
    autoGenerate: true,
  });

  if (created && generatedMnemonic) {
    console.log('⚠️ SAVE MNEMONIC:');
    console.log(generatedMnemonic);
    fs.writeFileSync('mnemonic-backup.txt', generatedMnemonic);
  }

  console.log('✅ Wallet Ready. Address:', sphere.identity?.directAddress);
  return sphere;
}

function logTransaction(type: string, data: any) {
  const entry = { timestamp: new Date().toISOString(), type, data };
  fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
}

async function makeAutomaticPayment(sphere: any) {
  if (spentThisMonth + parseFloat(process.env.BILL_AMOUNT || '0') > monthlyBudget) {
    sendTelegram('⚠️ Monthly Budget Limit Reached!');
    return;
  }

  try {
    const result = await sphere.payments.send({
      recipient: process.env.BILL_RECIPIENT!,
      amount: process.env.BILL_AMOUNT!,
      coinId: process.env.COIN_ID!,
      memo: process.env.MEMO || 'Automatic bill payment - Agent v2',
    });

    spentThisMonth += parseFloat(process.env.BILL_AMOUNT || '0');
    saveBudget();

    console.log('✅ Bill Paid!');
    logTransaction('auto_payment', result);
    sendTelegram(`✅ Bill Paid!\nAmount: ${process.env.BILL_AMOUNT} ${process.env.COIN_ID}\nTX: ${result.id}`);
  } catch (e) {
    console.error('Payment failed', e);
    sendTelegram(`❌ Payment Failed: ${e}`);
  }
}

async function main() {
  console.log('🚀 Bill Pay Agent v2 Running (Budget + Telegram + Auto Pay)...');
  const sphere = await initializeWallet();

  // Events
  sphere.on('transfer:incoming', (t: any) => {
    console.log('📥 Incoming Money');
    logTransaction('incoming', t);
    sendTelegram(`📥 Incoming: ${t.amount} ${t.symbol}`);
  });

  sphere.payments.onPaymentRequest((req: any) => {
    console.log('📨 Payment Request');
    sphere.payments.payPaymentRequest(req.id).catch(() => {});
  });

  // Monitoring Loop
  setInterval(async () => {
    try {
      const assets = await sphere.payments.getAssets();
      const asset = assets.find((a: any) => a.symbol === process.env.COIN_ID);
      if (asset && parseFloat(asset.totalAmount) >= parseFloat(process.env.PAYMENT_THRESHOLD || '1000000')) {
        await makeAutomaticPayment(sphere);
      }
    } catch (e) {}
  }, 300000); // 5 minutes

  console.log('🎉 Fully Autonomous Agent is LIVE!');
}

main().catch(console.error);
