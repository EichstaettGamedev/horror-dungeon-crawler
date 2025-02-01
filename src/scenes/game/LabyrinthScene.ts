import { Scene } from 'phaser';
import { CoinHelper } from './coinHelper';

export class LabyrinthScene extends Scene {
    private player!: Phaser.GameObjects.Sprite;
    private walls: Phaser.GameObjects.Rectangle[] = [];
    private fogLayer: Phaser.GameObjects.Rectangle[][] = [];
    private visitedTiles: boolean[][] = [];
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private coinHelper!: CoinHelper;
    private wasdKeys!: {
        W: Phaser.Input.Keyboard.Key;
        A: Phaser.Input.Keyboard.Key;
        S: Phaser.Input.Keyboard.Key;
        D: Phaser.Input.Keyboard.Key;
    };
    
    private readonly CELL_SIZE = 32;
    private readonly GRID_WIDTH = 31;
    private readonly GRID_HEIGHT = 23;
    private readonly VISIBILITY_RADIUS = 10;

    constructor() {
        super({ key: 'LabyrinthScene' });
    }

    create() {
        // Generate maze using recursive backtracking
        const maze = this.generateMaze();
        
        // Initialize visited tiles grid
        this.visitedTiles = Array(this.GRID_HEIGHT).fill(0).map(() => 
            Array(this.GRID_WIDTH).fill(false)
        );

        this.coinHelper = new CoinHelper(this, this.CELL_SIZE);
        this.coinHelper.initializeCoinCounter();
        
        // Create walls
        this.CreateWalls(maze);
        this.CreateFogOfWar();
        this.CreatePlayer();
        this.coinHelper.createCoins(maze, this.GRID_WIDTH, this.GRID_HEIGHT);

        // Setup input
        if (this.input.keyboard) {
            this.wasdKeys = this.input.keyboard.addKeys('W,A,S,D') as any;
            this.cursors = this.input.keyboard.createCursorKeys();
        }

        // Update fog around initial player position
        this.updateFogOfWar();
    }

    private CreateWalls(maze: number[][]) {
        for (let y = 0; y < this.GRID_HEIGHT; y++) {
            for (let x = 0; x < this.GRID_WIDTH; x++) {
                if (maze[y][x] === 1) {
                    const wall = this.add.rectangle(
                        x * this.CELL_SIZE + this.CELL_SIZE / 2,
                        y * this.CELL_SIZE + this.CELL_SIZE / 2,
                        this.CELL_SIZE,
                        this.CELL_SIZE,
                        0x00ff00
                    );
                    this.walls.push(wall);
                } else {
                    // Add floor tiles
                    this.add.rectangle(
                        x * this.CELL_SIZE + this.CELL_SIZE / 2,
                        y * this.CELL_SIZE + this.CELL_SIZE / 2,
                        this.CELL_SIZE,
                        this.CELL_SIZE,
                        0x808080
                    );
                }
            }
        }
    }

    private CreateFogOfWar() {
        this.fogLayer = [];
        for (let y = 0; y < this.GRID_HEIGHT; y++) {
            this.fogLayer[y] = [];
            for (let x = 0; x < this.GRID_WIDTH; x++) {
                const fog = this.add.rectangle(
                    x * this.CELL_SIZE + this.CELL_SIZE / 2,
                    y * this.CELL_SIZE + this.CELL_SIZE / 2,
                    this.CELL_SIZE,
                    this.CELL_SIZE,
                    0x000000
                );
                this.fogLayer[y][x] = fog;
            }
        }
    }

    private CreatePlayer() {
        this.player = this.add.sprite(
            this.CELL_SIZE + this.CELL_SIZE / 2,
            this.CELL_SIZE + this.CELL_SIZE / 2,
            'packed',
            'player_0'
        );
        
        // Add the walking animation
        this.anims.create({
            key: 'player_animated',
            frames: [
                { key: 'packed', frame: 'player_0' },
                { key: 'packed', frame: 'player_1' },
                { key: 'packed', frame: 'player_2' },
                { key: 'packed', frame: 'player_1' }
            ],
            frameRate: 6,
            repeat: -1
        });
        
        // Start the animation
        this.player.play('player_animated');
        
        // Scale the player to fit nicely in the cell, 10% smaller than before
        this.player.setScale(this.CELL_SIZE / 128 * 0.8);  // Reduced by 10%
    }

    update() {
        const speed = 4;
        let moved = false;

        moved = this.HandleButtonDown(speed, moved);
        this.CheckForWallCollisions(speed);
        this.coinHelper.checkCollisions(this.player);

        // Update fog of war if player moved
        if (moved) {
            this.updateFogOfWar();
        }
    }

    private CheckForWallCollisions(speed: number) {
        this.walls.forEach(wall => {
            const bounds = wall.getBounds();
            const playerBounds = this.player.getBounds();
            if (Phaser.Geom.Rectangle.Overlaps(bounds, playerBounds)) {
                // Move player back
                if (this.wasdKeys.A.isDown || this.cursors.left.isDown) this.player.x += speed;
                if (this.wasdKeys.D.isDown || this.cursors.right.isDown) this.player.x -= speed;
                if (this.wasdKeys.W.isDown || this.cursors.up.isDown) this.player.y += speed;
                if (this.wasdKeys.S.isDown || this.cursors.down.isDown) this.player.y -= speed;
            }
        });
    }

