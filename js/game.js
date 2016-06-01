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
var GRAVITY = .18;

// Some tracking variables
var backgrounds;
var enemyCont;

var groundLevel = 3*GAME_HEIGHT/GAME_SCALE/4;

var textures = {};
var keys = {};

var playing = false;
var currState = 0;

var pointer;
var menu;
var menuState = StateMachine.create({
	initial: {state: "play", event: "init"},
	error: function() {},
	events: [
		{name: "down", from: "play", to: "instruct"},
		{name: "down", from: "instruct", to: "options"},
		{name: "down", from: "options", to: "credits"},
		{name: "down", from: "credits", to: "credits"},

		{name: "up", from: "play", to: "play"},
		{name: "up", from: "instruct", to: "play"},
		{name: "up", from: "options", to: "instruct"},
		{name: "up", from: "credits", to: "options"}],
	callbacks: {
		onplay: function() { movePointer(0); currState = 0; },
		oninstruct: function() { movePointer(1); currState = 1; },
		onoptions: function() { movePointer(2); currState = 2; },
		oncredits: function() { movePointer(3); currState = 3; },
	}
});

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
	"dx": 0,
	"dy": 0,
	"jumpPower": 4,
	"inAir": function() {
		if (this.sprite.position.y < groundLevel) return true;
		else return false;
	},
	"update": function() {

		// Update physics of player
		this.sprite.position.y += this.dy;
		if (this.sprite.position.y > groundLevel) this.sprite.position.y = groundLevel;
		this.dy += GRAVITY;

		// Update textures
		this.sprite.animationSpeed = this.dx/30 + 20;
		if (this.dx === 0) {
			this.sprite.textures = textures.player.idle;
			// Different texture if jumping and still
			// if (this.inAir()) this.sprite.textures = textures.player.stillJump;
		}
		else if (this.dx > 0) this.sprite.textures = textures.player.running;
	}
};

var enemies = {
	"sprites": [],
	"enemStats": {
		"enem1": {
			"dx": 0,
			"dy": 0,
			"startX": GAME_WIDTH/GAME_SCALE,
			"startY": groundLevel
		}
	},
	"update": function() {
		for (var i = 0; i < this.sprites.length; i++) {
			currSprite = this.sprites[i];
			currStats = this.enemStats[currSprite.type];

			currSprite.position.x -= player.dx - currStats.dx;
			currSprite.position.y -= currStats.dy;

			if ((Math.abs(currSprite.position.x - player.sprite.position.x) * 2 < currSprite.width + player.sprite.width) && (Math.abs(currSprite.position.y - player.sprite.position.y) * 2 < currSprite.height + player.sprite.height)) gameOver();

			// Update textures
			currSprite.animationSpeed = currStats.dx/30 + 20;

			if (currSprite.position.x < -currSprite.width) this.sprites.splice(i,1);
		}
	}
};

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
	
	// Initialize player texture object
	textures["player"] = {};
	textures.player["idle"] = [];
	textures.player["running"] = [];

	// Loop through all frames of the player sprite
	for (var i = 1; i < 6; i++) {
		if (i <= 1) cont = "idle";
		else if (i <= 5) cont = "running";
		
		textures.player[cont].push(PIXI.Texture.fromFrame("player" + i + ".png"));
	}

	// Initialize enemy texture object
	textures["enemies"] = {};
	textures.enemies["enemy1"] = {"idle": []};

	// Loop through all frames of the enemy sprite
	for (var i = 1; i < 3; i++) {
		if (i <= 2) cont = "idle";
		textures.enemies.enemy1[cont].push(PIXI.Texture.fromFrame("enemies" + i + ".png"));
	}

	textures["testBrown"] = PIXI.Texture.fromFrame("test-brown.png");
	textures["testRed"] = PIXI.Texture.fromFrame("test-red.png");
	textures["testGreen"] = PIXI.Texture.fromFrame("test-green.png");
	

	loadMainMenu();
	animate();
}

