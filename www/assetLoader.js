define(["exports"], function (exports) {
  "use strict";

  exports.getTexture = getTexture;
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  /**
   * Loading resources ahead of time will allow us to know
   * the dimensions of the resources for manipulation
   *
   * Later, add a loader for each new screen
   * if initial loading takes too long
   */
  PIXI.loader.add("chain", "img/laser.png").add("level-button", "img/button.png").add("wordpart-active", "img/circle-active.png").add("wordpart-inactive", "img/circle-inactive.png").add("img/enemy1.png");

  var resources = PIXI.loader.resources;

  function getTexture(key) {
    return resources[key].texture;
  }

  ;
});