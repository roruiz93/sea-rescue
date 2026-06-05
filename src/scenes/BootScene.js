// ============================================================
//  BootScene – Generates all procedural textures, then starts Menu.
// ============================================================
import { GraphicsFactory } from '../utils/GraphicsFactory.js';
import { AdMobManager }   from '../managers/AdMobManager.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  create() {
    // Set world bounds to screen size
    this.physics.world.setBounds(0, 0, this.scale.width, this.scale.height);

    // Generate all game textures (no external files needed)
    GraphicsFactory.generateAll(this);

    // Brief "loading" splash
    const { width: W, height: H } = this.scale;

    this.add.rectangle(0, 0, W, H, 0x0a2040).setOrigin(0);

    // Logo / title
    this.add.text(W / 2, H * 0.4, '🌊', { fontSize: '72px' }).setOrigin(0.5);
    this.add.text(W / 2, H * 0.56, 'SEA RESCUE', {
      fontSize: '36px',
      fontFamily: 'Arial',
      color: '#f9a825',
      stroke: '#000000',
      strokeThickness: 4,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(W / 2, H * 0.64, 'Cargando...', {
      fontSize: '16px', fontFamily: 'Arial', color: '#90caf9',
    }).setOrigin(0.5);

    // Inicializar AdMob y luego ir al menú
    AdMobManager.initialize().finally(() => {
      this.time.delayedCall(800, () => this.scene.start('MenuScene'));
    });
  }
}
