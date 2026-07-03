import { Sphere } from '@unicitylabs/sphere-sdk';
import { createNodeProviders } from '@unicitylabs/sphere-sdk/impl/nodejs';
import { createWalletApiProviders } from '@unicitylabs/sphere-sdk/impl/shared/wallet-api';
import dotenv from 'dotenv';
import fs from 'fs';
import TelegramBot from 'node-telegram-bot-api';
dotenv.config();
const dataDir = './wallet-data';
const tokensDir = './tokens-data';
const LOG_FILE = 'payment-history.jsonl';
const BUDGET_FILE = 'budget.json';
if (!fs.existsSync(dataDir))
    fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(tokensDir))
    fs.mkdirSync(tokensDir, { recursive: true });
// Telegram Setup
let telegramBot = null;
if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    telegramBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
    console.log('📱 Telegram Notification Enabled');
}
function sendTelegram(message) {
    if (telegramBot && process.env.TELEGRAM_CHAT_ID) {
        telegramBot.sendMessage(process.env.TELEGRAM_CHAT_ID, `🛡️ Bill Pay Agent:\n${message}`)
            .catch(err => console.error('Telegram send failed:', err));
    }
}
function logTransaction(type, data) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        type,
        amount: data.amount || data.totalAmount || 'N/A',
        ...data
    };
    fs.appendFileSync(LOG_FILE, JSON.stringify(logEntry) + '\n');
    console.log(`📝 [${type}] Logged`);
}
// Budget Management
function loadBudget() {
    if (!fs.existsSync(BUDGET_FILE)) {
        const defaultBudget = {
            monthlyLimit: parseFloat(process.env.MONTHLY_BUDGET || '20000000'),
            spentThisMonth: 0,
            month: new Date().getMonth()
        };
        fs.writeFileSync(BUDGET_FILE, JSON.stringify(defaultBudget, null, 2));
        return defaultBudget;
    }
    return JSON.parse(fs.readFileSync(BUDGET_FILE, 'utf8'));
}
function saveBudget(budget) {
    fs.writeFileSync(BUDGET_FILE, JSON.stringify(budget, null, 2));
}
function checkAndResetBudget() {
    let budget = loadBudget();
    const currentMonth = new Date().getMonth();
    if (budget.month !== currentMonth) {
        budget.spentThisMonth = 0;
        budget.month = currentMonth;
        saveBudget(budget);
        console.log('🔄 Monthly budget reset');
        sendTelegram('Monthly budget has been reset.');
    }
    return budget;
}
// Mnemonic Loader
function getMnemonic() {
    if (process.env.WALLET_MNEMONIC)
        return process.env.WALLET_MNEMONIC.trim();
    if (fs.existsSync('mnemonic-backup.txt')) {
        return fs.readFileSync('mnemonic-backup.txt', 'utf8').trim();
    }
    return null;
}
async function initializeWallet() {
    const base = createNodeProviders({
        network: (process.env.NETWORK || 'testnet2'),
        dataDir,
        tokensDir,
    });
    const providers = createWalletApiProviders(base, {
        baseUrl: 'https://wallet-api.unicity.network',
        network: (process.env.NETWORK || 'testnet2'),
        deviceId: 'bill-pay-agent-001',
    });
    const mnemonic = getMnemonic();
    const initOptions = {
        ...providers,
        network: (process.env.NETWORK || 'testnet2'),
        password: process.env.WALLET_PASSWORD,
        autoGenerate: !mnemonic,
    };
    if (mnemonic) {
        initOptions.mnemonic = mnemonic;
        console.log('🔑 Loading from mnemonic-backup.txt');
    }
    const result = await Sphere.init(initOptions);
    const sphere = result.sphere;
    if (result.generatedMnemonic) {
        fs.writeFileSync('mnemonic-backup.txt', result.generatedMnemonic);
        console.log('⚠️ NEW MNEMONIC SAVED to mnemonic-backup.txt');
    }
    console.log('✅ Wallet Loaded Successfully!');
    console.log('📍 Address:', sphere.identity?.directAddress);
    return sphere;
}
async function makeAutomaticPayment(sphere) {
    try {
        checkAndResetBudget();
        const budget = loadBudget();
        if (budget.spentThisMonth >= budget.monthlyLimit) {
            console.log('⛔ Monthly budget limit reached!');
            sendTelegram('⚠️ Monthly budget limit reached. Payment skipped.');
            return;
        }
        const result = await sphere.payments.send({
            recipient: process.env.BILL_RECIPIENT,
            amount: process.env.BILL_AMOUNT,
            coinId: process.env.COIN_ID,
            memo: process.env.MEMO || 'Automatic monthly bill payment - Agent v2',
        });
        budget.spentThisMonth += parseFloat(process.env.BILL_AMOUNT);
        saveBudget(budget);
        console.log('✅ Bill Payment Successful!', result.id);
        logTransaction('auto_bill_payment', result);
        sendTelegram(`✅ Bill Paid!\nAmount: ${process.env.BILL_AMOUNT} ${process.env.COIN_ID}\nTX: ${result.id}`);
    }
    catch (error) {
        console.error('Payment failed:', error);
        sendTelegram(`❌ Payment Failed: ${error}`);
    }
}
function setupEventListeners(sphere) {
    sphere.on('transfer:incoming', (transfer) => {
        console.log('📥 Incoming Transfer Received!');
        logTransaction('incoming', transfer);
        sendTelegram(`📥 Incoming: ${transfer.amount} ${transfer.symbol}`);
    });
    sphere.on('transfer:confirmed', (transfer) => {
        console.log('✅ Transfer Confirmed:', transfer.id);
        logTransaction('confirmed', transfer);
    });
    sphere.payments.onPaymentRequest((request) => {
        console.log(`📨 Payment Request: ${request.amount} ${request.symbol}`);
        handlePaymentRequest(sphere, request);
    });
    console.log('👂 All event listeners active');
}
async function handlePaymentRequest(sphere, request) {
    try {
        await sphere.payments.payPaymentRequest(request.id);
        console.log(`✅ Auto paid request: ${request.id}`);
        logTransaction('auto_paid_request', request);
        sendTelegram(`✅ Auto Paid Request: ${request.amount} ${request.symbol}`);
    }
    catch (err) {
        console.error('Request pay failed:', err);
    }
}
async function startMonitoringLoop(sphere) {
    const intervalMs = parseInt(process.env.CHECK_INTERVAL_MINUTES || '5') * 60 * 1000;
    setInterval(async () => {
        try {
            const assets = await sphere.payments.getAssets();
            const asset = assets.find((a) => a.symbol === process.env.COIN_ID);
            if (!asset)
                return;
            const balance = parseFloat(asset.totalAmount || '0');
            const threshold = parseFloat(process.env.PAYMENT_THRESHOLD || '5000000');
            console.log(`💰 Balance: ${balance} | Threshold: ${threshold}`);
            if (balance >= threshold) {
                await makeAutomaticPayment(sphere);
            }
        }
        catch (e) {
            console.error('Monitoring error:', e);
        }
    }, intervalMs);
    console.log(`🔁 Monitoring started (every ${process.env.CHECK_INTERVAL_MINUTES} minutes)`);
}
async function main() {
    console.log('🚀 Starting Bill Pay Agent v2 (with Budget + Telegram)...');
    const sphere = await initializeWallet();
    setupEventListeners(sphere);
    await sphere.payments.receive();
    startMonitoringLoop(sphere);
    console.log('🎉 Agent is now fully autonomous!');
}
main().catch(console.error);
