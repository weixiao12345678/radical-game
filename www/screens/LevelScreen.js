define(["exports", "module", "../util", "../data/index", "../Word", "../WordpartSet", "../entities/enemy", "../entities/enemyInfo", "../assetLoader", "../layout"], function (exports, module, _util, _dataIndex, _Word, _WordpartSet, _entitiesEnemy, _entitiesEnemyInfo, _assetLoader, _layout) {
  "use strict";

  var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

  var _toConsumableArray = function (arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } };

  var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

  var deepClone = _util.deepClone;
  var shuffle = _util.shuffle;
  var getRandom = _util.getRandom;

  var data = _interopRequire(_dataIndex);

  var dataTraining = deepClone(data.training.levels);
  var dataEnemies = deepClone(data.enemies);
  var dataWords = deepClone(data.words);

  var Word = _interopRequire(_Word);

  var WordpartSet = _interopRequire(_WordpartSet);

  var Enemy = _interopRequire(_entitiesEnemy);

  var EnemyInfo = _interopRequire(_entitiesEnemyInfo);

  var getTexture = _assetLoader.getTexture;
  var layoutLevel = _layout.level;

  /**
   * returns a generator function that takes no arguments.
   * generator() returns a random word's variant
   * @param variant {string} I.E., chinese, english, pinyin, parts
   * @param levelChoices {Array.<string>} get random word from select levels
  */
  function generateRandomWord(variant, levelChoices) {
    // get unique set of words
    var hashWords = levelChoices.reduce(function (hash, n) {
      dataTraining[n].words.forEach(function (word) {
        return hash[word] = true;
      });
      return hash;
    }, {});

    var wordVariants = Object.keys(hashWords).reduce(function (words, word) {
      var wordVar = dataWords[word][variant];
      return words.concat(wordVar);
    }, []);

    return getRandom(wordVariants);
  }

  /**
   * Fills `parts` array with random parts
   * until it reaches `numPoints` elements
   * @param generateFn {Function} returns a random part
   * @param wparts {Array.<String>} existing list of words
   * @param numPoints {Integer} number of total parts to return
   */
  function generateMissingParts(generateFn, wparts, numPoints) {
    var parts = wparts.slice();
    for (var i = 0, len = numPoints - parts.length; i < len; i++) {
      parts.push(generateFn());
    }

    return shuffle(parts);
  }

  var LevelScreen = (function () {
    function LevelScreen(game, params) {
      _classCallCheck(this, LevelScreen);

      this.game = game;
      this.data = params;

      this.enemyChoices = params.enemies.map(function (enemy) {
        return dataEnemies[enemy];
      });
      this.wordChoices = params.words.map(function (word) {
        return dataWords[word];
      });

      this.nextWord = this.nextWord.bind(this);

      this.initEntities();
    }

    _createClass(LevelScreen, {
      initEntities: {
        value: function initEntities() {
          var _display$position;

          var texture = getTexture(this.data.background);
          var container = this.container = new PIXI.Sprite(texture);

          var displayOptions = layoutLevel.display;
          var display = this.display = new PIXI.Text(this.data.display, displayOptions.style);
          display.anchor.x = 1;
          container.addChild(display);
          (_display$position = display.position).set.apply(_display$position, _toConsumableArray(displayOptions.position));

          // placeholders;
          this.enemy = { died: function () {
              return true;
            }, container: new PIXI.Container() };
          this.wordpartSet = { container: new PIXI.Container(), destroy: function () {} };
          this.enemyInfo = { container: new PIXI.Container() };

          this.nextWord();
        }
      },
      nextWord: {
        value: function nextWord() {
          var variants = getRandom(this.data.variants);
          var wordObj = getRandom(this.wordChoices);
          var newWord = new Word(wordObj, variants.build);

          if (this.enemy.died() || this.enemy.fled()) {
            this.nextEnemy(newWord, variants.learn);
          } else {
            this.enemy.nextWordVariant(newWord.getPieces(variants.learn));
          }

          this.nextWordpartSet(newWord, variants.build);
        }
      },
      nextEnemy: {
        value: function nextEnemy(word, variant) {
          var _this = this;

          var _enemy$container$position, _enemyInfo$container$position;

          this.container.removeChild(this.enemy.container);
          this.container.removeChild(this.enemyInfo.container);
          this.enemyInfo.container.destroy();

          var enemyData = getRandom(this.enemyChoices);
          var enemy = this.enemy = new Enemy(word.getPieces(variant), enemyData);
          this.container.addChild(enemy.container);
          (_enemy$container$position = enemy.container.position).set.apply(_enemy$container$position, _toConsumableArray(layoutLevel.enemy));

          this.enemyInfo = new EnemyInfo(enemy, this.data.enemyInfoOptions);
          var enemyInfo = this.enemyInfo;
          this.container.addChild(enemyInfo.container);
          (_enemyInfo$container$position = enemyInfo.container.position).set.apply(_enemyInfo$container$position, _toConsumableArray(layoutLevel.enemyInfo));

          var next = function () {
            _this.wordpartSet.container.interactiveChildren = false;
            setTimeout(function () {
              _this.nextWord();
            }, 500);
          };

          enemy.container.on("enemy:died", function () {
            _this.addGold();

            if (_this.isComplete()) {
              return _this.fireCompleted();
            }

            next();
          });

          enemy.container.on("enemy:hurt", next);
          enemy.container.on("enemy:fled", next);
          enemy.container.on("enemy:missed", function () {
            _this.wordpartSet.container.interactiveChildren = false;
            setTimeout(function () {
              _this.wordpartSet.container.interactiveChildren = true;
            }, 200);
          });
          // enemy.container.on('enemy:hurt', setTimeout(this.nextWord, 500));
          // enemy.container.on('enemy:fled', setTimeout(this.nextWord, 500));
        }
      },
      fireCompleted: {
        value: function fireCompleted() {
          throw "AbstractError: override #fireCompleted() method";
        }
      },
      isComplete: {
        value: function isComplete() {
          throw "AbstractError: override #isComplete() method";
        }
      },
      nextWordpartSet: {
        value: function nextWordpartSet(word, variant) {
          var _this = this;

          var data = this.data;
          this.container.removeChild(this.wordpartSet.container);
          // this.wordpartSet.container.destroy();
          this.wordpartSet.destroy();

          var levelIds = data.levelChoices;
          var wordparts = word.getPieces(variant);
          var generator = generateRandomWord.bind(null, variant, data.levelChoices);
          var parts = generateMissingParts(generator, wordparts, 6);
          this.wordpartSet = new WordpartSet(word, parts, data.giveHints);
          this.container.addChild(this.wordpartSet.container);

          this.wordpartSet.container.on("word:completed", function () {
            _this.resolveAttack();
          });

          this.wordpartSet.container.on("word:incorrect", function () {
            _this.resolveMiss();
          });
        }
      },
      addGold: {
        value: function addGold() {
          var levelMultiplier = 1;
          var earned = this.enemy.get("gold") * levelMultiplier;

          this.game.addGold(earned);
        }
      },
      resolveAttack: {
        value: function resolveAttack() {
          // var levelMultipler = 1
          // var damage = this.game.getDamage();
          var damage = 1;
          this.enemy.attack(damage);
        }
      },
      resolveMiss: {
        value: function resolveMiss() {
          this.enemy.miss();
        }
      }
    });

    return LevelScreen;
  })();

  module.exports = LevelScreen;
});