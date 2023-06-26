import { dbName, dburi } from './config';
import { MarketEntry } from './interface';
import { MongoClient, WriteConcern } from 'mongodb';

function formatNumber(num: number) {
    return num.toFixed(num > 10000 ? 0 : 2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatSeconds(seconds: number) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor(seconds % 86400 / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
}

async function main() {
    const client = await MongoClient.connect(dburi, { writeConcern: new WriteConcern('majority') });
    const db = client.db(dbName);
    const coll = db.collection<MarketEntry>('orders');
    const collId = db.collection<any>('ids');

    async function printOrder(order: MarketEntry) {
        const pos = await collId.findOne({ _id: order.system_id });
        console.log(`[${order.is_buy_order ? '买' : '卖'}] ${order.volume_remain.toString().padStart(8)} \
${formatNumber(order.price).padStart(13)} \
${pos?.name?.zh?.padEnd(20)} \
${formatSeconds(((new Date(order.issued).getTime() + order.duration * 24 * 3600 * 1000) - Date.now()) / 1000).padEnd(12)} `);
    }

    async function showOrders(itemName) {
        const { _id, name } = await db.collection('ids').findOne({ alias: itemName });
        console.log(_id, name.zh, name.en);
        if (!_id) return null;
        const sellInfo = await coll.find({ type_id: _id, is_buy_order: false }).sort({ price: 1 }).limit(8).toArray();
        console.log('卖单：');
        for (const c of sellInfo) await printOrder(c);
        const buyInfo = await coll.find({ type_id: _id, is_buy_order: true }).sort({ price: -1 }).limit(8).toArray();
        console.log('收单：');
        for (const c of buyInfo) await printOrder(c);
    }
    await showOrders(process.argv[2] || 'Tritanium');
    process.exit(0);
}

main();