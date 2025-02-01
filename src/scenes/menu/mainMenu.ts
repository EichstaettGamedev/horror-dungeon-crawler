import options from '../../options';
import { Scene } from 'phaser';

const introHTML = `<h1>Horror dungeon crawler</h1>
<br/>
<p>Navigate through the dark labyrinth using WASD keys. Be careful, you can only see what's directly around you!</p>`;

const gitHubLink =
    'https://github.com/Melchizedek6809/vite-phaser-typescript-starter';
const phaserLink = 'https://phaser.io/';

export class MainMenuScene extends Scene {
    constructor(config: Phaser.Types.Scenes.SettingsConfig) {
        if (!config) {
            config = {};
        }
        config.key = 'MainMenuScene';
        super(config);
    }

    startGame() {
        this.scene.run('UIScene');
        this.scene.switch('LabyrinthScene');
    }

    addCreditsLinks() {
        const $links = document.createElement('div');
        $links.innerHTML = `<a href="${gitHubLink}" target="_blank" class="github-link" title="Source code available on GitHub"></a>`;
        $links.innerHTML += `<a href="${phaserLink}" target="_blank" class="phaser-link" title="Made with the Phaser framework"></a>`;
        this.add.dom(this.scale.width - 128, this.scale.height - 48, $links);
    }

    create() {
        if (options.skipMenu) {
            this.startGame();
        }
        this.addCreditsLinks();

        const buttons = '<br/><br/><button class="green-button">Enter the labyrinth</button>';
        const $intro = document.createElement('div');
        $intro.classList.add('main-menu-text');
        $intro.innerHTML = introHTML + buttons;
        this.add.dom(this.scale.width / 2, 96, $intro).setOrigin(0.5, 0);
        const $button = $intro.querySelector(
            'button.green-button'
        ) as HTMLElement;
        if ($button) {
            $button.addEventListener('click', this.startGame.bind(this));
            $button.focus();
        }
    }

    update(time: number, delta: number) {
        const that = this;
        if (this.input.gamepad.gamepads[0]) {
            const gamepad = this.input.gamepad.gamepads[0];
            if (gamepad.A) {
                that.startGame();
            }
        }
    }
}
