export enum PlayerStat {
    STAT_HEALTH_ICON = 0,
    STAT_HEALTH = 1,
    STAT_AMMO_ICON = 2,
    STAT_AMMO = 3,
    STAT_ARMOR_ICON = 4,
    STAT_ARMOR = 5,
    STAT_SELECTED_ICON = 6,
    STAT_PICKUP_ICON = 7,
    STAT_PICKUP_STRING = 8,
    STAT_TIMER_ICON = 9,
    STAT_TIMER = 10,
    STAT_HELPICON = 11,
    STAT_SELECTED_ITEM = 12,
    STAT_LAYOUTS = 13,
    STAT_FRAGS = 14,
    STAT_FLASHES = 15,
    STAT_CHASE = 16,
    STAT_SPECTATOR = 17,
    // ... CTF stats omitted for brevity ...
}

export interface PlayerState {
    stats: number[];
    blend: [number, number, number, number];
    // ... other fields
}
