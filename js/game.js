/*
Game Design Notes:
Grid based, turn based strategy combat game with rpg elements
You play as some hero with some form of inventory
There are ranged weapons and melee weapons
Maybe have some sort of big guy following a small protagonist who helps in battle

Map Design Notes:
The game starts fighting some sort of final boss that you will inevitabely lose to
The game from there is a big loop to get stronger and better 
Need no return jumps like in pokemon

*/


// Some constant values
var GAME_WIDTH = 1024;
var GAME_HEIGHT = 576;
var GAME_SCALE = 3;
var TILE_SIZE = 16;
var DEFAULT_MOVE_TIME = 200;
var SPRINT_MOVE_TIME = 125;

// Fetch gameport and add the renderer
var gameport = document.getElementById("gameport");
var renderer = new PIXI.autoDetectRenderer(GAME_WIDTH, GAME_HEIGHT, {backgroundColor: 0x000});
gameport.appendChild(renderer.view);

// Create the main stage
var stage = new PIXI.Container();
stage.scale.x = GAME_SCALE;
stage.scale.y = GAME_SCALE;

var player = {
	"sprite": null,
	"moveTime": DEFAULT_MOVE_TIME,
};

var textures = {};
var keys = {};
var moving = false;

var world;

// Add event listeners to the document
document.addEventListener('keydown', keydownEventHandler);
document.addEventListener('keyup', keyupEventHandler);
gameport.addEventListener('onfocusout', onfocusoutEventHandler);

// Ensure scaling doesn't cause anti-aliasing
PIXI.SCALE_MODES.DEFAULT = PIXI.SCALE_MODES.NEAREST;

// Only load world, tilesheet, and spritesheet
PIXI.loader
	.add("world_json", "assets/world.json")
	.add("tiles", "assets/tiles.png")
	.add("assets/spritesheet.json")
	.load(ready);

function ready() {
	
	// Initialize player texture object
	textures["player"] = {};
	textures.player["idle"] = [];
	textures.player["mover"] = [];
	textures.player["movel"] = [];
	textures.player["moveu"] = [];
	textures.player["moved"] = [];

	// Loop through all frames of the player sprite
	for (var i = 1; i < 6; i++) {
		if (i <= 1) cont = "idle";
		else if (i <= 2) cont = "mover";
		else if (i <= 3) cont = "moveu";
		else if (i <= 4) cont = "movel";
		else if (i <= 5) cont = "moved";
		
		textures.player[cont].push(PIXI.Texture.fromFrame("player" + i + ".png"));
	}

	textures["enemies"] = {};
	textures.enemies["enemy1"] = {"standing": PIXI.Texture.fromFrame("enemy1.png")};

	// Load all of the worlds
	var tileUtil = new TileUtilities(PIXI);
	world = tileUtil.makeTiledWorld("world_json", "assets/tiles.png");
	stage.addChild(world);

	// Initialize player based on tileset location
	player.sprite = new PIXI.extras.MovieClip(textures.player.idle);
	player.sprite.position.x = Math.round(world.getObject("player").x / TILE_SIZE) * TILE_SIZE;
	player.sprite.position.y = Math.round(world.getObject("player").y / TILE_SIZE) * TILE_SIZE;
	player.sprite.play();
	world.getObject("entities").addChild(player.sprite);
	
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

function updatePlayer() {

	player.sprite.animationSpeed = player.moveTime/50;

	if ((keys[87] || keys[38]) && !moving) {
		//player.sprite.texture = textures.player.moveu[0];
		player.sprite.textures = textures.player.moveu;
		moving = true;
		newY = player.sprite.position.y - TILE_SIZE;
		createjs.Tween.get(player.sprite.position).to({y:newY}, player.moveTime, createjs.Ease.linear).call(function() { moving = false; });
	}
	else if ((keys[83] || keys[40]) && !moving) {
		player.sprite.textures = textures.player.moved;
		moving = true;
		newY = player.sprite.position.y + TILE_SIZE;
		createjs.Tween.get(player.sprite.position).to({y:newY}, player.moveTime, createjs.Ease.linear).call(function() { moving = false; });
	}
	else if ((keys[65] || keys[37]) && !moving) {
		player.sprite.textures = textures.player.movel;
		moving = true;
		newX = player.sprite.position.x - TILE_SIZE;
		createjs.Tween.get(player.sprite.position).to({x:newX}, player.moveTime, createjs.Ease.linear).call(function() { moving = false; });
	}
	else if ((keys[68] || keys[39]) && !moving) {
		player.sprite.textures = textures.player.mover;
		moving = true;
		newX = player.sprite.position.x + TILE_SIZE;
		createjs.Tween.get(player.sprite.position).to({x:newX}, player.moveTime, createjs.Ease.linear).call(function() { moving = false; });
	}
	else if (!moving) {
		player.sprite.textures = textures.player.idle;
		player.sprite.animationSpeed = player.moveTime/100;
	}

	
}

function checkInput() {
	if (keys[16]) player.moveTime = SPRINT_MOVE_TIME;
	else player.moveTime = DEFAULT_MOVE_TIME;
}

// Function used to update the camera position
function updateCamera() {

	stage.x = -player.sprite.x*GAME_SCALE + GAME_WIDTH/2 - player.sprite.width/2*GAME_SCALE;
	stage.y = -player.sprite.y*GAME_SCALE + GAME_HEIGHT/2 - player.sprite.height/2*GAME_SCALE;
	stage.x = -Math.max(0, Math.min(world.worldWidth*GAME_SCALE - GAME_WIDTH, -stage.x));
	stage.y = -Math.max(0, Math.min(world.worldHeight*GAME_SCALE - GAME_HEIGHT, -stage.y));
}

// Event Handlers
function keydownEventHandler(e) {
	keys[e.which] = true;
    if([32, 37, 38, 39, 40].indexOf(e.which) > -1) {
        e.preventDefault();
    }
}
function keyupEventHandler(e) {
	keys[e.which] = false;
}
function onfocusoutEventHandler(e) {
	console.log("here");
}

// Main game loop!
function animate() {
	requestAnimationFrame(animate);
	updatePlayer();
	checkInput();
	updateCamera();
	renderer.render(stage);
}