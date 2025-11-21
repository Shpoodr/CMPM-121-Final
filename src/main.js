import Phaser, { Loader } from 'phaser';
import { enable3d, Canvas, Scene3D, THREE } from '@enable3d/phaser-extension';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

export class MainScene extends Scene3D {
  constructor() {
    super({ key: 'MainScene' });
  }

  init() {
    this.accessThirdDimension();
  }

  create() {
    this.warpSpeed()

    this.third.physics.debug?.enable()

    this.third.load.gltf('src/assets/chip.glb').then((gltf) => {
      const chip = gltf.scene;

      chip.scale.set(1, 1, 1);      // Make it 2x bigger
      chip.position.set(9, 2, 0);   // Drop it from height of 5
      this.third.add.existing(chip);
      this.third.physics.add.existing(chip, { shape: 'convex'});
    })

    this.third.load.gltf('src/assets/cube.glb').then((gltf) => {
      const helper = gltf.scene;

      helper.scale.set(1, 1, 1);      // Make it 2x bigger
      helper.position.set(5, 2, 0);   // Drop it from height of 5
      this.third.add.existing(helper);
      this.third.physics.add.existing(helper, { 
        shape: 'box',
        width: 2,
        depth: 2,
        height: 2,
      });
    })

    this.third.load.gltf('src/assets/flag.glb').then((gltf) => {
      const flag = gltf.scene;

      flag.scale.set(1, 1, 1);      // Make it 2x bigger
      flag.position.set(-9, 1, 0);   // Drop it from height of 5
      this.third.add.existing(flag);
      this.third.physics.add.existing(flag, { 
        shape: 'convex',
      });
    })

    this.third.load.gltf('src/assets/platform.glb').then((gltf) => {
      const platform1 = gltf.scene;

      platform1.scale.set(1, 1, 1);      // Make it 2x bigger
      platform1.position.set(6, 1, 0);   // Drop it from height of 5
      this.third.add.existing(platform1);
      this.third.physics.add.existing(platform1, { 
        shape: 'box',
        width: 8,
        height: 2,
        depth: 2,
      });
    })

    this.third.load.gltf('src/assets/platform.glb').then((gltf) => {
      const platform2 = gltf.scene;

      platform2.scale.set(1, 1, 1);      // Make it 2x bigger
      platform2.position.set(-6, 1, 0);   // Drop it from height of 5
      this.third.add.existing(platform2);
      this.third.physics.add.existing(platform2, { 
        shape: 'box',
        width: 8,
        height: 2,
        depth: 2,
      });
    })
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
  enable3d: {
    ammo: {
      gravity: { x: 0, y: -9.81, z: 0 },
    },
    debug: true  // <--- This enables the wireframes
  },
  scene: [MainScene],
  ...Canvas(),
};

window.addEventListener('load', () => {
  enable3d(() => new Phaser.Game(config)).withPhysics('/lib');
});
