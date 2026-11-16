/** Shared panel shell: pins navigation and retains a separate scroll position for each page. Content owners supply HTML. */
export class PanelView {
  constructor(root, navigation, body) { Object.assign(this,{root,navigation,body}); this.page=null; this.scroll=new Map(); }
  remember() { if (this.page!=null && !this.root.classList.contains('min')) this.scroll.set(this.page,this.body.scrollTop); }
  render(html, page) {
    this.remember();
    const template=this.body.ownerDocument.createElement('template'); template.innerHTML=html;
    const nav=this.body.ownerDocument.createDocumentFragment();
    while (template.content.firstElementChild?.matches('.stabs, .ssub')) nav.append(template.content.firstElementChild);
    const route=[page,...Array.from(nav.querySelectorAll('[data-do].sel'),e=>e.dataset.do)].join('/');
    this.navigation.replaceChildren(nav); this.navigation.hidden=!this.navigation.childElementCount;
    this.body.replaceChildren(template.content); this.page=route;
    this.body.scrollTop=this.scroll.get(route)||0;
  }
  expand() { this.root.classList.remove('min'); this.body.scrollTop=this.scroll.get(this.page)||0; }
  toggleCollapsed() { this.remember(); if(this.root.classList.contains('min'))this.expand();else this.root.classList.add('min'); }
}
