import { Scene } from 'phaser';

export class CoinHelper {
    private coins: Phaser.GameObjects.Rectangle[] = [];
    private coinCount: number = 0;
    private coinText!: Phaser.GameObjects.Text;
    private readonly CELL_SIZE: number;
    private scene: Phaser.Scene;

    constructor(scene: Phaser.Scene, cellSize: number) {
        this.scene = scene;
        this.CELL_SIZE = cellSize;
    }

    public initializeCoinCounter() {
        this.coinText = this.scene.add.text(16, 16, 'Coins: 0', {
            fontSize: '32px',
            color: '#ffffff',
            fontStyle: 'bold'
        });
        this.coinText.setScrollFactor(0);
        this.coinText.setDepth(1000);
    }

    public createCoins(maze: number[][], gridWidth: number, gridHeight: number) {
        // Find all dead ends in the maze that are far from spawn
        let deadEnds: { x: number; y: number; distance: number }[] = [];
        const startX = 1;
        const startY = 1;
        const MIN_DISTANCE_FROM_SPAWN = Math.max(gridWidth, gridHeight) / 3;
        const MIN_DISTANCE_BETWEEN_COINS = Math.max(gridWidth, gridHeight) / 4;
        
        for (let y = 0; y < gridHeight; y++) {
            for (let x = 0; x < gridWidth; x++) {
                if (maze[y][x] === 0) {
                    // Check if it's a dead end
                    const exits = this.countExits(maze, x, y, gridWidth, gridHeight);
                    if (exits === 1) {  // Dead end has only one exit
                        // Calculate distance from spawn
                        const distanceFromSpawn = Math.sqrt(
                            Math.pow(x - startX, 2) + 
                            Math.pow(y - startY, 2)
                        );
                        // Only consider dead ends that are far enough from spawn
                        if (distanceFromSpawn >= MIN_DISTANCE_FROM_SPAWN) {
                            deadEnds.push({ x, y, distance: distanceFromSpawn });
                        }
                    }
                }
            }
        }

        deadEnds.sort((a, b) => b.distance - a.distance);

        const selectedPositions: { x: number; y: number }[] = [];
        const numberOfCoins = Math.min(3, deadEnds.length);

        for (const deadEnd of deadEnds) {
            if (selectedPositions.length >= numberOfCoins) break;

            let isFarEnough = true;
            for (const pos of selectedPositions) {
                const distanceToOtherCoin = Math.sqrt(
                    Math.pow(deadEnd.x - pos.x, 2) + 
                    Math.pow(deadEnd.y - pos.y, 2)
                );
                if (distanceToOtherCoin < MIN_DISTANCE_BETWEEN_COINS) {
                    isFarEnough = false;
                    break;
                }
            }

            if (isFarEnough) {
                selectedPositions.push({ x: deadEnd.x, y: deadEnd.y });
            }
        }

        for (const position of selectedPositions) {
            const coinSize = this.CELL_SIZE / 6;
            const coin = this.scene.add.rectangle(
                position.x * this.CELL_SIZE + this.CELL_SIZE / 2,
                position.y * this.CELL_SIZE + this.CELL_SIZE / 2,
                coinSize,
                coinSize,
                0xffff00
            );
            coin.setAlpha(0);
            this.coins.push(coin);
        }
    }

    private countExits(maze: number[][], x: number, y: number, gridWidth: number, gridHeight: number): number {
        let exits = 0;
        const directions = [
            [0, -1], // Up
            [1, 0],  // Right
            [0, 1],  // Down
            [-1, 0]  // Left
        ];

        for (const [dx, dy] of directions) {
            const newX = x + dx;
            const newY = y + dy;
            if (
                newX >= 0 && newX < gridWidth &&
                newY >= 0 && newY < gridHeight &&
                maze[newY][newX] === 0
            ) {
                exits++;
            }
        }
        return exits;
    }

    public checkCollisions(player: Phaser.GameObjects.Sprite) {
        const playerBounds = player.getBounds();
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const coin = this.coins[i];
            if (coin.alpha > 0 && Phaser.Geom.Rectangle.Overlaps(playerBounds, coin.getBounds())) {
                this.collectCoin(coin, i);
            }
        }
    }

    private collectCoin(coin: Phaser.GameObjects.Rectangle, index: number) {
        this.coinCount++;
        this.coinText.setText(`Coins: ${this.coinCount}`);
        this.playCoinSound();
        coin.destroy();
        this.coins.splice(index, 1);

        // Check if all coins are collected
        if (this.coinCount >= 3) {
            // Emit a custom event that the game is won
            this.scene.events.emit('gameWon');
        }
    }

    private playCoinSound() {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);
    }

    public updateVisibility(playerGridX: number, playerGridY: number, visitedTiles: boolean[][], visibilityRadius: number) {
        for (const coin of this.coins) {
            const coinGridX = Math.floor(coin.x / this.CELL_SIZE);
            const coinGridY = Math.floor(coin.y / this.CELL_SIZE);
            const distanceToCoin = Math.sqrt(
                Math.pow(coinGridX - playerGridX, 2) + 
                Math.pow(coinGridY - playerGridY, 2)
            );

            if (distanceToCoin <= visibilityRadius) {
                coin.setAlpha(1);
            } else if (visitedTiles[coinGridY][coinGridX]) {
                coin.setAlpha(0.5);
            } else {
                coin.setAlpha(0);
            }
        }
    }
}