import superagent from 'superagent';
import _ from 'lodash';
import proxy from 'superagent-proxy';
import { Collection, MongoClient, WriteConcern } from 'mongodb';
import { MarketEntry } from './interface';
import { clientId, callback, secretKey, dburi, dbName } from './config';

function formatNumber(num: number) {
    return num.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatSeconds(seconds: number) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor(seconds % 86400 / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
}

const queue: number[] = [];

async function main() {
    const client = await MongoClient.connect(dburi, { writeConcern: new WriteConcern('majority') });
    const db = client.db(dbName);
    console.log('Connected to database');
    const coll: Collection<MarketEntry> = db.collection('orders');
    await coll.createIndex({ type_id: 1, is_buy_order: 1, price: 1 }, {});
    const collId = db.collection<any>('ids');


    const credentials: any = (await db.collection('credentials').findOne({ _id: 'c' })) || {};
    proxy(superagent);

    async function refresh() {
        const res = await superagent.post('https://login.eveonline.com/v2/oauth/token')
            .proxy(process.env.https_proxy)
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .set('Authorization', 'Basic ' + Buffer.from(`${clientId}:${secretKey}`).toString('base64'))
            .send('grant_type=refresh_token&refresh_token=' + credentials['refresh_token']);
        console.log(res.body);
        credentials['access_token'] = res.body.access_token;
        credentials['refresh_token'] = res.body.refresh_token;
        await db.collection('credentials').updateOne({ _id: 'c' }, { $set: credentials }, { upsert: true });
    }

    async function auth() {
        console.log(`https://login.eveonline.com/v2/oauth/authorize/?response_type=code&redirect_uri=${encodeURIComponent(callback)}&client_id=${clientId}&scope=esi-ui.open_window.v1&state=1`);
        const code = await new Promise((resolve, reject) => {
            function cb(data) {
                process.stdin.off('data', cb);
                resolve(data.toString().trim());
            }
            process.stdin.on('data', cb);
        });
        console.log('Code: ', code);
        const res = await superagent.post('https://login.eveonline.com/v2/oauth/token')
            .proxy(process.env.https_proxy)
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .set('Authorization', 'Basic ' + Buffer.from(`${clientId}:${secretKey}`).toString('base64'))
            .send('grant_type=authorization_code&code=' + code);
        console.log(res.body);
        credentials['access_token'] = res.body.access_token;
        credentials['refresh_token'] = res.body.refresh_token;
        await db.collection('credentials').updateOne({ _id: 'c' }, { $set: credentials }, { upsert: true });
    }
    setInterval(refresh, 1000000);
    refresh();

    async function openClient(id) {
        await superagent.post(`https://esi.evetech.net/v1/ui/openwindow/marketdetails/?type_id=` + id)
            .set('User-Agent', 'eve-market')
            .set('Authorization', 'Bearer ' + credentials['access_token'])
    }


    async function printOrder(order: MarketEntry) {
        const pos = await collId.findOne({ _id: order.system_id });
        console.log(`[${order.is_buy_order ? '买' : '卖'}] ${order.volume_remain.toString().padStart(10)} \
${formatNumber(order.price).padStart(13)}ISK \
${pos?.name?.zh?.padEnd(20)} \
${formatSeconds(((new Date(order.issued).getTime() + order.duration * 24 * 3600 * 1000) - Date.now()) / 1000).padEnd(12)} `);
    }

    async function showOrders(itemName) {
        const { _id, name } = await db.collection('ids').findOne({ $or: [{ alias: itemName }, { _id: itemName }] });
        console.log(_id, name.zh, name.en);
        if (!_id) return null;
        const sellInfo = await coll.find({ type_id: _id, is_buy_order: false, volume_remain: { $gt: 0 } }).sort({ price: 1 }).limit(8).toArray();
        console.log('卖单：');
        for (const c of sellInfo) await printOrder(c);
        const buyInfo = await coll.find({ type_id: _id, is_buy_order: true, volume_remain: { $gt: 0 }}).sort({ price: -1 }).limit(8).toArray();
        console.log('收单：');
        for (const c of buyInfo) await printOrder(c);
    }

    setInterval(async () => {
        if (queue.length) {
            const i = queue.shift();
            try {
                await openClient(i);
                await showOrders(i);
            } catch (e) {
                console.error(e);
            }
        }
    }, 15000);

    async function doCheckOrder(order: MarketEntry) {
        if (order.is_buy_order) {
            const [cheaperOrder, itemInfo] = await Promise.all([
                coll.findOne({ type_id: order.type_id, is_buy_order: false, volume_remain: { $gt: 0 }, price: { $lt: order.price } }),
                collId.findOne({ _id: order.type_id }),
            ]);

        } else {
            const [cheaperOrder, itemInfo] = await Promise.all([
                coll.findOne({ type_id: order.type_id, is_buy_order: false, volume_remain: { $gt: 0 }, price: { $lt: order.price } }),
                collId.findOne({ _id: order.type_id }),
            ]);
            if (cheaperOrder) return;
            if (itemInfo?.name.en.endsWith('SKIN')) return;
            if (itemInfo?.name.en.startsWith('Men\'s')) return;
            if (itemInfo?.name.en.startsWith('Women\'s')) return;
            const [sec, ...rem] = await coll.find({ type_id: order.type_id, volume_remain: { $gt: 0 }, is_buy_order: false, _id: { $ne: order.order_id } }).sort({ price: 1 }).limit(8).toArray();
            if (rem.length > 5 && sec && order.price < 0.8 * sec.price) queue.push(order.type_id);
        }
    }

    async function reloadOrders(regionId, page) {
        console.log('Reloading orders in region %d for page %d', regionId, page);
        const res = await superagent
            .get(`https://esi.evetech.net/v1/markets/${regionId}/orders/?page=` + page)
            .timeout(10000)
            .retry(3);
        const old = await coll.find({ _id: { $in: res.body.map(order => order.order_id) } }).toArray();
        for (const order of res.body) {
            const oldOrder: any = old.find(i => i._id === order.order_id);
            if (oldOrder) {
                delete oldOrder._id;
                if (_.isEqual(oldOrder, order)) continue;
            }
            const r = await coll.updateOne({ _id: order.order_id }, { $set: order }, { upsert: true });
            if (new Date(order.issued).getTime() > Date.now() - 20 * 60 * 1000) continue;
            if (order.volume_remain === 0) continue;
            doCheckOrder(order);
        }
        return res.body.length;
    }
    if (!credentials?.access_token) await auth();
    for (let i = 1; i <= 1000; i++) {
        try {
            const t = await reloadOrders(10000002, i); // The Forge
            if (t < 1000) i = 0;
        } catch (e) {
            console.error(e);
        }
    }
}

main();