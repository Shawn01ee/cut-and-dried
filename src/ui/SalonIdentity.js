/** Reuses the existing pixel sign, changing its text only when the original salon becomes a flagship. */
export class SalonIdentity {
  constructor(texture, draw) { this.texture=texture; this.draw=draw; this.flagship=false; }
  sync(flagship) { if(this.flagship===flagship)return;this.flagship=flagship;this.draw(this.texture.userData.g,140,22,flagship?'CIEL FLAGSHIP':'CIEL GROUND');this.texture.needsUpdate=true; }
}
