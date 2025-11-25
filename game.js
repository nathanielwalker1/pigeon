// Physics constants - easy to adjust
const PHYSICS = {
    GRAVITY: 800,                    // Downward force when holding thrust (higher = falls faster when thrusting)
    GLIDE_GRAVITY: 600,              // Downward force when gliding (lower = floats more when not thrusting)
    THRUST: -500,                    // Upward force when holding mouse/touch (negative = upward)
    THRUST_FORWARD_BOOST: 20,        // How much forward speed increases per second when thrusting
    GLIDE_FORWARD_MAINTAIN: 0.99,    // How much forward speed is kept each frame when gliding (0.99 = loses 1% per frame)
    FALL_DECELERATION: 0.95,         // How much forward speed is lost each frame when falling badly (0.95 = loses 5% per frame)
    DRAG: 0.92,                      // Air resistance - lower = more drag, bird stops moving faster (0.92 = 8% drag per frame)
    BASE_FORWARD_SPEED: 70,          // Minimum forward speed bird maintains (pixels/second) - SLOWER
    MAX_FORWARD_SPEED: 1700,          // Maximum forward speed bird can reach (pixels/second) - SLOWER
    MAX_VELOCITY_Y: 600,             // Maximum vertical speed (up or down) bird can reach
    FALL_THRESHOLD: 300              // Downward speed at which bird is considered "falling badly" and loses forward momentum
};

// Camera and movement constants
const MOVEMENT = {
    MIN_X: 200,               // Leftmost position bird can reach on screen (pixels from left edge)
    MAX_X: 800,               // Rightmost position bird can reach on screen (pixels from left edge)
    CAMERA_LERP: 0.1,         // Camera smoothing - how fast camera follows bird (0.1 = 10% catch-up per frame, higher = more responsive)
    WORLD_SCROLL_FACTOR: 1.0  // Multiplier for how bird movement affects world distance (1.0 = normal speed)
};

// Background constants
const BACKGROUND = {
    IMAGE_PATH: 'assets/wv2.png',  // Path to background image (easy to swap for testing)
    PARALLAX_FACTOR: 0.5,                  // How much background moves relative to camera (0.5 = half speed)
    SCALE: 0.35,                            // Scale factor for background image (1.0 = normal size)
    CONSTANT_SCROLL_SPEED: 130,             // Constant background scroll speed (pixels/second) - independent of bird speed
};

