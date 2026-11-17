/**
 * Furniture rules as data. Sizes are in 0.5 m floor cells (w across, d deep) and local +z is the front.
 * `needs` lists local points that must stay reachable on foot. How each piece looks lives in rendering/furnitureModels.js.
 */
export const FURNITURE = {
  makeupVanity: { price: 1800, comfort: 1, w: 3, d: 3, minTier: 1, max: 2, requires: 'seniors', needs: [[0, 1]], work: { guest: [0, .35, 2], h: .46, staff: [.62, .3, 3] } },
  nailDesk: { price: 1400, comfort: 1, w: 3, d: 3, minTier: 1, max: 2, requires: 'seniors', needs: [[0, 1]], work: { guest: [0, .5, 2], h: .42, staff: [0, -.5, 0], staffSits: true } },
  // `chairs` lists each styling chair on a piece as [x, z, quarter turns] in its own frame.
  // A styling chair is a free-standing seat with its own mirror and partitions; placed side by side they form a styling island.
  station: { price: 300, comfort: 0, w: 3, d: 3, needs: [[0, 1]], chairs: [[0, 0, 0]], light: { at: [0, 1.9, -.45], power: .45 } },
  // The styling island: a glass table where colour and perm clients sit under processors while the product works.
  processIsland: { price: 1200, comfort: 2, w: 6, d: 4, processing: true, seatH: .5, max: [1, 1, 2, 2, 3, 3], seats: [[-.75, .55, 0], [.75, .55, 0], [-.75, -.55, 2], [.75, -.55, 2]] },
  // A ready-made three-seat chair set, from saves made before chairs could be lined up into one. No longer sold.
  island: { price: 1500, comfort: 2, w: 9, d: 3, legacy: true, needs: [[-1.5, 1], [0, 1], [1.5, 1]], chairs: [[-1.5, 0, 0], [0, 0, 0], [1.5, 0, 0]] },
  wardrobe: { price: 350, comfort: 1, w: 2, d: 1, needs: [[0, .6]], legacy: true },
  // A waist-high oak planter that divides the floor into areas without blocking the view.
  partition: { price: 250, comfort: 1, w: 3, d: 1 },
  // A free-standing table of hair products in the middle of the floor.
  displayTable: { price: 300, comfort: 1, w: 2, d: 2, dailySales: 30 },
  desk: { price: 500, comfort: 0, w: 3, d: 2, essential: true, needs: [[0, .75]] },
  bench: { price: 350, comfort: 1, w: 4, d: 1, seatH: .44, seats: [[-.65, .1], [0, .1], [.65, .1]] },
  bench2: { price: 250, comfort: 1, w: 3, d: 1, seatH: .44, seats: [[-.3, .1], [.3, .1]] },
  sofa: { price: 400, comfort: 1, w: 2, d: 1, seats: [[-.24, 0], [.24, 0]] },
  loungeRug: { price: 150, comfort: 1, w: 4, d: 2, walkable: true },
  rug: { price: 120, comfort: 1, walkable: true, legacy: true },
  mat: { price: 40, comfort: 0, w: 2, d: 1, walkable: true, legacy: true },
  plant: { price: 80, comfort: 1 },
  // A small table between the waiting benches, with magazines and flowers.
  sideTable: { price: 120, comfort: 1, legacy: true },
  mirror: { price: 150, comfort: 2, legacy: true },
  lamp: { price: 200, comfort: 2, light: { at: [0, 1.25, 0], power: 1 } },
  bookcase: { price: 180, comfort: 1, w: 2, d: 1, legacy: true },
  shelf: { price: 250, comfort: 1, dailySales: 30 },
  dryer: { price: 300, comfort: 1, w: 2, d: 2, legacy: true },
  // Practical pieces, each doing one job. Tools (speedFor, satisfaction) serve only the chairs within reach (see Surroundings).
  kiosk: { price: 600, comfort: 0, max: 1, needs: [[0, .6]], patience: 1.1 },
  towelStation: { price: 700, comfort: 0, w: 2, d: 1, max: [1, 1, 2, 2, 3, 3], speedBonus: .15, speedFor: 'shampoo' },
  sterilizer: { price: 450, comfort: 0, max: [1, 1, 2, 2, 3, 3], satisfaction: .02 },
  stockroom: { price: 1200, comfort: 0, w: 2, d: 2, minTier: 1, max: 1, materials: .8 },
  cctv: { price: 400, comfort: 0, max: 1, catchDasher: .8 },
  airPurifier: { price: 650, comfort: 1, max: 1, cleanAir: .5 },
  sharpener: { price: 500, comfort: 0, max: [1, 1, 2, 2, 3, 3], speedBonus: .1, speedFor: 'cut' },
  digitalPerm: { price: 1100, comfort: 0, max: [1, 1, 2, 2, 3, 3], speedBonus: .15, speedFor: 'wave', requires: 'perm' },
  proDryer: { price: 600, comfort: 0, max: [1, 1, 2, 2, 3, 3], speedBonus: .15, speedFor: 'dry' },
  scalpScanner: { price: 900, comfort: 0, max: 1, treatment: .15, requires: 'treatment' },
  champagneFridge: { price: 800, comfort: 1, max: 1, vipPay: 1.1, requires: 'vip' },
  chargingStation: { price: 250, comfort: 0, max: 1, patience: 1.05 },
  signboard: { price: 350, comfort: 0, max: 1, demand: 1.05 },
  neonSign: { price: 800, comfort: 1, max: 1, dailyFollowers: 20 },
  vendingMachine: { price: 700, comfort: 0, max: 1, dailySales: 40, needs: [[0, .6]] },
  massageChair: { price: 1300, comfort: 0, w: 2, d: 1, minTier: 1, max: 1, staffTire: .75 },
  aromaDiffuser: { price: 400, comfort: 1, max: 1, calmStress: .5 },
  // `vacuum`: bits of hair it clears from the floor per game hour.
  robotVacuum: { price: 900, comfort: 0, max: 1, vacuum: 30 },
  // A shampoo booth: basin, reclining chair and oak screens. Clients are washed here before their chair.
  shampooBooth: { price: 900, comfort: 2, w: 3, d: 3, max: [3, 3, 3, 4, 5, 6], needs: [[0, 1]] },
  // Pieces that open as the salon grows (`minTier` is the salon size).
  spaBooth: { price: 1600, comfort: 2, w: 3, d: 3, minTier: 1, max: [0, 1, 1, 2, 2, 3], needs: [[0, 1]] },
  vipRoom: { price: 2200, comfort: 2, w: 4, d: 3, minTier: 2, max: [0, 0, 1, 1, 2, 2], needs: [[0, 1]], chairs: [[0, 0, 0]] },
  photoZone: { price: 900, comfort: 1, w: 2, d: 2, minTier: 2, max: 1, needs: [[0, .75]], light: { at: [.38, 1.4, .33], power: .7, color: 0xfff6e8 } },
  academy: { price: 2500, comfort: 0, w: 3, d: 2, minTier: 3, max: 1, needs: [[0, .75]] },
  cafeBar: { price: 3000, comfort: 2, w: 3, d: 1, minTier: 4, max: 1, dailySales: 80, needs: [[0, .6]], light: { at: [0, 1.1, .3], power: .4 } },
  // Older pieces, kept so earlier saves still load; no longer sold.
  basin: { price: 600, comfort: 1, w: 2, d: 2, needs: [[.25, .75], [-.45, .75]], legacy: true },
  shampoo: { price: 800, comfort: 1, speedBonus: .1, speedFor: 'shampoo', legacy: true },
  colour: { price: 900, comfort: 1, speedBonus: .05, speedFor: 'colour', requires: 'colour' },
  staffRoom: { price: 1000, comfort: 0, w: 2, d: 1, staffRest: true, requires: 'staff' },
  coffeeBar: { price: 700, comfort: 1, w: 2, d: 1 },
};
/** How far in front of a seat people stop before sitting down. */
export const SEAT_APPROACH = .5;
/** Where a client stops before sitting on seat [x, z, quarter turns], in the piece's own frame: in front of the seat. */
export const seatApproach = ([x, z, t = 0]) => [x + Math.round(Math.sin(t * Math.PI / 2)) * SEAT_APPROACH, z + Math.round(Math.cos(t * Math.PI / 2)) * SEAT_APPROACH];
/** Pieces sold in the furniture list. Styling chairs have their own button; the desk cannot be bought twice. */
export const FURNITURE_IDS = Object.keys(FURNITURE).filter(id => id !== 'station' && id !== 'desk' && !FURNITURE[id].legacy);
export const CHAIR_PRICE = FURNITURE.station.price;
/** Shop and inventory categories: services, the front of house, running the salon, selling and promotion, and decoration. */
export const CATEGORIES = {
  service: ['makeupVanity', 'nailDesk', 'station', 'processIsland', 'shampooBooth', 'spaBooth', 'vipRoom', 'colour', 'towelStation', 'sterilizer', 'sharpener', 'digitalPerm', 'proDryer', 'scalpScanner', 'island', 'basin', 'shampoo', 'dryer'],
  waiting: ['desk', 'bench', 'bench2', 'sofa', 'kiosk', 'chargingStation', 'champagneFridge', 'coffeeBar', 'cafeBar', 'wardrobe'],
  ops: ['staffRoom', 'academy', 'stockroom', 'cctv', 'airPurifier', 'massageChair', 'aromaDiffuser', 'robotVacuum'],
  sales: ['displayTable', 'shelf', 'vendingMachine', 'photoZone', 'signboard', 'neonSign'],
  deco: ['partition', 'loungeRug', 'plant', 'lamp', 'rug', 'mat', 'sideTable', 'mirror', 'bookcase'],
};
export const categoryOf = id => Object.keys(CATEGORIES).find(k => CATEGORIES[k].includes(id)) || 'deco';
export const chairsOn = id => FURNITURE[id].chairs ? FURNITURE[id].chairs.length : 0;
/** The second salon grows twice: a back room, then the shop beside it. */
export const BRANCH_EXPANSIONS = [{ cost: 20000, requires: 'branches' }, { cost: 38000, requires: 'branchGrow' }];
export const EXPANSIONS = [{ cost: 2000, requires: 'chairs' }, { cost: 5500, requires: 'expansion' }, { cost: 11000, requires: 'annex' }, { cost: 18000, requires: 'branches' }, { cost: 28000, requires: 'branches' }];