// Function used to load and initialize the starting menu
function loadMainMenu() {
	menu = new PIXI.Container();

	background = new PIXI.Sprite(textures.testBrown);
	background.width = GAME_WIDTH/GAME_SCALE;
	background.height = GAME_HEIGHT/GAME_SCALE;
	menu.addChild(background);

	title = new PIXI.Text("Title",{font: "56px Impact", fill: "#fff", dropShadow: true, align: "center"});
	title.scale.x = 1/GAME_SCALE;
	title.scale.y = 1/GAME_SCALE;
	title.anchor.y = .5;
	title.position.x = GAME_WIDTH/GAME_SCALE/2 - title.width/2;
	title.position.y = GAME_HEIGHT/GAME_SCALE/4;
	menu.addChild(title);

	play = new PIXI.Text("Play Game",{font: "34px Impact", fill: "#fff", dropShadow: true, align: "center"});
	play.scale.x = 1/GAME_SCALE;
	play.scale.y = 1/GAME_SCALE;
	play.anchor.y = .5;
	play.interactive = true, play.buttonMode = true;
	play.on("mousedown", startGame), play.on("mouseover", menuHover), play.action = startGame;
	play.position.x = GAME_WIDTH/GAME_SCALE/2 - play.width/2;
	play.position.y = title.position.y + GAME_HEIGHT/GAME_SCALE/6;
	menu.addChild(play);

	instruct = new PIXI.Text("Instructions",{font: "34px Impact", fill: "#fff", dropShadow: true, align: "center"});
	instruct.scale.x = 1/GAME_SCALE;
	instruct.scale.y = 1/GAME_SCALE;
	instruct.anchor.y = .5;
	instruct.interactive = true, instruct.buttonMode = true;
	instruct.on("mousedown", parseMenuInput), instruct.on("mouseover", menuHover), instruct.action = parseMenuInput;
	instruct.position.x = GAME_WIDTH/GAME_SCALE/2 - instruct.width/2;
	instruct.position.y = play.position.y + GAME_HEIGHT/GAME_SCALE/10;
	menu.addChild(instruct);

	options = new PIXI.Text("Options",{font: "34px Impact", fill: "#fff", dropShadow: true, align: "center"});
	options.scale.x = 1/GAME_SCALE;
	options.scale.y = 1/GAME_SCALE;
	options.anchor.y = .5;
	options.interactive = true, options.buttonMode = true;
	options.on("mousedown", parseMenuInput), options.on("mouseover", menuHover), options.action = parseMenuInput;
	options.position.x = GAME_WIDTH/GAME_SCALE/2 - options.width/2;
	options.position.y = instruct.position.y + GAME_HEIGHT/GAME_SCALE/10;
	menu.addChild(options);

	credits = new PIXI.Text("Credits",{font: "34px Impact", fill: "#fff", dropShadow: true, align: "center"});
	credits.scale.x = 1/GAME_SCALE;
	credits.scale.y = 1/GAME_SCALE;
	credits.anchor.y = .5;
	credits.interactive = true, credits.buttonMode = true;
	credits.on("mousedown", parseMenuInput), credits.on("mouseover", menuHover), credits.action = parseMenuInput;
	credits.position.x = GAME_WIDTH/GAME_SCALE/2 - credits.width/2;
	credits.position.y = options.position.y + GAME_HEIGHT/GAME_SCALE/10;
	menu.addChild(credits);

	pointer = new PIXI.Sprite(textures.player.idle[0]);
	pointer.anchor.y = .5;
	pointer.position.x = play.position.x - pointer.width - 10;
	pointer.position.y = play.position.y;
	pointer.width = 50/GAME_SCALE;
	pointer.height = 50/GAME_SCALE;
	menu.addChild(pointer);

	stage.addChild(menu);
}

// Helper method to parse menu input
function parseMenuInput(e) {
	menu.children[menu.children.indexOf(e.target)].action();
}

// Function to manage menu hover change
function menuHover(e){
	targI = menu.children.indexOf(e.target);
	diff = targI-(currState+2);
	for (var i = 0; i < Math.abs(diff); i++) {
		if (diff < 0) menuState.up();
		else menuState.down();
	}
}

// Function responsible for changing the location of the pointer, called by state machine
function movePointer(index) {
	elem = menu.getChildAt(index+2);
	createjs.Tween.removeTweens(pointer.position);
	createjs.Tween.get(pointer.position).to({y: elem.position.y, x: elem.position.x - pointer.width - 10}, 500, createjs.Ease.cubicOut);
}

