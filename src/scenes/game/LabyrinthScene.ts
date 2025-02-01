import { Scene } from 'phaser';

export class LabyrinthScene extends Scene {
    private player!: Phaser.GameObjects.Rectangle;
    private walls: Phaser.GameObjects.Rectangle[] = [];
    private fogLayer: Phaser.GameObjects.Rectangle[][] = [];
    private visitedTiles: boolean[][] = [];
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasdKeys!: {
        W: Phaser.Input.Keyboard.Key;
        A: Phaser.Input.Keyboard.Key;
        S: Phaser.Input.Keyboard.Key;
        D: Phaser.Input.Keyboard.Key;
    };
    
    private readonly CELL_SIZE = 32;
    private readonly GRID_WIDTH = 31;
    private readonly GRID_HEIGHT = 23;
    private readonly VISIBILITY_RADIUS = 1;

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
        
        // Create walls
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

        // Create fog of war
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

        // Create player
        this.player = this.add.rectangle(
            this.CELL_SIZE + this.CELL_SIZE / 2,
            this.CELL_SIZE + this.CELL_SIZE / 2,
            this.CELL_SIZE / 2,
            this.CELL_SIZE / 2,
            0xff0000
        );

        // Setup input
        this.wasdKeys = this.input.keyboard.addKeys('W,A,S,D') as any;
        this.cursors = this.input.keyboard.createCursorKeys();

        // Update fog around initial player position
        this.updateFogOfWar();
    }

    update() {
        const speed = 4;
        let moved = false;

        // Handle movement
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

        // Check wall collisions
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

        // Update fog of war if player moved
        if (moved) {
            this.updateFogOfWar();
        }
    }

    private generateMaze(): number[][] {
        // Initialize the maze with all walls
        const maze: number[][] = Array(this.GRID_HEIGHT).fill(0).map(() => 
            Array(this.GRID_WIDTH).fill(1)
        );
        
        const stack: [number, number][] = [];
        const startX = 2;  
        const startY = 2;
        
        // Create initial 3x3 open area
        for(let y = startY-1; y <= startY+1; y++) {
            for(let x = startX-1; x <= startX+1; x++) {
                maze[y][x] = 0;
            }
        }
        
        stack.push([startX, startY]);

        while (stack.length > 0) {
            const [currentX, currentY] = stack[stack.length - 1];
            const neighbors: [number, number][] = [];

            // Check neighbors with spacing for 3-wide corridors
            const directions = [
                [0, -3], // Up
                [3, 0],  // Right
                [0, 3],  // Down
                [-3, 0]  // Left
            ];

            for (const [dx, dy] of directions) {
                const newX = currentX + dx;
                const newY = currentY + dy;
                if (
                    newX > 1 && newX < this.GRID_WIDTH - 2 &&
                    newY > 1 && newY < this.GRID_HEIGHT - 2 &&
                    maze[newY][newX] === 1 &&
                    this.countAdjacentPaths(maze, newX, newY) <= 1
                ) {
                    neighbors.push([newX, newY]);
                }
            }

            if (neighbors.length > 0) {
                const [nextX, nextY] = neighbors[Math.floor(Math.random() * neighbors.length)];
                
                // Carve 3-wide path between current and next cell
                const minX = Math.min(currentX, nextX);
                const maxX = Math.max(currentX, nextX);
                const minY = Math.min(currentY, nextY);
                const maxY = Math.max(currentY, nextY);
                
                for(let y = minY-1; y <= maxY+1; y++) {
                    for(let x = minX-1; x <= maxX+1; x++) {
                        if (x >= 0 && x < this.GRID_WIDTH && y >= 0 && y < this.GRID_HEIGHT) {
                            maze[y][x] = 0;
                        }
                    }
                }
                
                stack.push([nextX, nextY]);
            } else {
                stack.pop();
            }
        }

        return maze;
    }

    private countAdjacentPaths(maze: number[][], x: number, y: number): number {
        let count = 0;
        const directions = [
            [0, -3], // Up
            [3, 0],  // Right
            [0, 3],  // Down
            [-3, 0]  // Left
        ];

        for (const [dx, dy] of directions) {
            const newX = x + dx;
            const newY = y + dy;
            if (
                newX >= 0 && newX < this.GRID_WIDTH &&
                newY >= 0 && newY < this.GRID_HEIGHT &&
                maze[newY][newX] === 0
            ) {
                count++;
            }
        }
        return count;
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
                    // Currently visible tiles
                    this.fogLayer[y][x].setAlpha(0);
                } else if (this.visitedTiles[y][x]) {
                    // Previously visited tiles
                    this.fogLayer[y][x].setAlpha(0.5);
                } else {
                    // Unexplored tiles
                    this.fogLayer[y][x].setAlpha(1);
                }
            }
        }
    }
}
