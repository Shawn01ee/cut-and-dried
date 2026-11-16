/**
 * Cuts interpreted from the user's Chahong Ardor reference sheets, not salon technique specifications.
 * Zones are back, rear side, face frame and fringe; taper rounds the back, part offsets the two sides of
 * the fringe. All lengths scale together so the existing cut-only, wave compensation and scoring rules apply.
 * Prices/lengths are game design values, using the existing menu's price bands. No new trend or rarity boost.
 */
export class CutStyle {
  constructor(id, g, L, price, zones, names, notes, { taper = 0, part = 0, advanced = false } = {}) {
    Object.assign(this, { id, g, L, price, zones, names, notes, taper, part, advanced }); this.shape = 'Ref:' + id;
  }
  profile(length, strands) {
    return strands.map(s => {
      const edge = Math.min(1, Math.abs(s.p.x) / .1);
      const ratio = this.zones[s.z] - (s.z === 0 ? this.taper * edge : 0) + (s.z === 3 ? Math.sign(s.p.x) * this.part : 0);
      return length * ratio;
    });
  }
  get menu() { return { g: this.g, shape: this.shape, L: this.L, price: this.price, advanced: this.advanced, reference: true }; }
}

const cut = (...args) => new CutStyle(...args);
export const REFERENCE_CUTS = [
  cut('earth','m',[3,6],60,[.55,.35,.35,.6],['Earth cut','어스컷'],['Close sides with a short, level fringe.','짧은 옆선과 반듯한 짧은 앞머리']),
  cut('beanie','m',[5,9],60,[.72,.65,.7,.85],['Beanie cut','비니컷'],['A compact rounded outline with an even fringe.','둥글게 감싸는 짧은 실루엣과 균일한 앞머리']),
  cut('clark','m',[6,10],65,[.55,.28,.38,.95],['Clark cut','클락컷'],['Tight sides and a longer, uneven front.','단정한 옆선과 길이 차이를 둔 긴 앞머리'],{part:.2,advanced:true}),
  cut('youth','m',[6,10],60,[.75,.7,.72,.88],['Youth cut','유스컷'],['A soft short cut with a light fringe.','부드러운 짧은 라인과 가벼운 앞머리'],{taper:.08}),
  cut('boy','m',[5,9],60,[.68,.5,.55,.78],['Boy cut','보이컷'],['An open ear line and lightly offset fringe.','귀 주변을 정리한 옆선과 가볍게 비껴가는 앞머리'],{part:.08}),
  cut('dawn','m',[7,12],60,[.8,.68,.72,.95],['Dawn cut','던컷'],['A neat outline with more weight at the front.','정돈된 외곽선과 앞쪽에 무게를 둔 라인']),
  cut('ride','m',[8,13],65,[.62,.38,.5,1],['Ride cut','라이드컷'],['A long swept front over closely trimmed sides.','짧게 정리한 옆선 위로 길게 흐르는 앞머리'],{part:.22,advanced:true}),
  cut('boat','m',[8,13],65,[.7,.42,.58,.96],['Boat cut','보트컷'],['A restrained back with an asymmetric front.','차분한 뒤 라인과 비대칭 앞머리'],{part:.16,advanced:true}),
  cut('comma','m',[8,14],65,[.78,.62,.78,1],['Comma cut','카머컷'],['Long front sections with a clear side-to-side difference.','앞머리를 길게 남기고 양쪽 길이에 차이를 준 라인'],{part:.18,advanced:true}),
  cut('bono','m',[8,13],60,[.9,.92,.95,1],['Bono cut','보노컷'],['A full rounded perimeter and substantial fringe.','묵직하고 둥근 외곽선과 도톰한 앞머리']),
  cut('half','m',[9,15],65,[.84,.72,.85,1],['Half cut','하프컷'],['A divided fringe and softly connected sides.','갈라지는 앞머리와 부드럽게 연결되는 옆선'],{part:.12,advanced:true}),
  cut('solid','m',[9,15],65,[.9,.82,.9,1],['Solid cut','솔리드컷'],['A denser outline with a gently offset front.','밀도 있는 외곽선과 살짝 비껴가는 앞머리'],{part:.06}),
  cut('yarn','m',[12,19],70,[1,.9,.8,.9],['Yarn cut','얀컷'],['Ear-length layers with longer face-framing pieces.','귀 주변 레이어와 길게 남긴 얼굴선'],{taper:.06,part:.14}),
  cut('sage','m',[13,21],70,[1,.82,.72,.82],['Sage cut','세이지컷'],['A light medium-length outline with shorter face framing.','가벼운 중간 길이와 짧게 연결한 얼굴선'],{taper:.12,part:.1}),
  cut('shine','m',[16,25],70,[1,.88,.8,.72],['Shine cut','샤인컷'],['A longer nape with layered face-framing sections.','긴 목선과 층을 낸 얼굴 주변 머리'],{taper:.1,part:.12,advanced:true}),
  cut('none','m',[10,17],65,[.9,.84,.9,.96],['None cut','논컷'],['A natural, lightly tapered outline.','자연스럽게 이어지고 끝만 가볍게 정리한 라인'],{taper:.05,part:.04}),
  cut('page','m',[18,28],70,[1,.98,.94,.88],['Page cut','페이지컷'],['A long, relatively solid perimeter around the jaw and nape.','턱선과 목선을 감싸는 길고 무게감 있는 라인'],{taper:.03,advanced:true}),
  cut('lion','m',[18,30],70,[1,.9,.76,.65],['Lion cut','라이언컷'],['A long back with a stronger step down toward the face.','뒤 길이를 살리고 얼굴 쪽 층을 크게 낸 라인'],{taper:.08,part:.14,advanced:true}),
  cut('eaffle','f',[30,50],90,[1,.94,.8,.62],['Eaffle cut','이플컷'],['Long soft layers, shorter around the face.','긴 길이를 유지한 부드러운 층과 짧은 얼굴선'],{taper:.08}),
  cut('lea','f',[35,55],90,[1,.98,.95,.16],['Lea cut','레아컷'],['A long straight outline with a short full fringe.','긴 직선 실루엣과 짧고 또렷한 앞머리']),
  cut('rene','f',[30,50],95,[1,.82,.58,.38],['Rene cut','르네컷'],['Distinct face-framing layers over a long back.','긴 뒤 라인과 뚜렷한 얼굴 주변 레이어'],{taper:.08,part:.1,advanced:true}),
  cut('block','f',[30,52],95,[1,1,.96,.86],['Block cut','블럭컷'],['A straight, weighty perimeter with minimal layering.','층을 최소화한 묵직하고 반듯한 외곽선']),
  cut('sand','f',[28,48],90,[1,.9,.72,.58],['Sand cut','샌드컷'],['A gently rounded back with soft face-framing layers.','둥글게 이어지는 뒤 라인과 부드러운 얼굴선'],{taper:.12}),
  cut('elisabethCut','f',[35,58],95,[1,.9,.74,.64],['Elisabeth cut','엘리자벳컷'],['Long descending layers with a rounded perimeter.','길게 떨어지는 층과 둥근 외곽선'],{taper:.16}),
  cut('frill','f',[28,48],95,[1,.8,.62,.18],['Frill cut','프릴컷'],['Stepped layers and a short fringe.','단차가 드러나는 레이어와 짧은 앞머리'],{taper:.1,advanced:true}),
  cut('hug','f',[30,50],90,[1,.92,.7,.5],['Hug cut','허그컷'],['A long outline that becomes shorter around the cheeks.','긴 외곽선에서 볼 주변으로 짧아지는 얼굴선'],{taper:.1}),
  cut('sleek','f',[35,58],95,[1,1,.98,.92],['Sleek cut','슬릭컷'],['A long, nearly level silhouette with very little layering.','층을 거의 내지 않은 길고 매끈한 실루엣']),
  cut('feather','f',[30,52],95,[1,.78,.56,.42],['Feather cut','페더컷'],['Light, strongly graduated face-framing layers.','얼굴 주변 단차가 큰 가벼운 레이어'],{taper:.18,advanced:true}),
  cut('olivia','f',[32,55],95,[1,.88,.68,.54],['Olivia cut','올리비아컷'],['Long layers with a subtle side-to-side difference at the front.','긴 레이어와 양쪽 길이를 살짝 달리한 앞머리'],{taper:.14,part:.08}),
  cut('heebi','f',[30,52],95,[1,.82,.72,.12],['Heebi cut','히비컷'],['A very short fringe against a long layered outline.','아주 짧은 앞머리와 긴 레이어 실루엣'],{taper:.06,advanced:true}),
  cut('bonyu','f',[35,58],95,[1,.92,.76,.68],['Bonyu cut','본유컷'],['Long tapered layers and a softly offset front.','끝으로 갈수록 가벼워지는 긴 층과 비껴가는 앞머리'],{taper:.2,part:.06,advanced:true}),
];
export const REFERENCE_SHAPES = Object.fromEntries(REFERENCE_CUTS.map(c => [c.shape, c]));
export const REFERENCE_MENU = Object.fromEntries(REFERENCE_CUTS.map(c => [c.id, c.menu]));
