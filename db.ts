import { MongoClient, WriteConcern } from 'mongodb';
import { dburi, dbName } from './config';
import { IDInfo, MarketEntry } from './interface';

export async function connect() {
    const client = await MongoClient.connect(dburi, { writeConcern: new WriteConcern('majority') });
    const db = client.db(dbName);
    const collId = db.collection<IDInfo>('ids');
    const collOrder = db.collection<MarketEntry>('orders');
    console.log('Connected to database');
    return { collId, collOrder };
}
