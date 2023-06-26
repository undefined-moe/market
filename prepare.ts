import yaml from 'js-yaml';
import fs from 'fs';
import { MongoClient, WriteConcern } from 'mongodb';
import {dburi,dbName}from './config';

async function main() {
    const client = await MongoClient.connect(dburi, { writeConcern: new WriteConcern('majority') });
    const db = client.db(dbName);
    const coll = db.collection<any>('ids');
    console.log('Connected to database');
    console.log('Loading static data...');
    const items = yaml.load(fs.readFileSync('./sde/fsd/typeIDs.yaml', 'utf-8'));
    const data: any[] = [];
    for (const key in items) {
        data.push({ _id: +key, name: items[key].name, alias: Object.values(items[key].name) });
    }
    console.log('Inserting items...');
    await coll.insertMany(data, { ordered: false }).catch(() => { });
    console.log('Loading regions...');
    const constellations = fs.readdirSync('./sde/fsd/universe/eve/TheForge');
    for (const constellation of constellations) {
        if (constellation.endsWith('.staticdata')) continue;
        const solarsystems = fs.readdirSync('./sde/fsd/universe/eve/TheForge/' + constellation);
        for (const solarsystem of solarsystems) {
            if (solarsystem.endsWith('.staticdata')) continue;
            const system = yaml.load(fs.readFileSync('./sde/fsd/universe/eve/TheForge/' + constellation + '/' + solarsystem + '/solarsystem.staticdata', 'utf-8'));
            // TODO: translations
            await coll.updateOne({ _id: system.solarSystemID }, { $set: { name: { en: solarsystem, zh: solarsystem }, alias: [solarsystem] } }, { upsert: true });
        }
    }

    process.exit(0);
}

main();