// Game constants
const GAME = {
    WIDTH: 1920,
    HEIGHT: 1080,
    BIRD_SIZE: 50,
    BIRD_X: 200
};

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.bird = null;
        this.isThrusting = false;
        this.distance = 0;
        this.distanceText = null;
        this.backgroundSprite = null;
        this.backgroundOffset = 0; // INDEPENDENT scroll counter - never changes speed
        this.forwardVelocity = PHYSICS.BASE_FORWARD_SPEED;
        this.cameraTargetX = 0;
        this.worldOffset = 0;
    }

    preload() {
        // Load background image
        this.load.image('background', BACKGROUND.IMAGE_PATH);
        
        // We'll create the bird using graphics in the create() method
    }

    create() {
        // Create sky-like blue gradient background
        this.createBackground();

        // Enable physics
        this.physics.world.gravity.y = PHYSICS.GRAVITY;

        // Create bird using graphics
        this.createBird();

        // Create distance text
        this.distanceText = this.add.text(20, 20, 'Distance: 0m', {
            fontSize: '32px',
            fill: '#ffffff',
            fontWeight: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        });
        this.distanceText.setScrollFactor(0); // Keep UI fixed on screen

        // Input handling
        this.setupInput();
    }

    createBackground() {
        // 1. Create a normal sprite first so we can measure the real image size
        const temp = this.add.image(0, 0, 'background').setOrigin(0, 0);
        
        // 2. Calculate scale so the image fills the screen height EXACTLY
        const scale = GAME.HEIGHT / temp.height;
        
        // 3. Destroy temp and create the real tileSprite with perfect dimensions
        temp.destroy();
        
        this.backgroundSprite = this.add.tileSprite(
            0, 0,
            temp.width * 3,   // wide enough for smooth looping
            temp.height,      // EXACT original height (no distortion)
            'background'
        );
        
        this.backgroundSprite.setOrigin(0, 0);
        this.backgroundSprite.setScale(scale);        // fills screen height perfectly
        this.backgroundSprite.setScrollFactor(0);     // stays behind camera
    }

    createBird() {
        // Create a yellow circle as the bird
        const birdGraphics = this.add.graphics();
        birdGraphics.fillStyle(0xFFD700); // Yellow color
        birdGraphics.fillCircle(0, 0, GAME.BIRD_SIZE / 2);
        
        // Convert to physics sprite
        birdGraphics.generateTexture('birdTexture', GAME.BIRD_SIZE, GAME.BIRD_SIZE);
        birdGraphics.destroy(); // Clean up the temporary graphics
        
        // Create physics sprite
        this.bird = this.physics.add.sprite(MOVEMENT.MIN_X, GAME.HEIGHT / 2, 'birdTexture');
        this.bird.setCollideWorldBounds(false); // We'll handle bounds manually
        this.bird.setDrag(PHYSICS.DRAG, PHYSICS.DRAG);
        this.bird.setMaxVelocity(PHYSICS.MAX_FORWARD_SPEED, PHYSICS.MAX_VELOCITY_Y);
    }


    setupInput() {
        // Mouse controls
        this.input.on('pointerdown', () => {
            this.isThrusting = true;
        });

        this.input.on('pointerup', () => {
            this.isThrusting = false;
        });

        // Touch controls (mobile)
        this.input.addPointer(3); // Allow multiple touch points
    }

    update(_, delta) {
        const deltaTime = delta / 1000;
        const clampedDeltaTime = Math.min(deltaTime, 1/60); // Cap prevents first-frame mega-jump (delta>16ms common)

        // Apply physics based on current state
        this.applyPhysics(clampedDeltaTime);

        // Update forward velocity based on bird state
        this.updateForwardVelocity(clampedDeltaTime);

        // Apply horizontal movement constraints
        this.constrainBirdPosition();

        // Update camera with smooth following
        this.updateCamera(clampedDeltaTime);

        // Update world scrolling and distance
        this.updateWorldPosition(clampedDeltaTime);

        // Update background with time-based consistent movement
        this.backgroundOffset += BACKGROUND.CONSTANT_SCROLL_SPEED * clampedDeltaTime; // Fix: Use delta time for smooth first frame

        // Update background
        this.updateBackgroundScrolling();
    }

    updateForwardVelocity(deltaTime) {
        if (this.isThrusting) {
            // Add forward momentum when thrusting
            this.forwardVelocity += PHYSICS.THRUST_FORWARD_BOOST * deltaTime;
        } else {
            // Check if bird is falling badly (high downward velocity)
            const fallingBadly = this.bird.body.velocity.y > PHYSICS.FALL_THRESHOLD;
            
            if (fallingBadly) {
                // Lose speed when struggling
                this.forwardVelocity *= PHYSICS.FALL_DECELERATION;
            } else {
                // Maintain speed when gliding well
                this.forwardVelocity *= PHYSICS.GLIDE_FORWARD_MAINTAIN;
            }
        }

        // Clamp velocity to min/max bounds
        this.forwardVelocity = Phaser.Math.Clamp(
            this.forwardVelocity, 
            PHYSICS.BASE_FORWARD_SPEED, 
            PHYSICS.MAX_FORWARD_SPEED
        );

        // Apply horizontal velocity to bird
        this.bird.setVelocityX(this.forwardVelocity);
    }

    constrainBirdPosition() {
        // Keep bird within horizontal bounds
        if (this.bird.x < MOVEMENT.MIN_X) {
            this.bird.x = MOVEMENT.MIN_X;
            this.bird.setVelocityX(Math.max(0, this.bird.body.velocity.x));
        } else if (this.bird.x > MOVEMENT.MAX_X) {
            this.bird.x = MOVEMENT.MAX_X;
            this.bird.setVelocityX(Math.min(0, this.bird.body.velocity.x));
        }

        // Keep bird within vertical bounds
        if (this.bird.y < 0) {
            this.bird.y = 0;
            this.bird.setVelocityY(Math.max(0, this.bird.body.velocity.y));
        } else if (this.bird.y > GAME.HEIGHT) {
            this.bird.y = GAME.HEIGHT;
            this.bird.setVelocityY(Math.min(0, this.bird.body.velocity.y));
        }
    }

    updateCamera(deltaTime) {
        // NEW: Camera follows the total distance flown, not the bird's screen X
        this.cameraTargetX = this.worldOffset * 0.2;  // 0.2 gives nice parallax feel, adjust as you like
        
        // Smooth follow
        this.cameras.main.scrollX = Phaser.Math.Linear(
            this.cameras.main.scrollX,
            this.cameraTargetX,
            MOVEMENT.CAMERA_LERP
        );
    }

    updateWorldPosition(deltaTime) {
        // Update world offset based on bird's actual forward movement
        this.worldOffset += this.forwardVelocity * deltaTime * MOVEMENT.WORLD_SCROLL_FACTOR;
        
        // Update distance display
        this.distance = Math.floor(this.worldOffset / 10);
        this.distanceText.setText(`Distance: ${this.distance}m`);
    }

    updateBackgroundScrolling() {
        if (!this.backgroundSprite) return;
        
        // This is the ONLY line you need for perfect horizontal looping
        this.backgroundSprite.tilePositionX = this.backgroundOffset;
    }

    applyPhysics(deltaTime) {
        if (this.isThrusting) {
            // Thrusting: apply upward force and normal gravity
            this.bird.setVelocityY(PHYSICS.THRUST);
            this.physics.world.gravity.y = PHYSICS.GRAVITY;
        } else {
            // Gliding: use reduced gravity for smoother descent
            this.physics.world.gravity.y = PHYSICS.GLIDE_GRAVITY;
        }
    }
}

// Game configuration
const config = {
    type: Phaser.AUTO,
    width: GAME.WIDTH,
    height: GAME.HEIGHT,
    scene: GameScene,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 }, // We'll set this in the scene
            debug: false
        }
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: GAME.WIDTH,
        height: GAME.HEIGHT
    }
};

// Start the game
const game = new Phaser.Game(config);