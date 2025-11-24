# NYC Pigeon Game - Initial Prototype

## Core Concept
Side-scrolling flying game where you control a pigeon navigating through NYC.

## Controls
- HOLD mouse/touch: Pigeon rises (apply upward force)
- RELEASE: Pigeon falls (gravity takes over)
- Goal: Smooth, flowing movement through urban obstacles

## Phase 1 Prototype Scope

### Gameplay
- Pigeon sprite (placeholder rectangle for now)
- Continuous horizontal scrolling (auto-moves right)
- Hold/release vertical control
- Basic physics: gravity + upward thrust when holding
- Simple obstacles: buildings with gaps to fly through
- Game over on collision with obstacle
- Distance counter

### Technical Requirements
- Phaser 3
- Single game scene
- Physics-based movement (not animation-based)
- Scrolling background (can be solid color gradient)
- Touch and mouse input support

### Visual (Placeholder for Now)
- Pigeon: simple colored circle/rectangle
- Buildings: rectangles
- Background: gradient or solid color
- Parallax not required yet

### NOT in Phase 1
- Collectibles
- Score system beyond distance
- Multiple neighborhoods/scenes
- Final art assets
- Sound
- Menus

## Success Criteria
Can play for 30 seconds and the flight feels satisfying. That's it.

## Physics Tuning Parameters to Expose
- Gravity strength
- Upward thrust strength  
- Horizontal scroll speed
- Pigeon momentum/drag
- Gap size between buildings
- Building spawn frequency