/**
 * Torn.com Waste Finder Bot - GitHub Actions + Termux
 * مجاني تمامًا — بدون بطاقة بنكية
 * يعمل 24/7 عبر GitHub Actions
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

// ========== الإعدادات ==========
const CONFIG = {
    TORN_EMAIL: process.env.TORN_EMAIL || 'your_email@gmail.com',
    TORN_PASSWORD: process.env.TORN_PASSWORD || 'your_password',
    SERVER_URL: 'https://www.torn.com',
    WASTE_URL: 'https://www.torn.com/wastefinder.php',
    SEARCH_INTERVAL_MIN: 30,
    SEARCH_INTERVAL_MAX: 120,
    DAILY_LIMIT: 200,
    HUMAN_CURSOR_MOVE: true,
    LOG_PORT: 8080
};

// ========== دوال مساعدة ==========
function randomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function humanCursorMove(page, startX, startY, endX, endY) {
    if (!CONFIG.HUMAN_CURSOR_MOVE) {
        await page.mouse.click(endX, endY);
        return;
    }
    const steps = randomDelay(8, 15);
    const points = [];
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const jitterX = (Math.random() - 0.5) * 10;
        const jitterY = (Math.random() - 0.5) * 10;
        points.push({
            x: startX + (endX - startX) * t + jitterX,
            y: startY + (endY - startY) * t + jitterY
        });
    }
    for (const point of points) {
        await page.mouse.move(point.x, point.y, { step: randomDelay(10, 30) });
        await page.waitForTimeout(randomDelay(5, 20));
    }
    await page.mouse.click(endX, endY);
}

// ========== تسجيل الدخول ==========
async function loginTorn(page) {
    console.log('[Bot] جاري تسجيل الدخول...');
    try {
        if (fs.existsSync('./torn_session.json')) {
            const cookies = JSON.parse(fs.readFileSync('./torn_session.json', 'utf8'));
            await page.setCookie(...cookies);
            await page.goto(CONFIG.SERVER_URL, { waitUntil: 'networkidle2' });
            const isLoggedIn = await page.evaluate(() => 
                document.cookie.includes('torn_session')
            );
            if (isLoggedIn) {
                console.log('[Bot] ✅ تم تسجيل الدخول (جلسة محفوظة)');
                return;
            }
        }
        await page.goto('https://www.torn.com/login.php', { waitUntil: 'networkidle2' });
        await page.type('input[name="email"]', CONFIG.TORN_EMAIL, { delay: 100 });
        await page.type('input[name="password"]', CONFIG.TORN_PASSWORD, { delay: 100 });
        await humanCursorMove(page, 500, 300, 600, 400);
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        const cookies = await page.cookies();
        fs.writeFileSync('./torn_session.json', JSON.stringify(cookies));
        console.log('[Bot] ✅ تم تسجيل الدخول بنجاح');
    } catch (e) {
        console.error('[Bot] ❌ فشل تسجيل الدخول:', e.message);
        throw e;
    }
}

// ========== البحث عن النفايات ==========
async function performSearch(page) {
    console.log('[Bot] 🔍 جاري البحث...');
    try {
        await humanCursorMove(page, 400, 300, 450, 350);
        await page.waitForTimeout(randomDelay(500, 1500));
      
        if (Math.random() < 0.05) {
            await humanCursorMove(page, 450, 350, 440, 340);
            await page.waitForTimeout(500);
            await humanCursorMove(page, 440, 340, 450, 350);
        }

        const results = await page.evaluate(() => {
            const items = [];
            document.querySelectorAll('.waste-result, .loot-entry').forEach((el, i) => {
                const text = el.innerText || '';
                const valMatch = text.match(/\$([\d,]+)/);
                if (valMatch) {
                    items.push({
                        id: `waste_${i}_${Date.now()}`,
                        name: text.substring(0, 50).trim(),
                        value: parseInt(valMatch[1].replace(/,/g, ''), 10)
                    });
                }
            });
            return items;
        });

        results.forEach(item => {
            if (item.value >= 10000) {
                console.log(`[Bot] 💰 نفايات قيمة: $${item.value.toLocaleString()} - ${item.name}`);
            }
            // حفظ في ملف
            fs.appendFileSync('./waste_logs.txt', 
                `[${new Date().toISOString()}] $${item.value} - ${item.name}\n`
            );
        });

        console.log(`[Bot] ✅ تم العثور على ${results.length} عنصر`);
    } catch (e) {
        console.error('[Bot] ❌ فشل البحث:', e.message);
        await page.waitForTimeout(15000);
    }
}

// ========== الحلقة الرئيسية ==========
async function mainLoop(page) {
    let count = 0;
    console.log('[Bot] 🚀 بدأ التشغيل التلقائي');
  
    while (count < CONFIG.DAILY_LIMIT) {
        await performSearch(page);
        count++;
        const wait = randomDelay(CONFIG.SEARCH_INTERVAL_MIN, CONFIG.SEARCH_INTERVAL_MAX);
        console.log(`[Bot] ⏳ انتظار ${wait} ثانية...`);
        await page.waitForTimeout(wait * 1000);
    }
  
    console.log('[Bot] 📊 تم الوصول للحد اليومي، انتهاء الجلسة');
}

// ========== بدء التشغيل ==========
(async () => {
    console.log('='.repeat(50));
    console.log('  Torn Waste Bot - مجاني 100%');
    console.log('='.repeat(50));

    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--window-size=1920,1080',
            '--user-agent=Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36'
        ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    try {
        await loginTorn(page);
        await page.goto(CONFIG.WASTE_URL, { waitUntil: 'networkidle2' });
        await page.waitForTimeout(3000);
        await mainLoop(page);
    } catch (e) {
        console.error('[Bot] 💥 خطأ فادح:', e);
    } finally {
        await browser.close();
    }
})();
const https = require('https');
const fs = require('fs');
const API_KEY = process.env.TORN_API_KEY;

function fetchTorn(endpoint) {
    return new Promise((resolve, reject) => {
        https.get(`https://api.torn.com/${endpoint}&key=${API_KEY}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
}

(async () => {
    console.log('== Torn Bot ==');
    const data = await fetchTorn('user/?selections=inventory,cooldowns');
    fs.appendFileSync('./waste_logs.txt',
        `[${new Date().toISOString()}] ${JSON.stringify(data)}\n`
    );
    console.log('تم:', JSON.stringify(data, null, 2));
})();
