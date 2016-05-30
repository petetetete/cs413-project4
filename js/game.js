// Some constant values
var GAME_WIDTH = 1024;
var GAME_HEIGHT = 576;
var GAME_SCALE = 3;

// Fetch gameport and add the renderer
var gameport = document.getElementById("gameport");
var renderer = new PIXI.autoDetectRenderer(GAME_WIDTH, GAME_HEIGHT, {backgroundColor: 0x000});
gameport.appendChild(renderer.view);

// Create the main stage
var stage = new PIXI.Container();
stage.scale.x = GAME_SCALE;
stage.scale.y = GAME_SCALE;

var textures = {};

// Add event listeners to the document
document.addEventListener('keydown', keydownEventHandler);
document.addEventListener('keyup', keyupEventHandler);

// Ensure scaling doesn't cause anti-aliasing
PIXI.SCALE_MODES.DEFAULT = PIXI.SCALE_MODES.NEAREST;

// Only load world, tilesheet, and spritesheet
PIXI.loader
	.add("world_json", "assets/world.json")
	.add("tiles", "assets/tiles.png")
	.add("assets/spritesheet.json")
	.load(ready);

function ready() {
	textures["player"] = {"standing": PIXI.Texture.fromFrame("player.png")};
	textures["enemies"] = {};
	textures.enemies["enemy1"] = {"standing": PIXI.Texture.fromFrame("enemy1.png")};
	
	animate();
}

// Function used to toggle between worlds
function toggleWorld(portal) {
	currWorld = 1 - currWorld;
	player.sprite.position.y += (currWorld) ? WORLD_HEIGHT : -WORLD_HEIGHT;
	if (portal) {
		vect = getMovement();
		player.sprite.position.x += 25 * (vect[0]-vect[2]);
		player.sprite.position.y += 25 * (vect[3]-vect[1]);
	}
}

// Event Handlers
function keydownEventHandler(e) {
	// Movement key catch
	if (e.keyCode === 68 || e.keyCode === 39) {
		e.preventDefault();
		direction[0] = 1;
	}
	if (e.keyCode === 87 || e.keyCode === 38) {
		e.preventDefault();
		direction[1] = 1;
	}
	if (e.keyCode === 65 || e.keyCode === 37) {
		e.preventDefault();
		direction[2] = 1;
	}
	if (e.keyCode === 83 || e.keyCode === 40) {
		e.preventDefault();
		direction[3] = 1;
	}

	if(e.keyCode === 32) {
		e.preventDefault();
		if (pickups[1]) toggleWorld();
	}
}

function keyupEventHandler(e) {
	// Movement key catch
	if (e.keyCode === 68 || e.keyCode === 39) direction[0] = 0;
	if (e.keyCode === 87 || e.keyCode === 38) direction[1] = 0;
	if (e.keyCode === 65 || e.keyCode === 37) direction[2] = 0;
	if (e.keyCode === 83 || e.keyCode === 40) direction[3] = 0;
}

// Main game loop!
function animate() {
	requestAnimationFrame(animate);

	renderer.render(stage);
}