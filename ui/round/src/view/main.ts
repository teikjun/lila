import { h } from 'snabbdom'
import { VNode } from 'snabbdom/vnode'
import { plyStep } from '../round';
import { renderTable } from './table';
import * as promotion from '../promotion';
import { render as renderGround } from '../ground';
import { read as fenRead } from 'chessground/fen';
import resizeHandle from 'common/resize';
import * as util from '../util';
import * as keyboard from '../keyboard';
import * as gridHacks from './gridHacks';
import crazyView from '../crazy/crazyView';
import { render as keyboardMove } from '../keyboardMove';
import RoundController from '../ctrl';
import { Position, MaterialDiff, MaterialDiffSide, CheckCount } from '../interfaces';

function renderMaterial(material: MaterialDiffSide, score: number, position: Position, checks?: number) {
  const children: VNode[] = [];
  let role: string, i: number;
  for (role in material) {
    if (material[role] > 0) {
      const content: VNode[] = [];
      for (i = 0; i < material[role]; i++) content.push(h('mpiece.' + role));
      children.push(h('div', content));
    }
  }
  if (checks) for (i = 0; i < checks; i++) children.push(h('div', h('mpiece.king')));
  if (score > 0) children.push(h('score', '+' + score));
  return h('div.material.material-' + position, children);
}

function wheel(ctrl: RoundController, e: WheelEvent): boolean {
  if (ctrl.isPlaying()) return true;
  e.preventDefault();
  if (e.deltaY > 0) keyboard.next(ctrl);
  else if (e.deltaY < 0) keyboard.prev(ctrl);
  ctrl.redraw();
  return false;
}

function resizeHandleFor(ctrl: RoundController) {
  const pref = ctrl.data.pref.resizeHandle;
  return (pref == 2 || pref == 1 && ctrl.ply < 2) ? h('div.board-resize', {
    hook: util.onInsert(resizeHandle)
  }) : undefined;
}

const emptyMaterialDiff: MaterialDiff = {
  white: {},
  black: {}
};

export function main(ctrl: RoundController): VNode {
  const d = ctrl.data,
    cgState = ctrl.chessground && ctrl.chessground.state,
    topColor = d[ctrl.flip ? 'player' : 'opponent'].color,
    bottomColor = d[ctrl.flip ? 'opponent' : 'player'].color;
  let material: MaterialDiff, score: number = 0;
  if (d.pref.showCaptured) {
    let pieces = cgState ? cgState.pieces : fenRead(plyStep(ctrl.data, ctrl.ply).fen);
    material = util.getMaterialDiff(pieces);
    score = util.getScore(pieces) * (bottomColor === 'white' ? 1 : -1);
  } else material = emptyMaterialDiff;

  const checks: CheckCount = (d.player.checks || d.opponent.checks) ?
    util.countChecks(ctrl.data.steps, ctrl.ply) :
    util.noChecks;

  return ctrl.nvui ? ctrl.nvui.render(ctrl) : h('div.round__app.variant-' + d.game.variant.key, {
    class: { 'move-confirm': !!(ctrl.moveToSubmit || ctrl.dropToSubmit) },
    hook: util.onInsert(gridHacks.start)
  }, [
    h('div.round__app__board.main-board' + (ctrl.data.pref.blindfold ? '.blindfold' : ''), {
      hook: window.lichess.hasTouchEvents ? undefined : util.bind('wheel', (e: WheelEvent) => wheel(ctrl, e))
    }, [
      renderGround(ctrl),
      promotion.view(ctrl),
      resizeHandleFor(ctrl)
    ]),
    crazyView(ctrl, topColor, 'top') || renderMaterial(material[topColor], -score, 'top', checks[topColor]),
    ...renderTable(ctrl),
    crazyView(ctrl, bottomColor, 'bottom') || renderMaterial(material[bottomColor], score, 'bottom', checks[bottomColor]),
    ctrl.keyboardMove ? keyboardMove(ctrl.keyboardMove) : null
  ])
};
