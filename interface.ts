export interface MarketEntry {
    _id?: number;
    duration: number;
    is_buy_order: boolean;
    issued: string;
    location_id: number;
    min_volume: number;
    order_id: number;
    price: number;
    range: string;
    system_id: number;
    type_id: number;
    volume_remain: number;
    volume_total: number;
}
export interface IDInfo {
    _id: number;
    name: Record<string, string>;
    alias?: string[];
}