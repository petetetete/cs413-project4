/*
Game Design Notes:
Infinite runner with various enemies and obstacles
Ability to punch making the player kill enemies rather than lose to them

Theme:
Your character is a boxer trying to escape after winning a rigged fight
Enemies are mob esque characters
The character has signature boxing gloves as defining feature

*/


// Some constant values
var GAME_WIDTH = 1024;
var GAME_HEIGHT = 576;
var GAME_SCALE = 3;
var GRAVITY = .2;
var DISTANCE_DIVISOR = 20;
var RUNNING_THRESHOLD = 2;
var COUNTDOWN_GAP = 60;

// Some tracking variables
var backgrounds;
var enemyCont;

var currText = "";
var currTextTime = 0;
var text;

var groundLevel = 3*GAME_HEIGHT/GAME_SCALE/4;

var textures = {};
var keys = {};

var highScores = {};

var playing = false;
var inMenu = true;
var atMainMenu = true;
var currState = 0;

// Initial states for tracking variables
var distance = 0;
var gameTick = 0;
var timeSinceSpawn = 0;
var spawnProb = 0.002;

// Tracking variables to indicate whether a function is ran in the animate loop
var intro = false;
var running = false;

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
var renderer = new PIXI.autoDetectRenderer(GAME_WIDTH, GAME_HEIGHT, {backgroundColor: 0xfff});
gameport.appendChild(renderer.view);

// Create the main stage
var stage = new PIXI.Container();
stage.scale.x = GAME_SCALE;
stage.scale.y = GAME_SCALE;

