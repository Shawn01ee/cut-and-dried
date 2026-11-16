/** Scene adapter for specialist bookings. The appointment model owns timing and outcomes; this only shows guests. */
export class DepartmentGuests {
  constructor(game, create, walk, station, door, remove, waiting) { Object.assign(this,{game,create,walk,station,door,remove,waiting}); this.guests=new Map(); }
  sync() {
    const jobs=this.game.departments.jobs, live=new Set(jobs.map(j=>j.id));
    for(const [id,view] of this.guests)if(!live.has(id)){this.remove(view.fig);this.guests.delete(id);}
    for(const job of jobs){
      if(job.state==='due'||((job.state==='done'||job.state==='missed')&&!this.guests.has(job.id)))continue;
      let view=this.guests.get(job.id);
      if(!view){const fig=this.create(job);fig.pos.copy(this.door());view={fig,step:-1,state:'new'};this.guests.set(job.id,view);}
      if(job.state==='done'||job.state==='missed'){
        if(view.state!=='leaving'){view.state='leaving';this.walk(view.fig,this.door(),()=>{this.remove(view.fig);this.guests.delete(job.id);});}
        continue;
      }
      if(job.state==='working'&&view.step!==job.step){view.step=job.step;view.state='serving';const spot=this.station(job);this.walk(view.fig,spot.pos,()=>{const f=view.fig;f.pos.copy(spot.pos);f.yaw=spot.yaw;if(spot.sit){f.mode='sit';f.seatH=spot.h;f.footY=.06;}});}
      else if(job.state==='arrived'&&view.state!=='waiting'){view.state='waiting';this.walk(view.fig,this.waiting(job));}
    }
  }
  clear() { for(const view of this.guests.values())this.remove(view.fig);this.guests.clear(); }
}
