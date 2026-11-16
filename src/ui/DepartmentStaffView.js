/** Only draws hired specialists at their own workstations; employment and work remain in Departments. */
export class DepartmentStaffView {
  constructor(departments, create, position, remove) { Object.assign(this,{departments,create,position,remove}); this.figures=new Map(); }
  sync() {
    const active=new Set();
    for(const e of this.departments.hired){
      if(e.onLeave(this.departments.game.clock.day))continue;
      const spot=this.position(e);if(!spot)continue;active.add(e.id);
      let fig=this.figures.get(e.id);
      if(!fig){fig=this.create(e);this.figures.set(e.id,fig);}
      // where the station puts them, facing the client (see FURNITURE `work`)
      fig.pos.copy(spot.pos);fig.yaw=spot.yaw;fig.mode=spot.sit?'sit':'stand';if(spot.sit){fig.seatH=spot.h;fig.footY=.06;}fig.setTool(this.departments.occupied(e)?'brush':null);
    }
    for(const [id,fig] of this.figures)if(!active.has(id)){this.remove(fig);this.figures.delete(id);}
  }
  clear() { for(const fig of this.figures.values())this.remove(fig);this.figures.clear(); }
}
