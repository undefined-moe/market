import { dbName, dburi } from './config';
import { IDInfo, MarketEntry } from './interface';
import Koa from 'koa';
import yaml from 'js-yaml';
import { MongoClient, WriteConcern } from 'mongodb';
import React from 'react';
import { connect } from './db';
import ReactDOM from 'react-dom/server';

const app = new Koa();

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


function Render(props) {
    return (<div className="market-detail">
        <link rel="stylesheet" href="https://evemarketer.com/static/css/app.3174c25aca0b4df5853d.css" />
        <div className="item-header">
            <div className="item-icon"><img src={"https://imageserver.eveonline.com/Type/" + props.item._id + "_64.png"} /></div>
            <div className="item-name">
                <ul className="item-group">
                    <li><span><span>{props.itemGroup.name.zh}</span></span></li>
                    {/* <li><span><span>{props.itemMarketGroup.name.zh}</span></span></li> */}
                </ul>
                <h2>{props.item.name.zh}</h2>
                <p className="item-volume">{props.item.volume} m3</p>
            </div>
            <div className="spacer"></div>
            {/* <table className="item-stats">
                <thead>
                    <tr>
                        <th></th>
                        <th>5%</th>
                        <th>加权平均</th>
                        <th>中位数</th>
                        <th>量</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>销售</td>
                        <td className="number">1.02 M<span className="mobile-muted"> ISK</span></td>
                        <td className="number">1.65 M<span className="mobile-muted"> ISK</span></td>
                        <td className="number">1.36 M<span className="mobile-muted"> ISK</span></td>
                        <td className="number">8,681</td>
                    </tr>
                    <tr>
                        <td>购买</td>
                        <td className="number">956.57K<span className="mobile-muted"> ISK</span></td>
                        <td className="number">185.66K<span className="mobile-muted"> ISK</span></td>
                        <td className="number">16.00K<span className="mobile-muted"> ISK</span></td>
                        <td className="number">11,050</td>
                    </tr>
                </tbody>
            </table> */}
        </div>
        <div className="tab-container">
            <ul className="tabs">
                <li className="active"><h4><a>卖家</a></h4></li>
            </ul>
            <div className="tab-contents">
                <div className="tab-content active">
                    <table className="table">
                        <thead>
                            <tr>
                                {/* <th className="region">地区 <span className="arrow"></span></th> */}
                                <th className="quantity">数量 <span className="arrow"></span></th>
                                <th className="price">价钱 <span className="arrow asc"></span></th>
                                <th className="location">位置 <span className="arrow"></span></th>
                                <th className="expires_in">过期日期在 <span className="arrow"></span></th>
                                {/* <th className="received_at">收到了 <span className="arrow"></span></th> */}
                            </tr>
                        </thead>
                        <tbody>
                            {props.sellInfo.map(order => {
                                const s = props.systemInfo.find(i => i._id === order.system_id);
                                const st = props.stationInfo.find(i => i._id === order.location_id);
                                return (<tr>
                                    {/* <td className="region">多美</td> */}
                                    <td className="number volume-remain">{order.volume_remain}</td>
                                    <td className="number price">{formatNumber(order.price)} ISK</td>
                                    <td className="location"><span><span className={"system-security sec" + (s.sec / 10).toFixed(2).split('.')[1]}>{s.sec.toFixed(1)}</span> {st ? st.name.zh : s.name.zh}</span></td>
                                    <td className="number expires">{formatSeconds(((new Date(order.issued).getTime() + order.duration * 24 * 3600 * 1000) - Date.now()) / 1000)}</td>
                                    {/* <td className="number received_at">1分 前 </td> */}
                                </tr>)
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        <div className="tab-container">
            <ul className="tabs">
                <li className="active"><h4><a>买家</a></h4></li>
            </ul>
            <div className="tab-contents">
                <div className="tab-content active">
                    <table className="table">
                        <thead>
                            <tr>
                                {/* <th className="region">地区 <span className="arrow"></span></th> */}
                                <th className="quantity">数量 <span className="arrow"></span></th>
                                <th className="price">价钱 <span className="arrow asc"></span></th>
                                <th className="location">位置 <span className="arrow"></span></th>
                                <th className="expires_in">过期日期在 <span className="arrow"></span></th>
                                {/* <th className="received_at">收到了 <span className="arrow"></span></th> */}
                            </tr>
                        </thead>
                        <tbody>
                            {props.buyInfo.map(order => {
                                const s = props.systemInfo.find(i => i._id === order.system_id);
                                const st = props.stationInfo.find(i => i._id === order.location_id);
                                return (<tr>
                                    {/* <td className="region">多美</td> */}
                                    <td className="number volume-remain">{order.volume_remain}</td>
                                    <td className="number price">{formatNumber(order.price)} ISK</td>
                                    <td className="location"><span><span className={"system-security sec" + (s.sec / 10).toFixed(2).split('.')[1]}>{s.sec.toFixed(1)}</span> {st ? st.name.zh : s.name.zh}</span></td>
                                    <td className="number expires">{formatSeconds(((new Date(order.issued).getTime() + order.duration * 24 * 3600 * 1000) - Date.now()) / 1000)}</td>
                                    {/* <td className="number received_at">1分 前 </td> */}
                                </tr>)
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>);
}

async function main() {
    const { collOrder: coll, collId, collGroup, collStation, collMarketGroup } = await connect();
    app.use(async (ctx, next) => {
        console.log(ctx.path);
        const input = decodeURIComponent(ctx.path.slice(1)).toLowerCase();
        let item = await collId.findOne({ alias: input });
        if (!item) item = await collId.findOne({ alias: { $regex: input } });
        if (!item) return null;
        const sellInfo = await coll.find({ type_id: item._id, is_buy_order: false, volume_remain: { $gt: 0 } }).sort({ price: 1 }).limit(8).toArray();
        const buyInfo = await coll.find({ type_id: item._id, is_buy_order: true, volume_remain: { $gt: 0 } }).sort({ price: -1 }).limit(8).toArray();
        const systems = Array.from(new Set([...sellInfo, ...buyInfo].map(i => i.system_id)));
        const stations = Array.from(new Set([...sellInfo, ...buyInfo].map(i => i.location_id)));
        const systemInfo = await collId.find({ _id: { $in: systems } }).toArray();
        const stationInfo = await collStation.find({ _id: { $in: stations } }).toArray();
        const group = await collGroup.findOne({ _id: item.groupID });
        const marketGroup = await collMarketGroup.findOne({ _id: item.marketGroupID });
        ctx.body = ReactDOM.renderToStaticMarkup(<Render
            item={item}
            itemGroup={group}
            itemMarketGroup={marketGroup}
            sellInfo={sellInfo}
            buyInfo={buyInfo}
            systemInfo={systemInfo}
            stationInfo={stationInfo}
        />);
    });

    app.listen(2583);
}

main();