function startGame() {

	stage.removeChildAt(0);
	playing = true;

	backgrounds = new PIXI.Container();

	distantBack = new PIXI.Sprite(textures.testRed);
	distantBack.position.x = 0;
	distantBack.position.y = 0;
	distantBack.width = 2*GAME_WIDTH/GAME_SCALE;
	distantBack.height = 3*GAME_HEIGHT/GAME_SCALE/4;
	backgrounds.addChild(distantBack);

	closeBack = new PIXI.Sprite(textures.testGreen);
	closeBack.position.x = 0;
	closeBack.position.y = GAME_HEIGHT/GAME_SCALE/2;
	closeBack.width = 2*GAME_WIDTH/GAME_SCALE;
	closeBack.height = GAME_HEIGHT/GAME_SCALE/4;
	backgrounds.addChild(closeBack);

	floor = new PIXI.Sprite(textures.testBrown);
	floor.position.x = 0;
	floor.position.y = 3*GAME_HEIGHT/GAME_SCALE/4;
	floor.width = 2*GAME_WIDTH/GAME_SCALE;
	floor.height = GAME_HEIGHT/GAME_SCALE/4;
	backgrounds.addChild(floor);

	stage.addChild(backgrounds);


	enemyCont = new PIXI.Container();
	stage.addChild(enemyCont);


	// Initialize player sprite
	player.sprite = new PIXI.extras.MovieClip(textures.player.idle);
	player.sprite.anchor.y = 1;
	player.sprite.position.x = 20;
	player.sprite.position.y = 3*GAME_HEIGHT/GAME_SCALE/4;
	player.sprite.play();
	stage.addChild(player.sprite);

	/*// Set up the overlay container
	over = new PIXI.Container();
	dialogBox = new PIXI.Sprite(textures.player.moveu[0]);
	dialogBox.position.x = 10;
	dialogBox.position.y = 140;
	dialogBox.width = GAME_WIDTH/GAME_SCALE-40;
	dialogBox.height = 50;
	dialogBox.visible = false;
	over.addChild(dialogBox);
	stage.addChild(over);

	// Set up the overlay container
	text = new PIXI.Container();
	dialog = new PIXI.Text("",{font: "34px Impact", fill: "#fff", dropShadow: true, align: "left", wordWrap: true, wordWrapWidth: GAME_WIDTH-40*GAME_SCALE});
	dialog.position.x = 20;
	dialog.position.y = 150;
	dialog.scale.x = 1/GAME_SCALE;
	dialog.scale.y = 1/GAME_SCALE;
	text.addChild(dialog);
	stage.addChild(text);

	// Initialize player based on tileset location
	player.sprite = new PIXI.extras.MovieClip(textures.player.idle);
	player.sprite.anchor.y = 1;
	player.sprite.position.x = Math.round(world.getObject("player").x / TILE_SIZE) * TILE_SIZE;
	player.sprite.position.y = Math.round(world.getObject("player").y / TILE_SIZE) * TILE_SIZE;
	player.sprite.play();
	world.getObject("entities").addChild(player.sprite);*/
}

function updateBackgrounds() {
	db = backgrounds.getChildAt(0);
	cb = backgrounds.getChildAt(1);
	f = backgrounds.getChildAt(2);

	db.position.x -= player.dx * 0.25;
	cb.position.x -= player.dx * 0.5;
	f.position.x -= player.dx * 1;

	if (Math.abs(db.position.x) >= db.width/2) db.position.x = 0;
	if (Math.abs(cb.position.x) >= cb.width/2) cb.position.x = 0;
	if (Math.abs(f.position.x) >= f.width/2) f.position.x = 0;
}

function spawnEnemy() {
	// Randomize later
	enemType = "enem1";


	newEnem = new PIXI.extras.MovieClip(textures.enemies.enemy1.idle);
	newEnem.anchor.y = 1;
	newEnem.position.x = enemies.enemStats[enemType].startX;
	newEnem.position.y = enemies.enemStats[enemType].startY;
	console.log(enemies.enemStats);
	newEnem.type = enemType;
	enemies.sprites.push(newEnem);
	enemyCont.addChild(newEnem);
}

function gameOver() {
	playing = false;

}

// Event Handlers
function keydownEventHandler(e) {
	keys[e.which] = true;

	if (!playing) {
		if (e.which === 87 || e.which === 38) { menuState.up(); }
		if (e.which === 83 || e.which === 40) { menuState.down(); }
		if (e.which === 13 || e.which === 32) { menu.getChildAt(currState+2).action(); }
	}
	else {
		if ((e.which === 32 || e.which === 87 || e.which === 38) && !player.inAir()) {
			player.dy = -player.jumpPower;
		}
	}
	
    if([32, 37, 38, 39, 40].indexOf(e.which) > -1) {
        e.preventDefault();
    }
}
function keyupEventHandler(e) {
	keys[e.which] = false;
}

// Main game loop!
function animate() {
	requestAnimationFrame(animate);
	if (playing) {
		updateBackgrounds();
		player.update();
		enemies.update();
	}
	renderer.render(stage);
}