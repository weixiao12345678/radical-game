import Wordpart from './entities/wordpart';
import Word from './Word';
import config from './config';
import Vector from './Vector';

import data from './data/index';
import {getValues} from './util';

var dataWordparts = getValues(data.radicals);

function getPoints(numPoints) {
  var angle = 2 * Math.PI / numPoints;
  var points = [];
  for (let i = 0; i < numPoints; i++) {
    points.push([Math.cos(i * angle), Math.sin(i * angle)]);
  }
  return points;
}

var _config = config.wordpartSet;
var center = new Vector(_config.center);
var radius = _config.radius;
var r = new Vector(radius, radius);


class WordpartSet {
  constructor(word, parts, giveHints=false) {
    this.word = word;
    this.parts = parts;

    var container = this.container = new PIXI.Container();
    Vector.move(container, center);

    container.interactive = true;
    container.interactiveChildren = true;

    container.word = this.word;
    this.buildWordparts();

    this.wordparts.forEach(wordpart => {
      container.addChild(wordpart.container);
    });

    this.selected = [];

    this.initInteractions();
  }

  initInteractions() {
    var container = this.container;
    var isContactingWordpart = false;
    var dragging = false;

    var boundaries = new PIXI.Graphics();
    boundaries.beginFill(_config.boundaryColor);
    boundaries.alpha = 0.1;
    boundaries.drawRect(-200, -200, 400, 400);

    container.addChild(boundaries);

    container.on('wordpart:mousedown', (event, wordpart) => {
      isContactingWordpart = true;
      dragging = true;

      this.select(wordpart);
    });

    container.on('wordpart:mouseover', (event, wordpart) => {
      isContactingWordpart = true;
      if (!wordpart.selected && dragging) {
        this.select(wordpart);
      }
    });

    container.on('wordpart:mouseout', () => {
      isContactingWordpart = false;
    });

    var emitEvent = eventName => {
      return event => this.container.emit(eventName, event);
    };

    container.mousemove = emitEvent('wordpartSet:mousemove');
    container.mouseup = emitEvent('wordpartSet:mouseup');
    container.mouseupoutside = emitEvent('wordpartSet:mouseupoutside');

    var clear = () => {
      dragging = false;
      isContactingWordpart = false;
      this.clear();
    }

    container.on('wordpartSet:mouseup', () => {
      if (isContactingWordpart) {
        this.word.buildsFrom(this.selected)
          ? container.emit('word:completed')
          : container.emit('word:incorrect');
      }
      clear();
    });

    container.on('wordpartSet:mouseupoutside', clear);

    this.initHinter();
    this.initChain();
  }

  buildWordparts() {
    var points = getPoints(this.parts.length);
    points = points.map(pt => new Vector(pt).mult(r));
    this.wordparts = points.map((pt, i) => new Wordpart(this.parts[i], pt));
  }

  select(wordpart) {
    this.selected.push(wordpart.part);
    wordpart.select();
  }

  clear() {
    this.selected = [];
    this.wordparts.forEach(wordpart => wordpart.deselect());
  }
}


var WordpartSetHinter = {
  initHinter() {
    this.resetHints();

    this.container.on('wordpart:mousedown', (event, wordpart) => {
      this.getHint() === wordpart.part
        && this.highlightNextHint();
    });

    this.container.on('wordpart:select', (event, wordpart) => {
      this.wordparts.forEach(wp => wp.unhighlight());
    });

    this.container.on('word:incorrect', () => this.resetHints());

    this.container.on('wordpart:mouseup', () => this.resetHints());
  },

  highlightNextHint() {
    this.hints.shift();
    this.highlightHint();
  },

  highlightHint() {
    var hint = this.getHint();
    var wordpart = this.wordparts.find(wp => hint === wp.part)

    if (wordpart) wordpart.highlight();
  },

  getHint() {
    return this.hints[0];
  },

  resetHints() {
    this.wordparts.forEach(wp => wp.unhighlight());
    this.hints = [null, ...this.word.getPieces()];
    this.highlightNextHint();
  }
};

var tol = 0.1; // pixel tolerance
class Chain {
  constructor() {
    this.container = new PIXI.Container();
    this.lasers = [];
    this.laserImg = PIXI.Texture.fromImage(_config.laserImg);
  }

  addLaser(startPos) {
    var start = Vector.move(new PIXI.Point(0, 0), startPos);
    var end = Vector.move(new PIXI.Point(0, 0), startPos);
    this.current = new PIXI.mesh.Rope(this.laserImg, [start, end]);

    this.container.addChild(this.current);
  }

  pop() {
    this.container.removeChild(this.current);
    this.current.destroy();
    this.current = this.container.children.slice(-1)[0];
  }

  pointCurrentTo(point) {
    var head = this.current.points.slice(-1)[0];
    Vector.move(head, point);
  }

  destroy() {
    this.container.destroy();
  }
}

var WordpartSetChain = {
  initChain() {
    var container = this.container;
    var chain;
    
    container.on('wordpart:mousedown', (event, wordpart) => {
      chain = new Chain();
      chain.addLaser(wordpart.container);
      container.addChild(chain.container);
    });

    container.on('wordpart:select', (event, wordpart) => {
      if (!chain) return;

      chain.pointCurrentTo(wordpart.container);
      chain.addLaser(wordpart.container);
    });

    container.on('wordpart:mouseover', () => {
      if (!chain) return;
      chain.container.alpha = 1
    });

    container.on('wordpart:mouseout', () => {
      if (!chain) return;
      chain.container.alpha = 0.5;
    });

    container.on('wordpartSet:mousemove', event => {
      if (!chain) return;
      var pos = event.data.getLocalPosition(container);
      chain.pointCurrentTo(pos);
    });

    function destroy() {
      container.removeChild(chain.container);
      chain.destroy();
      chain = null;
    }

    container.on('wordpartSet:mouseup', destroy);
    container.on('wordpartSet:mouseupoutside', destroy);
  }
};


var mixins = Object.assign({}, WordpartSetHinter, WordpartSetChain);

Object.keys(mixins).forEach(prop => {
  mixins[prop] = {value: mixins[prop]};
})

Object.defineProperties(WordpartSet.prototype, mixins);

export default WordpartSet;
