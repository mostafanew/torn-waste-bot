const https = require('https');
const fs = require('fs');

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function sendTelegram(message) {
    return new Promise((resolve, reject) => {
        const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage?chat_id=${TELEGRAM_CHAT_ID}&text=${encodeURIComponent(message)}`;
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
}

function getExchangeRates() {
    return new Promise((resolve, reject) => {
        https.get('https://api.exchangerate-api.com/v4/latest/USD', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
}

(async () => {
    console.log('== Bot Started ==');
    const rates = await getExchangeRates();
    const message = `💰 أسعار العملات اليوم:\n🇸🇦 ريال سعودي: ${rates.rates.SAR}\n🇪🇬 جنيه مصري: ${rates.rates.EGP}\n🇪🇺 يورو: ${rates.rates.EUR}`;
    await sendTelegram(message);
    console.log('تم إرسال الرسالة!');
})();
