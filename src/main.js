import Phaser, { Loader } from 'phaser';
import { enable3d, Canvas, Scene3D, THREE } from '@enable3d/phaser-extension';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Player } from './Player'; 

export class MainScene extends Scene3D {
  constructor() {
    super({ key: 'MainScene' });
    this.player = null; 
  }

  init() {
    this.accessThirdDimension();
  }

  create() {
    this.warpSpeed();
    this.third.physics.debug?.enable();

    // Player
    this.third.load.gltf('src/assets/chip.glb').then((gltf) => {
      const chip = gltf.scene;

      chip.scale.set(1, 1, 1);      // Make it 2x bigger
      chip.position.set(9, 3, 0);   // Drop it from height of 5
      this.third.add.existing(chip);
      chip.rotation.y = Math.PI;    // Fliped the player to face the camera
      this.third.add.existing(chip); 
      this.third.physics.add.existing(chip, { 
        shape: 'box',
        height: 2.5,
        width: 1.6,
        depth: 1.6
      });

      this.player = new Player(this, chip);
      this.third.camera.lookAt(chip.position);
    })

    this.third.load.gltf('src/assets/cube.glb').then((gltf) => {
      const helper = gltf.scene;
      helper.scale.set(1, 1, 1);      
      helper.position.set(5, 2, 0);   
      this.third.add.existing(helper);
      this.third.physics.add.existing(helper, { 
        shape: 'box',
        width: 2,
        depth: 2,
        height: 2,
      });
    });

    this.third.load.gltf('src/assets/flag.glb').then((gltf) => {
      const flag = gltf.scene;

      flag.scale.set(1, 1, 1);      // Make it 2x bigger
      flag.position.set(-9, 5.5, 0);   // Drop it from height of 5
      this.third.add.existing(flag);
      this.third.physics.add.existing(flag, { 
        shape: 'box',
        width: 1.2,
        depth: 1.2,
        height: 7.6
      });
    });

    this.third.load.gltf('src/assets/platform.glb').then((gltf) => {
      const platform1 = gltf.scene;
      platform1.scale.set(1, 1, 1);      
      platform1.position.set(6, 1, 0);   
      this.third.add.existing(platform1);
      this.third.physics.add.existing(platform1, { 
        shape: 'box',
        width: 8,
        height: 2,
        depth: 2,
      });
    });

    this.third.load.gltf('src/assets/platform.glb').then((gltf) => {
      const platform2 = gltf.scene;
      platform2.scale.set(1, 1, 1);      
      platform2.position.set(-6, 1, 0);   
      this.third.add.existing(platform2);
      this.third.physics.add.existing(platform2, { 
        shape: 'box',
        width: 8,
        height: 2,
        depth: 2,
      });
    });
  }

  // Update Loop
  update() {
    if (this.player) {
      this.player.update();
      
      // Basic camera follow on the player
      this.third.camera.lookAt(this.player.object.position);
    }
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
    debug: true // This enables the wireframes
  },
  scene: [MainScene],
  ...Canvas(),
};

window.addEventListener('load', () => {
  enable3d(() => new Phaser.Game(config)).withPhysics('/lib');
});
