import { BaseScene } from './BaseScene';
import { THREE } from '@enable3d/phaser-extension';

export class Level1 extends BaseScene {
  constructor() {
    super('Level1');
    this.assetPrefix = '';
  }

  preload() {
    super.preload();

    //light mode assets
    this.third.load.preload('cube', 'assets/cube.glb');
    this.third.load.preload('flag', 'assets/flag.glb');
    this.third.load.preload('platform', 'assets/platform.glb');
    this.third.load.preload('key', 'assets/key.glb');

    //dark mode assets
    this.third.load.preload('dark-cube', 'assets/dark-cube.glb');
    this.third.load.preload('dark-flag', 'assets/dark-flag.glb');
    this.third.load.preload('dark-platform', 'assets/dark-platform.glb');
    this.third.load.preload('dark-key', 'assets/dark-key.glb');

  }

  async createLevel() {
    const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    this.assetPrefix = isDark ? 'dark-' : '';

    console.log(`[Level1] Theme detected: ${isDark ? 'Dark' : 'Light'}`);
    console.log(`[Level1] Using asset prefix: '${this.assetPrefix}'`);

    const warpParams = ['-ground', '-orbitControls'];
    if (isDark) {
      warpParams.push('-sky');
    }
    const { lights } = await this.warpSpeed(...warpParams);

    if (isDark) {
      this.third.scene.background = new THREE.Color(0x152633);
      lights.hemisphereLight.intensity = 0.1;
      lights.ambientLight.intensity = 0.1;
      lights.directionalLight.intensity = 0.1;
    }

    this.player = super.player;
    this.startPosition = { x: 11, y: 3, z: 0 };

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
    await this.spawnKey();
  }

  // --- SPAWN FUNCTIONS (Refactored to Async) ---

  async spawnKey() {
    if (this.inventory.includes('key')) {
      console.log('Key already in inventory. Skipping spawn.');
      return; 
    }

    const keyGltf = await this.third.load.gltf(`key`);
    const key = keyGltf.scene.clone();

    key.name = 'key'; 
    key.scale.set(1, 1, 1);
    key.position.set(8, 9.5, 0);

    this.third.add.existing(key);
    this.third.physics.add.existing(key, {
      shape: 'box',
      width: 0.5,
      depth: 0.5,
      height: 2,
      mass: 0,
    });

    key.userData = { isInteractable: true };
    this.key = key;
  }

  async spawnCube() {
    const gltf = await this.third.load.gltf(`${this.assetPrefix}cube`);
    const helper = gltf.scene.clone();

    helper.scale.set(1, 1, 1);
    helper.position.set(8, 2, 0);

    this.third.add.existing(helper);
    this.third.physics.add.existing(helper, {
      shape: 'box',
      width: 2,
      depth: 2,
      height: 2,
      mass: 5,
    });

    this.helper = helper;

    this.third.physics.add.collider(this.helper, this.floor, () => {
      this.displayEndScreen('game_over', '#ff0000');
    });
  }

  async loadStaticLevel() {
    const flagGltf = await this.third.load.gltf(`${this.assetPrefix}flag`);
    this.flag = flagGltf.scene.clone();
    this.flag.scale.set(1, 1, 1);
    this.flag.position.set(-12, 5.8, 0);
    this.third.add.existing(this.flag);
    this.third.physics.add.existing(this.flag, {
      shape: 'box',
      width: 1.2,
      depth: 1.2,
      height: 7.6,
      mass: 0,
    });

    const spawnPlat = async (x) => {
      const platGltf = await this.third.load.gltf(`${this.assetPrefix}platform`);
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

    await spawnPlat(8);
    await spawnPlat(-9);
  }
}
