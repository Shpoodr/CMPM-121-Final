import Phaser from 'phaser';
import { enable3d, Canvas, Scene3D } from '@enable3d/phaser-extension';
import { Player } from './Player'; 

export class MainScene extends Scene3D {
  constructor() {
    super({ key: 'MainScene' });
    this.player = null; 
    this.helper = null;
    this.flag = null;
    this.floor = null; 
    
    this.isGameOver = false; 
    this.uiElements = []; 
  }

  init() {
    this.accessThirdDimension();
  }

  // 1. NEW: Preload assets to ensure they are cached for fast reloading
  preload() {
    this.third.load.preload('chip', 'assets/chip.glb');
    this.third.load.preload('cube', 'assets/cube.glb');
    this.third.load.preload('flag', 'assets/flag.glb');
    this.third.load.preload('platform', 'assets/platform.glb');
  }

  // 2. NEW: Async Create allows us to wait for objects to exist before moving on
  async create() {
    this.third.physics.debug?.enable();
    this.isGameOver = false;
    this.uiElements = [];

    // Setup Environment
    this.warpSpeed('-ground'); 

    // Custom Kill Floor
    this.floor = this.third.add.box({ 
      width: 100, height: 1, depth: 100, y: -10,
      color: 0xffffff 
    });
    this.third.physics.add.existing(this.floor, { mass: 0 }); // Static

    // 3. Load Level Objects synchronously using Await
    // This ensures they exist before the game loop starts
    await this.loadStaticLevel();
    await this.spawnCube();
    await this.spawnPlayer();
  }

  // --- SPAWN FUNCTIONS (Refactored to Async) ---

  async spawnPlayer() {
    // We load from the cache key 'chip' defined in preload
    const gltf = await this.third.load.gltf('chip');
    const chip = gltf.scene.clone();
    
    chip.name = 'player';
    chip.scale.set(1, 1, 1);      
    chip.position.set(9, 3, 0);   
    chip.rotation.y = Math.PI; 

    this.third.add.existing(chip);
    this.third.physics.add.existing(chip, { 
      shape: 'box', height: 2.5, width: 1.6, depth: 1.6, mass: 1
    });

    this.player = new Player(this, chip);
    
    // Collision with Floor
    this.third.physics.add.collider(chip, this.floor, () => {
      this.displayEndScreen("GAME OVER", "#ff0000"); 
    });
  }

  async spawnCube() {
    const gltf = await this.third.load.gltf('cube');
    const helper = gltf.scene.clone();

    helper.scale.set(1, 1, 1);      
    helper.position.set(5, 2, 0);   
    
    this.third.add.existing(helper);
    this.third.physics.add.existing(helper, { 
      shape: 'box', width: 2, depth: 2, height: 2, mass: 1
    });

    this.helper = helper; 

    // Collision with Floor
    this.third.physics.add.collider(this.helper, this.floor, () => {
      this.displayEndScreen("GAME OVER", "#ff0000"); 
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
      shape: 'box', width: 1.2, depth: 1.2, height: 7.6, mass: 0
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
        shape: 'box', width: 8, height: 2, depth: 2, mass: 0
      });
    };

    await spawnPlat(6);
    await spawnPlat(-6);
  }


  // --- UI & RESET LOGIC ---

  displayEndScreen(text, color) {
    if (this.isGameOver) return; 
    this.isGameOver = true;

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const t1 = this.add.text(width / 2, height / 2 - 50, text, {
      fontSize: '64px', fontStyle: 'bold', color: color,
      stroke: '#000000', strokeThickness: 6
    }).setOrigin(0.5);

    const t2 = this.add.text(width / 2, height / 2 + 50, 'Click to Restart', {
      fontSize: '32px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 4
    }).setOrigin(0.5);

    this.uiElements.push(t1, t2);

    this.input.once('pointerdown', () => {
      this.resetLevel();
    });
  }

  resetLevel() {
    console.log("Resetting Level...");
    // 4. FIX: Instead of manual cleanup, we restart the scene.
    // This wipes the physics world and memory cleanly.
    this.scene.restart();
  }

  update() {
    if (this.isGameOver) return;

    // 5. Safety Checks: Use optional chaining (?.) 
    // to prevent crashes during the split-second the scene restarts
    if (this.player?.object?.body) {
      this.player.update();
      this.third.camera.lookAt(this.player.object.position);

      // WIN CONDITION
      if (this.flag) {
        const dist = this.player.object.position.distanceTo(this.flag.position);
        if (dist < 2.5) {
          this.displayEndScreen("YOU WIN!", "#00ff00");
        }
      }

      // Fallback: If player falls into void
      if (this.player.object.position.y < -30) {
        this.displayEndScreen("GAME OVER", "#ff0000");
      }
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
    debug: true 
  },
  scene: [MainScene],
  ...Canvas(),
};

window.addEventListener('load', () => {
  enable3d(() => new Phaser.Game(config)).withPhysics('lib');
});