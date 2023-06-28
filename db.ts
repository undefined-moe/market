import { MongoClient, WriteConcern } from 'mongodb';
import { dburi, dbName } from './config';
import { IDInfo, MarketEntry } from './interface';

export async function connect() {
    const client = await MongoClient.connect(dburi, { writeConcern: new WriteConcern('majority') });
    const db = client.db(dbName);
    const collId = db.collection<IDInfo>('ids');
    const collOrder = db.collection<MarketEntry>('orders');
    const collGroup = db.collection('groups');
    const collStation = db.collection('stations');
    const collMarketGroup = db.collection('marketGroup');
    console.log('Connected to database');
    return { collId, collOrder, collGroup, collStation, collMarketGroup };
}
