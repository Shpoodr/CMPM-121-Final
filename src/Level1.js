import { BaseScene } from './BaseScene';

export class Level1 extends BaseScene {
  constructor() {
    super('Level1');
  }

  // 1. NEW: Preload assets to ensure they are cached for fast reloading
  preload() {
    super.preload();

    this.third.load.preload('cube', 'src/assets/cube.glb');
    this.third.load.preload('flag', 'src/assets/flag.glb');
    this.third.load.preload('platform', 'src/assets/platform.glb');
  }

  // 2. NEW: Async Create allows us to wait for objects to exist before moving on
  async createLevel() {
    //start with environment setup
    this.warpSpeed('-ground');

    //define player start position for base scene
    this.startPosition = { x: 9, y: 3, z: 0 };

    //custom kill Floor
    this.floor = this.third.add.box({
      width: 100,
      height: 1,
      depth: 100,
      y: -10,
      color: 0xffffff,
    });
    this.third.physics.add.existing(this.floor, { mass: 0 });

    //loading level objects
    await this.loadStaticLevel();
    await this.spawnCube();
    this.spawnKey();
  }

  // --- SPAWN FUNCTIONS (Refactored to Async) ---

  spawnKey() {
    //placeHolder object for the key
    const key = this.third.add.box({
      x: 5,
      y: 1,
      z: 5,
      width: 0.5,
      height: 0.5,
      depth: 0.5,
      color: 0xff0000,
    });

    key.name = 'key';
    this.third.physics.add.existing(key, { mass: 0 });

    key.userData = { isInteractable: true };
  }

  async spawnCube() {
    const gltf = await this.third.load.gltf('cube');
    const helper = gltf.scene.clone();

    helper.scale.set(1, 1, 1);
    helper.position.set(5, 2, 0);

    this.third.add.existing(helper);
    this.third.physics.add.existing(helper, {
      shape: 'box',
      width: 2,
      depth: 2,
      height: 2,
      mass: 1,
    });

    this.helper = helper;

    // Collision with Floor
    this.third.physics.add.collider(this.helper, this.floor, () => {
      this.displayEndScreen('GAME OVER', '#ff0000');
    });
  }

  async loadStaticLevel() {
    // Flag
    const flagGltf = await this.third.load.gltf('flag');
    this.flag = flagGltf.scene.clone();
    this.flag.scale.set(1, 1, 1);
    this.flag.position.set(-9, 5.5, 0);
    this.third.add.existing(this.flag);
    this.third.physics.add.existing(this.flag, {
      shape: 'box',
      width: 1.2,
      depth: 1.2,
      height: 7.6,
      mass: 0,
    });

    // Platforms
    // Helper to spawn individual platforms
    const spawnPlat = async (x) => {
      const platGltf = await this.third.load.gltf('platform');
      const p = platGltf.scene.clone();
      p.scale.set(1, 1, 1);
      p.position.set(x, 1, 0);
      this.third.add.existing(p);
      this.third.physics.add.existing(p, {
        shape: 'box',
        width: 8,
        height: 2,
        depth: 2,
        mass: 0,
      });
    };

    await spawnPlat(6);
    await spawnPlat(-6);
  }
}
