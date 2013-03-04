
// A cross-browser requestAnimationFrame
// See https://hacks.mozilla.org/2011/08/animating-with-javascript-from-setinterval-to-requestanimationframe/
var requestAnimFrame = (function(){
    return window.requestAnimationFrame       ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame    ||
        window.oRequestAnimationFrame      ||
        window.msRequestAnimationFrame     ||
        function(callback){
            window.setTimeout(callback, 1000 / 60);
        };
})();

define(function(require) {
    var resources = require('./resources');
    var input = require('./input');
    var Sprite = require('./sprite');

    // Create the canvas
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");
    canvas.width = 512;
    canvas.height = 480;

    document.body.appendChild(canvas);

    // Game state
    var player = {
        x: 0,
        y: 0,
        sizeX: 100,
        sizeY: 100,
        dir: 'right',
        sprite: new Sprite('img/sprites.png', [0, 0], [39, 39], 16, [0, 1])
    };

    var bullets = [];
    var bulletSprite = new Sprite('img/sprites.png', [0, 39], [18, 8]);

    var enemies = [];
    var explosions = [];

    var lastFire = Date.now();
    var gameTime = 0;
    var isGameOver;
    var terrainPattern;

    // Speed in pixels per second
    var playerSpeed = 200;
    var bulletSpeed = 500;
    var enemySpeed = 100;

    // Reset game to original state
    function reset() {
        document.getElementById('game-over').style.display = 'none';
        document.getElementById('game-over-overlay').style.display = 'none';
        isGameOver = false;
        gameTime = 0;

        enemies = [];
        bullets = [];

        player.pos = [50, canvas.height / 2];
    };

    // Game over
    function gameOver() {
        document.getElementById('game-over').style.display = 'block';
        document.getElementById('game-over-overlay').style.display = 'block';
        isGameOver = true;
    }

    // Update game objects
    function update(dt) {
        gameTime += dt;

        if(input.isDown('DOWN') || input.isDown('s')) {
            player.pos[1] += playerSpeed * dt;
        }

        if(input.isDown('UP') || input.isDown('w')) {
            player.pos[1] -= playerSpeed * dt;
        }

        if(input.isDown('LEFT') || input.isDown('a')) {
            player.pos[0] -= playerSpeed * dt;
        }

        if(input.isDown('RIGHT') || input.isDown('d')) {
            player.pos[0] += playerSpeed * dt;
        }

        if(input.isDown('SPACE')) {
            if(!isGameOver && Date.now() - lastFire > 100) {
                bullets.push({
                    pos: [player.pos[0] + player.sprite.size[0] / 2,
                          player.pos[1] + player.sprite.size[1] / 2]
                });
                lastFire = Date.now();
            }
        }

        // Check bounds
        if(player.pos[0] < 0) {
            player.pos[0] = 0;
        }
        else if(player.pos[0] > canvas.width - player.sprite.size[0]) {
            player.pos[0] = canvas.width - player.sprite.size[0];
        }

        if(player.pos[1] < 0) {
            player.pos[1] = 0;
        }
        else if(player.pos[1] > canvas.height - player.sprite.size[1]) {
            player.pos[1] = canvas.height - player.sprite.size[1];
        }

        // Update the player sprite animation
        player.sprite.update(dt);

        // Update all the bullets
        for(var i=0; i<bullets.length; i++) {
            bullets[i].pos[0] += bulletSpeed * dt;

            if(bullets[i].pos[0] > canvas.width) {
                bullets.splice(i, 1);
                i--;
            }
        }

        // Update all the enemies
        for(var i=0; i<enemies.length; i++) {
            enemies[i].pos[0] -= enemySpeed * dt;
            enemies[i].sprite.update(dt);

            if(enemies[i].pos[0] + enemies[i].sprite.size[0] < 0) {
                enemies.splice(i, 1);
                i--;
            }
        }

        // Update all the explosions
        for(var i=0; i<explosions.length; i++) {
            explosions[i].sprite.update(dt);

            if(explosions[i].sprite.done) {
                explosions.splice(i, 1);
                i--;
            }
        }

        // It gets harder over time by adding enemies using this
        // equation: 1-.993^gameTime
        if(Math.random() < 1 - Math.pow(.993, gameTime)) {
            enemies.push({
                pos: [canvas.width,
                      Math.random() * (canvas.height - 39)],
                sprite: new Sprite('img/sprites.png', [0, 78], [80, 39],
                                   6, [0, 1, 2, 3, 2, 1])
            });
        }

        checkCollisions();
    };

    function collides(x, y, r, b, x2, y2, r2, b2) {
        return !(r <= x2 || x > r2 ||
                 b <= y2 || y > b2);
    }

    function boxCollides(pos, size, pos2, size2) {
        return collides(pos[0], pos[1],
                        pos[0] + size[0], pos[1] + size[1],
                        pos2[0], pos2[1],
                        pos2[0] + size2[0], pos2[1] + size2[1]);
    }

    function checkCollisions() {
        for(var i=0; i<enemies.length; i++) {
            var pos = enemies[i].pos;
            var size = enemies[i].sprite.size;

            for(var j=0; j<bullets.length; j++) {
                var pos2 = bullets[j].pos;
                var size2 = bulletSprite.size;

                if(boxCollides(pos, size, pos2, size2)) {
                    bullets.splice(j, 1);
                    j--;

                    enemies.splice(i, 1);
                    i--;

                    explosions.push({
                        pos: pos,
                        sprite: new Sprite('img/sprites.png',
                                           [0, 117],
                                           [39, 39],
                                           16,
                                           [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
                                           null,
                                           true)
                    });
                 }
            }

            if(boxCollides(pos, size, player.pos, player.sprite.size)) {
                gameOver();
            }
        }
    }

    // Draw everything
    function render() {
        ctx.fillStyle = terrainPattern;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Render the player if the game isn't over
        if(!isGameOver) {
            ctx.save();
            ctx.translate(player.pos[0], player.pos[1]);
            player.sprite.render(ctx);
            ctx.restore();
        }

        // Render the bullets
        for(var i=0; i<bullets.length; i++) {
            var bullet = bullets[i];

            ctx.save();
            ctx.translate(bullet.pos[0], bullet.pos[1]);

            switch(bullet.dir) {
            case 'up': ctx.rotate(-Math.PI / 2); break;
            case 'left': ctx.rotate(Math.PI); break;
            case 'down': ctx.rotate(Math.PI / 2); break;
            case 'right':
                // The default is pointed right
            }

            bulletSprite.render(ctx);
            ctx.restore();
        }

        // Render the enemies
        for(var i=0; i<enemies.length; i++) {
            var enemy = enemies[i];

            ctx.save();
            ctx.translate(enemy.pos[0], enemy.pos[1]);
            enemy.sprite.render(ctx);
            ctx.restore();
        }

        // Render the explosions
        for(var i=0; i<explosions.length; i++) {
            var explosion = explosions[i];

            ctx.save();
            ctx.translate(explosion.pos[0], explosion.pos[1]);
            explosion.sprite.render(ctx);
            ctx.restore();
        }
    };

    // The main game loop
    var lastTime;
    function main() {
        var now = Date.now();
        var dt = (now - lastTime) / 1000.0;

        update(dt);
        render();

        lastTime = now;
        requestAnimFrame(main);
    };

    function start() {
        terrainPattern = ctx.createPattern(resources.get('img/terrain.png'), 'repeat');

        document.getElementById('play-again').addEventListener('click', function() {
            reset();
        });

        reset();
        lastTime = Date.now();
        main();
    }

    resources.load([
        'img/sprites.png',
        'img/terrain.png'
    ]);
    resources.onReady(start);
});