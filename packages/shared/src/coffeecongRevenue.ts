/** Admin revenue and the DB cost view use the same stored daily amounts (KRW). */
export interface CoffeecongRevenueRow {
 date:string; applovinRevenueKrw:number; applovinRevenueUsd:number;
 adpopcornRevenueKrw:number; tnkRevenueKrw:number;
 iapGoogleRevenueKrw:number; iapAppleRevenueKrw:number;
 tossRevenueKrw:number; coupangRevenueKrw:number; sazooRevenueKrw:number;
 revenueTotalKrw:number; giftcardPayoutKrw:number;
 googleAdsCostKrw:number|null; googleAdsSyncedAt:string|null;
 /** After gift-card payout and Google spend; excludes other operating costs. */
 profitKrw:number|null; status:string; syncedAt:string;
}
export interface CoffeecongRevenueResponse {
 items:CoffeecongRevenueRow[]; total:number; page:number; totalPages:number;
}
