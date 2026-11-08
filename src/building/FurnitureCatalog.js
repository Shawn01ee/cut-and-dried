/** Furniture rules as data. How each piece looks lives in rendering/furnitureModels.js. */
export const FURNITURE = {
  plant: { price: 80, comfort: 1 },
  rug: { price: 120, comfort: 1 },
  mirror: { price: 150, comfort: 2 },
  lamp: { price: 200, comfort: 2 },
  shelf: { price: 250, comfort: 1, dailySales: 30 },
  sofa: { price: 400, comfort: 1, width: 2, seats: 2 },
  shampoo: { price: 800, comfort: 1, speedBonus: .1 },
  colour: { price: 900, comfort: 1, speedBonus: .05, requires: 'colour' },
  staffRoom: { price: 1000, comfort: 0, width: 2, staffRest: true, requires: 'staff' },
};
export const FURNITURE_IDS = Object.keys(FURNITURE);
export const CHAIR_PRICE = 300;
export const EXPANSIONS = [{ cost: 1500, requires: 'chairs' }, { cost: 4000, requires: 'expansion' }];
