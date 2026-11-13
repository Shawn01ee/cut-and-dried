/**
 * Furniture rules as data. Sizes are in 0.5 m floor cells (w across, d deep) and local +z is the front.
 * `needs` lists local points that must stay reachable on foot. How each piece looks lives in rendering/furnitureModels.js.
 */
export const FURNITURE = {
  // `chairs` lists each styling chair on a piece as [x, z, quarter turns] in its own frame.
  station: { price: 300, comfort: 0, w: 3, d: 3, needs: [[0, 1]], chairs: [[0, 0, 0]] },
  // A long glass-block styling table with a blue top: two chairs on each side.
  island: { price: 2400, comfort: 2, w: 6, d: 4, requires: 'chairs', needs: [[-.75, 1.2], [.75, 1.2], [-.75, -1.2], [.75, -1.2]], chairs: [[-.75, .1, 0], [.75, .1, 0], [-.75, -.1, 2], [.75, -.1, 2]] },
  wardrobe: { price: 350, comfort: 1, w: 2, d: 1, needs: [[0, .6]] },
  desk: { price: 500, comfort: 0, w: 3, d: 2, essential: true, needs: [[0, .75]] },
  bench: { price: 350, comfort: 1, w: 4, d: 1, seatH: .44, seats: [[-.65, .1], [0, .1], [.65, .1]] },
  bench2: { price: 250, comfort: 1, w: 3, d: 1, seatH: .44, seats: [[-.3, .1], [.3, .1]] },
  sofa: { price: 400, comfort: 1, w: 2, d: 1, seats: [[-.24, 0], [.24, 0]] },
  loungeRug: { price: 150, comfort: 1, w: 4, d: 2, walkable: true },
  rug: { price: 120, comfort: 1, walkable: true },
  mat: { price: 40, comfort: 0, w: 2, d: 1, walkable: true },
  plant: { price: 80, comfort: 1 },
  mirror: { price: 150, comfort: 2 },
  lamp: { price: 200, comfort: 2 },
  bookcase: { price: 180, comfort: 1, w: 2, d: 1 },
  shelf: { price: 250, comfort: 1, dailySales: 30 },
  dryer: { price: 300, comfort: 1, w: 2, d: 2 },
  // A shampoo booth: basin, reclining chair and oak screens. Clients are washed here before their chair.
  shampooBooth: { price: 900, comfort: 2, w: 3, d: 3, max: 3, needs: [[0, 1]] },
  // Older pieces, kept so earlier saves still load; no longer sold.
  basin: { price: 600, comfort: 1, w: 2, d: 2, needs: [[.25, .75], [-.45, .75]], legacy: true },
  shampoo: { price: 800, comfort: 1, speedBonus: .1, legacy: true },
  colour: { price: 900, comfort: 1, speedBonus: .05, requires: 'colour' },
  staffRoom: { price: 1000, comfort: 0, w: 2, d: 1, staffRest: true, requires: 'staff' },
  coffeeBar: { price: 700, comfort: 1, w: 2, d: 1 },
};
/** How far in front of a seat people stop before sitting down. */
export const SEAT_APPROACH = .5;
/** Pieces sold in the furniture list. Styling chairs have their own button; the desk cannot be bought twice. */
export const FURNITURE_IDS = Object.keys(FURNITURE).filter(id => id !== 'station' && id !== 'desk' && !FURNITURE[id].legacy);
export const CHAIR_PRICE = FURNITURE.station.price;
export const chairsOn = id => FURNITURE[id].chairs ? FURNITURE[id].chairs.length : 0;
export const EXPANSIONS = [{ cost: 2000, requires: 'chairs' }, { cost: 5500, requires: 'expansion' }, { cost: 11000, requires: 'annex' }];
