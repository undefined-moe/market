import yaml from 'js-yaml';
import fs from 'fs';
import { connect } from './db';

async function main() {
    const { collId: coll } = await connect();

    console.log('Loading static data...');
    const items = yaml.load(fs.readFileSync('./sde/fsd/typeIDs.yaml', 'utf-8'));
    let data: any[] = [];
    for (const key in items) {
        data.push({
            _id: +key,
            name: items[key].name,
            alias: Object.values(items[key].name).concat(Object.values(items[key].name).map(i => i.toLowerCase())),
            groupID: items[key].groupID,
            iconID: items[key].iconID,
            marketGroupID: items[key].marketGroupID,
            mass: items[key].mass,
            volume: items[key].volume,
        });
    }
    await coll.deleteMany({});
    console.log('Inserting items...');
    await coll.insertMany(data, { ordered: false }).catch(() => { });
    data = [];
    console.log('Loading regions...');
    const constellations = fs.readdirSync('./sde/fsd/universe/eve/TheForge');
    for (const constellation of constellations) {
        if (constellation.endsWith('.staticdata')) continue;
        const solarsystems = fs.readdirSync('./sde/fsd/universe/eve/TheForge/' + constellation);
        for (const solarsystem of solarsystems) {
            if (solarsystem.endsWith('.staticdata')) continue;
            const system = yaml.load(fs.readFileSync('./sde/fsd/universe/eve/TheForge/' + constellation + '/' + solarsystem + '/solarsystem.staticdata', 'utf-8'));
            // TODO: translations
            await coll.updateOne(
                { _id: system.solarSystemID },
                { $set: { name: { en: solarsystem, zh: solarsystem }, alias: [solarsystem], sec: system.security } },
                { upsert: true }
            );
        }
    }
    console.log('Loading item groups...');
    const groups = yaml.load(fs.readFileSync('./sde/fsd/groupIDs.yaml', 'utf-8'));
    for (const key in groups) {
        await coll.updateOne({ _id: +key }, { $set: { name: groups[key].name } }, { upsert: true });
    }
    console.log('Loading stations...');
    const names = yaml.load(fs.readFileSync('./sde/bsd/invNames.yaml', 'utf-8'));
    await coll.insertMany(names.map(l => ({ _id: l.itemID, name: { zh: l.itemName, en: l.itemName }, alias: [l.itemName] }), { ordered: false }).catch(() => { });
    process.exit(0);
}

main();