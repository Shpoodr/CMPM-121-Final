import Phaser from 'phaser';
import { enable3d, Canvas, Scene3D, THREE } from '@enable3d/phaser-extension';

class MainScene extends Scene3D {
  constructor() {
    super({ key: 'MainScene' });
  }

  init() {
    this.accessThirdDimension();
  }

  create() {
    // 1. Setup the 3D Environment
    // We use THREE here to verify the library is accessible to the team.
    // This line satisfies the linter because we are actually using 'THREE'.
    const platformColor = new THREE.Color(0x808080); // Gray

    // 2. Create a 3D Platform (Static Physics Body)
    this.third.physics.add.box(
      { x: 0, y: -2, z: 0, width: 10, height: 1, depth: 10 },
      { lambert: { color: platformColor } } // We pass the THREE.Color object here
    );

    // 3. Create a 3D Box (Dynamic Physics Body)
    this.third.physics.add.box({ x: 0, y: 5, z: 0 }, { lambert: { color: 'blue' } });

    // 4. Add a standard Phaser 2D text on top
    this.add.text(10, 10, 'Phaser + Three.js + Ammo.js', { color: '#ffffff' });
  }
}

const config = {
  type: Phaser.WEBGL,
  transparent: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
  },
  scene: [MainScene],
  ...Canvas(),
};

window.addEventListener('load', () => {
  enable3d(() => new Phaser.Game(config)).withPhysics('/lib');
});
