import superagent from 'superagent';
import yaml from 'js-yaml';
import fs from 'fs';
import { Collection, MongoClient, WriteConcern } from 'mongodb';
import { MarketEntry } from './interface';
import { dbName, dburi } from './config';

async function main() {
    const client = await MongoClient.connect(dburi, { writeConcern: new WriteConcern('majority') });
    const db = client.db(dbName);
    console.log('Connected to database');
    const coll: Collection<MarketEntry> = db.collection('orders');

    async function reloadOrders(regionId, page) {
        console.log('Reloading orders in region %d for page %d', regionId, page);
        const res = await superagent.get(`https://esi.evetech.net/v1/markets/${regionId}/orders/?page=` + page);
        const ids = res.body.map(order => order.order_id);
        const del = await coll.deleteMany({ _id: { $in: ids } });
        if (del.deletedCount) console.log('Deleted %d orders', del.deletedCount);
        await coll.insertMany(res.body.map(i => ({ _id: i.order_id, ...i })));
        console.log('Inserted %d orders', res.body.length);
        return res.body.length - del.deletedCount;
    }
    for (let i = 1; i <= 1000; i++) await reloadOrders(10000002, i); // The Forge
}

main();