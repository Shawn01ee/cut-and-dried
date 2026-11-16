import { REFERENCE_CUTS } from '../hair/ReferenceCuts.js';

/** Names and visible silhouette notes come from the same cut definitions as the menu. */
export const CUT_STRINGS = Object.fromEntries(['en','ko'].map((lang, i) => [lang, {
  'cuts.basic': i ? '기본 형태' : 'Basic shapes',
  'cuts.collection': i ? '디자인 컷 컬렉션' : 'Design cut collection',
  'cuts.note': i ? '앞머리·옆선·뒤 라인이 다른 컷이에요. 펌과 컬러는 별도로 선택해요.' : 'Cuts differ in fringe, sides and back. Perms and colours are selected separately.',
  'cuts.choose': i ? '컷 형태 선택' : 'Choose cut shape',
  ...Object.fromEntries(REFERENCE_CUTS.flatMap(c => [['cut.' + c.id, c.names[i]], ['shape.' + c.shape, c.names[i]], ['cut.note.' + c.id, c.notes[i]]])),
}]));
