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
