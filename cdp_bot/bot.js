const puppeteer = require('puppeteer-core');
const fs = require('fs');

const CONFIG = {
    TORN_EMAIL: process.env.TORN_EMAIL || '',
    TORN_PASSWORD: process.env.TORN_PASSWORD || '',
    WASTE_URL: 'https://www.torn.com/wastefinder.php',
    DAILY_LIMIT: 200
};

function randomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function loginTorn(page) {
    console.log('[Bot] جاري تسجيل الدخول...');
    await page.goto('https://www.torn.com/login.php', { waitUntil: 'networkidle2' });
    await page.type('input[name="email"]', CONFIG.TORN_EMAIL, { delay: 100 });
    await page.type('input[name="password"]', CONFIG.TORN_PASSWORD, { delay: 100 });
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log('[Bot] تم تسجيل الدخول');
}

async function performSearch(page) {
    console.log('[Bot] جاري البحث...');
    await page.goto(CONFIG.WASTE_URL, { waitUntil: 'networkidle2' });
    const results = await page.evaluate(() => {
        const items = [];
        document.querySelectorAll('.waste-result, .loot-entry').forEach((el, i) => {
            const text = el.innerText || '';
            const valMatch = text.match(/\$([\d,]+)/);
            if (valMatch) {
                items.push({
                    name: text.substring(0, 50).trim(),
                    value: parseInt(valMatch[1].replace(/,/g, ''), 10)
                });
            }
        });
        return items;
    });
    results.forEach(item => {
        if (item.value >= 10000) {
            console.log(`[Bot] $${item.value.toLocaleString()} - ${item.name}`);
        }
        fs.appendFileSync('./waste_logs.txt',
            `[${new Date().toISOString()}] $${item.value} - ${item.name}\n`
        );
    });
    console.log(`[Bot] ${results.length} عنصر`);
}

(async () => {
    console.log('== Torn Waste Bot ==');
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage();
    try {
        await loginTorn(page);
        let count = 0;
        while (count < CONFIG.DAILY_LIMIT) {
            await performSearch(page);
            count++;
            const wait = randomDelay(30, 120);
            console.log(`[Bot] انتظار ${wait} ثانية...`);
            await page.waitForTimeout(wait * 1000);
        }
    } catch (e) {
        console.error('[Bot] خطأ:', e.message);
    } finally {
        await browser.close();
    }
})();