var player = {
	"sprite": null,
	"dx": 0,
	"dy": 0,
	"jumpPower": 5,
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
		else if (this.dx > 0 && this.dx < RUNNING_THRESHOLD) this.sprite.textures = textures.player.walking;
		else if (this.dx >= RUNNING_THRESHOLD) this.sprite.textures = textures.player.running;
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
		},
		"enem2": {
			"dx": 0.5,
			"dy": 0,
			"startX": GAME_WIDTH/GAME_SCALE,
			"startY": groundLevel/2
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
			currSprite.animationSpeed = currStats.dx/30;

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
	.add("assets/spritesheet.json")
	.add("fonts/athletic-stroke.fnt")
	.add("fonts/athletic-stroke-small.fnt")
	.load(ready);

function ready() {
	
	// Initialize player texture object
	textures["player"] = {};
	textures.player["defeat"] = [];
	textures.player["idle"] = [];
	textures.player["walking"] = [];
	textures.player["running"] = [];

	// Loop through all frames of the player sprite
	for (var i = 1; i < 11; i++) {
		if (i <= 1) cont = "defeat";
		else if (i <= 2) cont = "idle";
		else if (i <= 6) cont = "walking";
		else if (i <= 10) cont = "running";
		
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

	textures["skyBack"] = PIXI.Texture.fromFrame("sky-back.png");
	textures["distantBack"] = PIXI.Texture.fromFrame("distant-back.png");
	textures["closeBack"] = PIXI.Texture.fromFrame("close-back.png");
	textures["ground"] = PIXI.Texture.fromFrame("ground.png");

	textures["pointer"] = PIXI.Texture.fromFrame("pointer.png");

	loadMainMenu();
	loadScores();
	animate();
}

// Function used to load and initialize the starting menu
function loadMainMenu() {
	inMenu = true;
	atMainMenu = true;
	clearStage();

	menu = new PIXI.Container();

	background = new PIXI.Sprite(textures.testBrown);
	background.width = GAME_WIDTH/GAME_SCALE;
	background.height = GAME_HEIGHT/GAME_SCALE;
	menu.addChild(background);

	title = new PIXI.extras.BitmapText("Title",{font: "58px athletic-stroke", align: "center"});
	title.scale.x = 1/GAME_SCALE;
	title.scale.y = 1/GAME_SCALE;
	title.position.x = GAME_WIDTH/GAME_SCALE/2 - title.width/2;
	title.position.y = GAME_HEIGHT/GAME_SCALE/4 - title.height/2;
	menu.addChild(title);

	play = new PIXI.extras.BitmapText("Play Game",{font: "36px athletic-stroke-small", align: "center"});
	play.scale.x = 1/GAME_SCALE;
	play.scale.y = 1/GAME_SCALE;
	play.interactive = true, play.buttonMode = true;
	play.on("mousedown", startGame), play.on("mouseover", menuHover), play.action = startGame;
	play.position.x = GAME_WIDTH/GAME_SCALE/2 - play.width/2;
	play.position.y = title.position.y + GAME_HEIGHT/GAME_SCALE/6;
	menu.addChild(play);

	instruct = new PIXI.extras.BitmapText("Instructions",{font: "36px athletic-stroke-small", align: "center"});
	instruct.scale.x = 1/GAME_SCALE;
	instruct.scale.y = 1/GAME_SCALE;
	instruct.interactive = true, instruct.buttonMode = true;
	instruct.on("mousedown", loadInstructions), instruct.on("mouseover", menuHover), instruct.action = loadInstructions;
	instruct.position.x = GAME_WIDTH/GAME_SCALE/2 - instruct.width/2;
	instruct.position.y = play.position.y + GAME_HEIGHT/GAME_SCALE/10;
	menu.addChild(instruct);

	options = new PIXI.extras.BitmapText("Options",{font: "36px athletic-stroke-small", align: "center"});
	options.scale.x = 1/GAME_SCALE;
	options.scale.y = 1/GAME_SCALE;
	options.interactive = true, options.buttonMode = true;
	options.on("mousedown", parseMenuInput), options.on("mouseover", menuHover), options.action = parseMenuInput;
	options.position.x = GAME_WIDTH/GAME_SCALE/2 - options.width/2;
	options.position.y = instruct.position.y + GAME_HEIGHT/GAME_SCALE/10;
	menu.addChild(options);

	credits = new PIXI.extras.BitmapText("Credits",{font: "36px athletic-stroke-small", align: "center"});
	credits.scale.x = 1/GAME_SCALE;
	credits.scale.y = 1/GAME_SCALE;
	credits.interactive = true, credits.buttonMode = true;
	credits.on("mousedown", loadCredits), credits.on("mouseover", menuHover), credits.action = loadCredits;
	credits.position.x = GAME_WIDTH/GAME_SCALE/2 - credits.width/2;
	credits.position.y = options.position.y + GAME_HEIGHT/GAME_SCALE/10;
	menu.addChild(credits);

	pointer = new PIXI.Sprite(textures.pointer);
	pointer.position.x = menu.getChildAt(currState+2).position.x - pointer.width - 10;
	pointer.position.y = menu.getChildAt(currState+2).position.y;
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

function loadInstructions() {
	clearStage();
	atMainMenu = false;

	menu = new PIXI.Container();

	background = new PIXI.Sprite(textures.testBrown);
	background.width = GAME_WIDTH/GAME_SCALE;
	background.height = GAME_HEIGHT/GAME_SCALE;
	menu.addChild(background);

	title = new PIXI.extras.BitmapText("Instructions",{font: "58px athletic-stroke", align: "center"});
	title.scale.x = 1/GAME_SCALE;
	title.scale.y = 1/GAME_SCALE;
	title.position.x = 10;
	title.position.y = 10;
	menu.addChild(title);

	info1 = new PIXI.extras.BitmapText("inst1",{font: "36px athletic-stroke-small", align: "center"});
	info1.scale.x = 1/GAME_SCALE;
	info1.scale.y = 1/GAME_SCALE;
	info1.position.x = GAME_WIDTH/GAME_SCALE/2 - info1.width/2;
	info1.position.y = 20 + GAME_HEIGHT/GAME_SCALE/8;
	menu.addChild(info1);

	info2 = new PIXI.extras.BitmapText("inst2",{font: "36px athletic-stroke-small", align: "center"});
	info2.scale.x = 1/GAME_SCALE;
	info2.scale.y = 1/GAME_SCALE;
	info2.position.x = GAME_WIDTH/GAME_SCALE/2 - info2.width/2;
	info2.position.y = info1.position.y + GAME_HEIGHT/GAME_SCALE/8;
	menu.addChild(info2);

	back = new PIXI.extras.BitmapText("Back",{font: "36px athletic-stroke-small", align: "center"});
	back.scale.x = 1/GAME_SCALE;
	back.scale.y = 1/GAME_SCALE;
	back.interactive = true, back.buttonMode = true;
	back.on("mousedown", loadMainMenu), back.action = loadMainMenu;
	back.position.x = GAME_WIDTH/GAME_SCALE - back.width - 10;
	back.position.y = GAME_HEIGHT/GAME_SCALE - 3*back.height/2;
	menu.addChild(back);

	pointer = new PIXI.Sprite(textures.pointer);
	pointer.anchor.y = .5;
	pointer.position.x = back.position.x - pointer.width - 10;
	pointer.position.y = back.position.y + pointer.height/2;
	menu.addChild(pointer);

	stage.addChild(menu);
}

function loadCredits() {
	clearStage();
	atMainMenu = false;

	menu = new PIXI.Container();

	background = new PIXI.Sprite(textures.testBrown);
	background.width = GAME_WIDTH/GAME_SCALE;
	background.height = GAME_HEIGHT/GAME_SCALE;
	menu.addChild(background);

	title = new PIXI.extras.BitmapText("Credits:",{font: "58px athletic-stroke", align: "center"});
	title.scale.x = 1/GAME_SCALE;
	title.scale.y = 1/GAME_SCALE;
	title.position.x = 10;
	title.position.y = 10;
	menu.addChild(title);

	info1 = new PIXI.extras.BitmapText("Design and Storyboarding: Peter Huettl",{font: "36px athletic-stroke-small", align: "center"});
	info1.scale.x = 1/GAME_SCALE;
	info1.scale.y = 1/GAME_SCALE;
	info1.position.x = GAME_WIDTH/GAME_SCALE/2 - info1.width/2;
	info1.position.y = 20 + GAME_HEIGHT/GAME_SCALE/8;
	menu.addChild(info1);

	info2 = new PIXI.extras.BitmapText("Programming: Peter Huettl",{font: "36px athletic-stroke-small", align: "center"});
	info2.scale.x = 1/GAME_SCALE;
	info2.scale.y = 1/GAME_SCALE;
	info2.position.x = GAME_WIDTH/GAME_SCALE/2 - info2.width/2;
	info2.position.y = info1.position.y + GAME_HEIGHT/GAME_SCALE/8;
	menu.addChild(info2);

	info3 = new PIXI.extras.BitmapText("Art: Peter Huettl",{font: "36px athletic-stroke-small", align: "center"});
	info3.scale.x = 1/GAME_SCALE;
	info3.scale.y = 1/GAME_SCALE;
	info3.position.x = GAME_WIDTH/GAME_SCALE/2 - info3.width/2;
	info3.position.y = info2.position.y + GAME_HEIGHT/GAME_SCALE/8;
	menu.addChild(info3);

	info4 = new PIXI.extras.BitmapText("Music: Peter Huettl",{font: "36px athletic-stroke-small", align: "center"});
	info4.scale.x = 1/GAME_SCALE;
	info4.scale.y = 1/GAME_SCALE;
	info4.position.x = GAME_WIDTH/GAME_SCALE/2 - info4.width/2;
	info4.position.y = info3.position.y + GAME_HEIGHT/GAME_SCALE/8;
	menu.addChild(info4);

	back = new PIXI.extras.BitmapText("Back",{font: "36px athletic-stroke-small", align: "center"});
	back.scale.x = 1/GAME_SCALE;
	back.scale.y = 1/GAME_SCALE;
	back.interactive = true, back.buttonMode = true;
	back.on("mousedown", loadMainMenu), back.action = loadMainMenu;
	back.position.x = GAME_WIDTH/GAME_SCALE - back.width - 10;
	back.position.y = GAME_HEIGHT/GAME_SCALE - 3*back.height/2;
	menu.addChild(back);

	pointer = new PIXI.Sprite(textures.pointer);
	pointer.anchor.y = .5;
	pointer.position.x = back.position.x - pointer.width - 10;
	pointer.position.y = back.position.y + pointer.height/2;
	menu.addChild(pointer);

	stage.addChild(menu);
}

function startGame() {
	clearStage();
	inMenu = false;
	atMainMenu = false;
	playing = true;
	distance = 0;
	gameTick = 0;
	timeSinceSpawn = 0;

	backgrounds = new PIXI.Container();

	skyBack = new PIXI.Sprite(textures.skyBack);
	skyBack.position.x = 0;
	skyBack.position.y = 0;
	skyBack.width = 2*GAME_WIDTH/GAME_SCALE;
	skyBack.height = 3*GAME_HEIGHT/GAME_SCALE/4;
	backgrounds.addChild(skyBack);

	distantBack = new PIXI.Sprite(textures.distantBack);
	distantBack.position.x = 0;
	distantBack.position.y = 0;
	distantBack.width = 2*GAME_WIDTH/GAME_SCALE;
	distantBack.height = 3*GAME_HEIGHT/GAME_SCALE/4;
	backgrounds.addChild(distantBack);

	closeBack = new PIXI.Sprite(textures.closeBack);
	closeBack.position.x = 0;
	closeBack.position.y = 3*GAME_HEIGHT/GAME_SCALE/8;
	closeBack.width = 2*GAME_WIDTH/GAME_SCALE;
	closeBack.height = 3*GAME_HEIGHT/GAME_SCALE/8;
	backgrounds.addChild(closeBack);

	floor = new PIXI.Sprite(textures.ground);
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

	distanceText = new PIXI.extras.BitmapText("Distance: 0 ft",{font: "28px athletic-stroke-small", align: "center"});
	distanceText.scale.x = 1/GAME_SCALE;
	distanceText.scale.y = 1/GAME_SCALE;
	distanceText.position.x = 5;
	distanceText.position.y = 5;
	stage.addChild(distanceText);

	text = new PIXI.extras.BitmapText("",{font: "36px athletic-stroke-small", align: "center"});
	text.scale.x = 1/GAME_SCALE;
	text.scale.y = 1/GAME_SCALE;
	text.alpha = 0;
	stage.addChild(text);

	intro = true;
	
}

function updateIntro() {
	if (gameTick === 0) displayText("3", COUNTDOWN_GAP);
	if (gameTick === COUNTDOWN_GAP) displayText("2", COUNTDOWN_GAP);
	if (gameTick === 2*COUNTDOWN_GAP) displayText("1", COUNTDOWN_GAP);
	if (gameTick === 3*COUNTDOWN_GAP) {
		displayText("Go", COUNTDOWN_GAP);
		running = true;
		intro = false;
		gameTick = 0;
	}
}

function displayText(words, time) {
	text.alpha = 1;
	currText = words;
	if (time > 0) {
		currTextTime = time;
		createjs.Tween.removeTweens(text);
		createjs.Tween.get(text).to({alpha: 0}, 1000*time/60, createjs.Ease.quintIn);
	}
	else currTextTime = -1;
}

function updateText() {
	if (--currTextTime === 0 || currText === "") {
		currText = "";
		text.alpha = 0;
	}

	text.position.x = -stage.x + (GAME_WIDTH/GAME_SCALE-text.width)/2;
	text.position.y = 20;
	text.text = currText;
}

function updateBackgrounds() {
	sb = backgrounds.getChildAt(0);
	db = backgrounds.getChildAt(1);
	cb = backgrounds.getChildAt(2);
	f = backgrounds.getChildAt(3);

	sb.position.x -= player.dx * 0.05;
	db.position.x -= player.dx * 0.25;
	cb.position.x -= player.dx * 0.5;
	f.position.x -= player.dx * 1;

	if (Math.abs(sb.position.x) >= sb.width/2) sb.position.x = 0;
	if (Math.abs(db.position.x) >= db.width/2) db.position.x = 0;
	if (Math.abs(cb.position.x) >= cb.width/2) cb.position.x = 0;
	if (Math.abs(f.position.x) >= f.width/2) f.position.x = 0;
}

function updateDistance() {
	distanceText.text = "Distance: " + Math.floor(distance) + " ft";
}

function updateGameState() {

	player.dx = Math.sqrt(gameTick)/18 + 0.1;
	if (gameTick === 0) spawnEnemy();
	if (Math.random() < spawnProb) {
		spawnEnemy();
	}
}

function updateScores() {

	// If there exists any high scores
	if (highScores.length > 0) {

		// Grab high scores div and display it
		div = document.getElementById("high-scores");
		div.style.display = "block";

		// Resort the highscores array
		highScores.sort(function(a, b){return b.score-a.score});

		// Generate the html for the high scores div
		output = "<h1>Global High Scores</h1><ol>";
		for (var i = 0; i < highScores.length; i++) {
			if (i === 5) break;
			output += "<li>" + highScores[i].name + ": " + highScores[i].score + "</li>";
		}

		// Add generate html to the div
		div.innerHTML = output + "</ol>";
	}
}

function spawnEnemy() {

	timeSinceSpawn = 0;

	var result;
	var count = 0;
	for (var prop in enemies.enemStats) 
		if (Math.random() < 1/++count) 
		result = prop;

	newEnem = new PIXI.extras.MovieClip(textures.enemies.enemy1.idle);
	newEnem.anchor.y = 1;
	newEnem.position.x = enemies.enemStats[result].startX;
	newEnem.position.y = enemies.enemStats[result].startY;
	newEnem.type = result;
	newEnem.play();
	enemies.sprites.push(newEnem);
	enemyCont.addChild(newEnem);
}

function gameOver() {
	playing = false;
	player.sprite.textures = textures.player.defeat;
	displayText("Whelp, run faster next time \n Your high score has been submitted", 0);
	// Add enemies 'defeat' textures here
}

function clearStage() {
	while(stage.children[0]) {
		stage.removeChild(stage.children[0]);
	}
}

function loadScores() {
	var xhr = new XMLHttpRequest();
	xhr.open("get", "scores/scores.json", true);
	xhr.responseType = "json";
	xhr.onload = function() {
		var status = xhr.status;
		if (status == 200) highScores = xhr.response;
		else console.warn("something borked with the high scores");
	};
	xhr.send();
}

function postScore() {
	var http = new XMLHttpRequest();
	var url = "scores/submitScore.php";
	var params = "name=Anonymous&score=" + Math.floor(distance);
	http.open("POST", url, true);

	http.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
	/*http.onreadystatechange = function() {
		if(http.readyState == 4 && http.status == 200) {
			alert(http.responseText);
		}
	}*/
	http.send(params);
}

// Event Handlers
function keydownEventHandler(e) {
	keys[e.which] = true;

	if (inMenu) {
		if ((e.which === 87 || e.which === 38) && atMainMenu) { menuState.up(); }
		else if ((e.which === 83 || e.which === 40) && atMainMenu) { menuState.down(); }
		else if ((e.which === 27 || e.which === 13 || e.which === 32) && !atMainMenu) loadMainMenu();
		else if (e.which === 13 || e.which === 32) { menu.getChildAt(currState+2).action(); }
	}
	else {
		if ((e.which === 32 || e.which === 87 || e.which === 38) && !player.inAir()) {
			player.dy = -player.jumpPower;
		}
		if (e.which === 27) playing = !playing;
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

	if (Math.floor(new Date().getTime()/1000)%5 - 1 === 0) loadScores();
	if (Math.floor(new Date().getTime()/1000)%5 === 0) updateScores();

	if (currText != "") updateText();
	if (playing) {
		
		if (intro) updateIntro();
		if (running) {
			updateGameState();
			updateDistance();
		}
		
		updateBackgrounds();
		player.update();
		enemies.update();

		distance += player.dx/DISTANCE_DIVISOR;
		++gameTick, ++timeSinceSpawn;
	}
	renderer.render(stage);
}