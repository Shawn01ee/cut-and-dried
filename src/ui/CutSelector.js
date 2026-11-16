import { SHAPES } from '../hair/rules.js';
import { REFERENCE_CUTS, REFERENCE_SHAPES } from '../hair/ReferenceCuts.js';

/** A compact cut selector, keeping the original shapes available alongside the reference collection. */
export class CutSelector {
  constructor(i18n) { this.i18n = i18n; }
  note(shape) { const c = REFERENCE_SHAPES[shape]; return c ? this.i18n.t('cut.note.' + c.id) : ''; }
  render(selected) {
    const t = k => this.i18n.t(k), option = shape => `<option value="${shape}" ${shape === selected ? 'selected' : ''}>${t('shape.' + shape)}</option>`;
    const group = (label, shapes) => `<optgroup label="${label}">${shapes.map(option).join('')}</optgroup>`;
    return `<select class="cutselect" data-cut-shape aria-label="${t('cuts.choose')}">${group(t('cuts.basic'), SHAPES.filter(s => !REFERENCE_SHAPES[s]))}${['f','m'].map(g => group(t('cuts.collection') + ' · ' + t('gender.' + g), REFERENCE_CUTS.filter(c => c.g === g).map(c => c.shape))).join('')}</select>`;
  }
}
