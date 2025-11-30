import Phaser from 'phaser';
import { enable3d, Canvas, Scene3D, THREE } from '@enable3d/phaser-extension';
import { Player } from './Player';

export class BaseScene extends Scene3D {
  constructor(key) {
    super({ key: key });
    this.player = null;
    this.floor = null;

    this.isGameOver = false;
    this.inventory = [];
    this.inventoryText = null;
    this.uiElements = [];
  }

  init() {
    this.accessThirdDimension();
    //inventory needs to be in the global scope to be access in other levels
    this.inventory = this.registry.get('inventory') || [];
  }

  preload() {
    //assets that will be commmon to all levels
    this.third.load.preload('chip', 'assets/chip.glb');
  }

  async create() {
    this.third.physics.debug?.enable();
    this.isGameOver = false;

    //setup the ui elements
    this.createUI();

    //start raycasting for interation
    this.input.on('pointerdown', (pointer) => this.handleInput(pointer));

    //start the basic level logic
    await this.createLevel();

    //spawn player
    const startX = this.startPosition ? this.startPosition.x : 0;
    const startY = this.startPosition ? this.startPosition.y : 5;
    const startZ = this.startPosition ? this.startPosition.z : 0;
    await this.spawnPlayer(startX, startY, startZ);
  }

  //this will be used by the child classes that create different levels
  async createLevel() {
    console.warn('creatLevel() should be overridden by the child scene');
  }

  // --- Player spawn function based on scene specific location ---

  async spawnPlayer(x, y, z) {
    // We load from the cache key 'chip' defined in preload
    const gltf = await this.third.load.gltf('chip');
    const chip = gltf.scene.clone();

    chip.name = 'player';
    chip.scale.set(1, 1, 1);
    chip.position.set(x, y, z);
    chip.rotation.y = Math.PI;

    this.third.add.existing(chip);
    this.third.physics.add.existing(chip, {
      shape: 'box',
      height: 2.5,
      width: 1.6,
      depth: 1.6,
      mass: 1,
    });

    this.player = new Player(this, chip);

    // Collision with Floor
    if (this.floor) {
      this.third.physics.add.collider(chip, this.floor, () => {
        this.displayEndScreen('GAME OVER', '#ff0000');
      });
    }
  }

  update() {
    if (this.isGameOver) return;

    // 5. Safety Checks: Use optional chaining (?.)
    // to prevent crashes during the split-second the scene restarts
    if (this.player && this.player.object && this.player.object.body) {
      this.player.update();
      this.third.camera.lookAt(this.player.object.position);

      /*// WIN CONDITION
      if (this.flag) {
        const dist = this.player.object.position.distanceTo(this.flag.position);
        if (dist < 2.5) {
          this.displayEndScreen('YOU WIN!', '#00ff00');
        }
      }*/

      // Fallback: If player falls into void
      if (this.player.object.position.y < -30) {
        this.displayEndScreen('GAME OVER', '#ff0000');
      }
    }
  }

  //F2 Requirement interaction system
  handleInput(pointer) {
    if (this.isGameOver) return;
    //calculate the mouse position
    const mouse = new THREE.Vector2();
    mouse.x = (pointer.x / this.cameras.main.width) * 2 - 1;
    mouse.y = -(pointer.y / this.cameras.main.height) * 2 + 1;

    //raycast from camera to mouse
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.third.camera);

    //fire ray in to 3d scene
    const intersects = raycaster.intersectObjects(this.third.scene.children, true);

    if (intersects.length > 0) {
      intersects.forEach((hit) => {
        const object = hit.object;

        //distance check so you can interact objects across map
        if (hit.distance < 20) {
          if (object.userData.isInteractable) {
            this.interactWith(object);
          }
        }
      });
    }
  }

  //actual interaction logic for previous function
  interactWith(object) {
    console.log('Interacted With', object.name);

    if (object.name.includes('key') || object.name.includes('item')) {
      this.addToInventory(object.name);
      //remove from the 3D world
      this.third.scene.remove(object);
      this.third.physics.destroy(object);
    }
  }

  //adding item to invetory (interaction function helper)
  addToInventory(itemName) {
    this.inventory.push(itemName);
    this.registry.set('inventory', this.inventory);
    this.updateInventoryUI();
  }

  createUI() {
    //simple inventory text display
    this.inventoryText = this.add.text(20, 20, 'Inventory: ' + this.inventory.join(', '), {
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#000000aa',
    });
    this.inventoryText.setScrollFactor(0);
  }

  updateInventoryUI() {
    if (this.inventoryText) {
      this.inventoryText.setText('Inventory: ' + this.inventory.join(', '));
    }
  }

  // --- UI & RESET LOGIC ---

  displayEndScreen(text, color) {
    if (this.isGameOver) return;
    this.isGameOver = true;

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const t1 = this.add
      .text(width / 2, height / 2 - 50, text, {
        fontSize: '64px',
        fontStyle: 'bold',
        color: color,
        stroke: '#000000',
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    const t2 = this.add
      .text(width / 2, height / 2 + 50, 'Click to Restart', {
        fontSize: '32px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    this.uiElements.push(t1, t2);

    this.input.once('pointerdown', () => {
      this.resetLevel();
    });
  }

  resetLevel() {
    console.log('Resetting Level...');
    // 4. FIX: Instead of manual cleanup, we restart the scene.
    // This wipes the physics world and memory cleanly.
    this.input.removeAllListeners();
    this.scene.restart();
  }

  //helper for switching rooms
  goToLevel(levelKey) {
    this.scene.start(levelKey);
  }
}
