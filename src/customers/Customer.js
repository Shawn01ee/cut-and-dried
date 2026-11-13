/** A client's data. `fig`, `hm` and `tag` are rendering handles attached by the scene and never saved. */
export class Customer {
  constructor({ id, name, hair, order, price, budget, patience, loyalty, vip, requestedService, villain = null, influencer = null }) {
    Object.assign(this, { id, name, hair, order, price, budget, loyalty, vip, requestedService, villain, influencer });
    this.pat = patience; this.maxPat = patience; this.treated = 0;
    this.state = 'arrive'; this.preferredStylist = null;
    this.seat = null; this.st = null; this.tint = 0; this.tStart = 0;
    this.previewHair = null; this.result = null;
    this.fig = null; this.hm = null; this.tag = null;
  }
}