    private HandleButtonDown(speed: number, moved: boolean) {
        if (this.wasdKeys.A.isDown || this.cursors.left.isDown) {
            this.player.x -= speed;
            moved = true;
        }
        if (this.wasdKeys.D.isDown || this.cursors.right.isDown) {
            this.player.x += speed;
            moved = true;
        }
        if (this.wasdKeys.W.isDown || this.cursors.up.isDown) {
            this.player.y -= speed;
            moved = true;
        }
        if (this.wasdKeys.S.isDown || this.cursors.down.isDown) {
            this.player.y += speed;
            moved = true;
        }
        return moved;
    }

    private generateMaze(): number[][] {
        // Initialize the maze with all walls
        const maze: number[][] = Array(this.GRID_HEIGHT).fill(0).map(() => 
            Array(this.GRID_WIDTH).fill(1)
        );
        
        const stack: { x: number; y: number }[] = [];
        const visited: boolean[][] = Array(this.GRID_HEIGHT).fill(false).map(() => 
            Array(this.GRID_WIDTH).fill(false)
        );
        
        // Start from (1,1) to ensure border walls
        const startX = 1;
        const startY = 1;
        stack.push({ x: startX, y: startY });
        visited[startY][startX] = true;
        maze[startY][startX] = 0;

        const directions = [
            [0, -2], // Up
            [2, 0],  // Right
            [0, 2],  // Down
            [-2, 0]  // Left
        ];

        // Function to get valid neighbors
        const getUnvisitedNeighbors = (x: number, y: number) => {
            const neighbors: { x: number; y: number; dx: number; dy: number }[] = [];
            for (const [dx, dy] of directions) {
                const newX = x + dx;
                const newY = y + dy;
                if (
                    newX > 0 && newX < this.GRID_WIDTH - 1 &&
                    newY > 0 && newY < this.GRID_HEIGHT - 1 &&
                    !visited[newY][newX]
                ) {
                    neighbors.push({ x: newX, y: newY, dx, dy });
                }
            }
            return neighbors;
        };

        this.CreateOriginalMaze(stack, getUnvisitedNeighbors, maze, visited);
        this.CreateLoopsForMaze(maze);

        return maze;
    }

    private CreateOriginalMaze(stack: { x: number; y: number; }[], getUnvisitedNeighbors: (x: number, y: number) => { x: number; y: number; dx: number; dy: number; }[], maze: number[][], visited: boolean[][]) {
        while (stack.length > 0) {
            const current = stack[stack.length - 1];
            const neighbors = getUnvisitedNeighbors(current.x, current.y);

            if (neighbors.length > 0) {
                // Choose a random neighbor
                const next = neighbors[Math.floor(Math.random() * neighbors.length)];

                // Create a passage
                maze[current.y + next.dy / 2][current.x + next.dx / 2] = 0;
                maze[next.y][next.x] = 0;

                visited[next.y][next.x] = true;
                stack.push({ x: next.x, y: next.y });
            } else {
                stack.pop();
            }
        }
    }

    private CreateLoopsForMaze(maze: number[][]) {
        // Add loops by connecting parallel corridors
        const LOOP_CHANCE = 0.08; // 20% chance for each potential connection

        // First pass: horizontal connections
        for (let y = 2; y < this.GRID_HEIGHT - 2; y++) {
            for (let x = 2; x < this.GRID_WIDTH - 2; x++) {
                // Look for parallel horizontal corridors
                if (maze[y][x] === 1 && // current cell is a wall
                    maze[y-1][x] === 0 && // corridor above
                    maze[y+1][x] === 0 && // corridor below
                    Math.random() < LOOP_CHANCE) {
                    // Create a vertical connection
                    maze[y][x] = 0;
                }
            }
        }

        // Second pass: vertical connections
        for (let y = 2; y < this.GRID_HEIGHT - 2; y++) {
            for (let x = 2; x < this.GRID_WIDTH - 2; x++) {
                // Look for parallel vertical corridors
                if (maze[y][x] === 1 && // current cell is a wall
                    maze[y][x-1] === 0 && // corridor to the left
                    maze[y][x+1] === 0 && // corridor to the right
                    Math.random() < LOOP_CHANCE) {
                    // Create a horizontal connection
                    maze[y][x] = 0;
                }
            }
        }
    }

    private updateFogOfWar() {
        const playerGridX = Math.floor(this.player.x / this.CELL_SIZE);
        const playerGridY = Math.floor(this.player.y / this.CELL_SIZE);

        // Update visited tiles around player
        for (let y = playerGridY - this.VISIBILITY_RADIUS; y <= playerGridY + this.VISIBILITY_RADIUS; y++) {
            for (let x = playerGridX - this.VISIBILITY_RADIUS; x <= playerGridX + this.VISIBILITY_RADIUS; x++) {
                if (x >= 0 && x < this.GRID_WIDTH && y >= 0 && y < this.GRID_HEIGHT) {
                    this.visitedTiles[y][x] = true;
                }
            }
        }

        // Update fog visibility
        for (let y = 0; y < this.GRID_HEIGHT; y++) {
            for (let x = 0; x < this.GRID_WIDTH; x++) {
                const distance = Math.sqrt(
                    Math.pow(x - playerGridX, 2) + 
                    Math.pow(y - playerGridY, 2)
                );
                
                if (distance <= this.VISIBILITY_RADIUS) {
                    this.fogLayer[y][x].setAlpha(0);
                } else if (this.visitedTiles[y][x]) {
                    this.fogLayer[y][x].setAlpha(0.5);
                } else {
                    this.fogLayer[y][x].setAlpha(1);
                }
            }
        }

        this.coinHelper.updateVisibility(playerGridX, playerGridY, this.visitedTiles, this.VISIBILITY_RADIUS);
    }
}
