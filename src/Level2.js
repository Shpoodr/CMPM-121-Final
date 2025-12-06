import { BaseScene } from './BaseScene';
import { THREE } from '@enable3d/phaser-extension';

export class Level2 extends BaseScene {
  constructor() {
    super('Level2');
    this.assetPrefix = '';
  }

  preload() {
    super.preload();

    //light mode assets
    this.third.load.preload('small', 'assets/small-platform.glb');
    this.third.load.preload('flag', 'assets/flag.glb');
    this.third.load.preload('platform', 'assets/platform.glb');

    //dark mode assets
    this.third.load.preload('dark-small', 'assets/dark-small.glb');
    this.third.load.preload('dark-flag', 'assets/dark-flag.glb');
    this.third.load.preload('dark-platform', 'assets/dark-platform.glb');
  }

  // 2. NEW: Async Create allows us to wait for objects to exist before moving on
  async createLevel() {
    const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
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

    //define player start position for base scene
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
  }

  // --- SPAWN FUNCTIONS (Refactored to Async) ---

  async loadStaticLevel() {
    // Flag
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

    // Platforms
    // Helper to spawn individual platforms
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

    const spawnSmall = async (x) => {
      const smallGlft = await this.third.load.gltf(`${this.assetPrefix}small`);
      const s = smallGlft.scene.clone();
      s.scale.set(1, 1, 1);
      s.position.set(x, 1, 0);
      this.third.add.existing(s);
      this.third.physics.add.existing(s, {
        shape: 'box',
        width: 2,
        height: 2,
        depth: 2,
        mass: 0,
      });
    };

    await spawnSmall(0);
    await spawnPlat(9);
    await spawnPlat(-9);
  }
}
