import Phaser from 'phaser';
import { enable3d, Scene3D, THREE } from '@enable3d/phaser-extension';
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
    console.warn('createLevel() should be overridden by the child scene');
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

      // WIN / LEVEL LOGIC
      if (this.flag) {
        const dist = this.player.object.position.distanceTo(this.flag.position);
        
        if (dist < 2.5) {
           // Takes us to level 2
           if (this.scene.key === 'Level1') {
             this.scene.start('Level2'); 
           } 
           // Check for the key
           else {
             if (this.inventory.includes('key')) {
                // WIN: Go back to Level 1 to restart the whole loop
                this.displayEndScreen('YOU WIN!', '#00ff00', 'Level1');
             } else {
                // FAIL: Go back to Level 1 because you missed the key
                this.displayEndScreen('NO KEY FOUND', '#ff0000', 'Level1');
             }
           }
        }
      }

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
    mouse.x = (pointer.x / this.scale.width) * 2 - 1;
    mouse.y = -(pointer.y / this.scale.height) * 2 + 1;

    //raycast from camera to mouse
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.third.camera);

    //fire ray in to 3d scene
    const intersects = raycaster.intersectObjects(this.third.scene.children, true);

    if (intersects.length > 0) {
        const hit = intersects[0];
        const object = hit.object;

        //distance check so you can interact objects across map
        if (hit.distance < 20) {
            if (object.userData.isInteractable) {
                this.interactWith(object);
            } 
            else if (object.parent && object.parent.userData.isInteractable) {
                this.interactWith(object.parent);
            }
        }
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
  displayEndScreen(text, color, targetScene = null) {
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
      this.resetLevel(targetScene);
    });
  }

  // Resets the level
  resetLevel(targetScene) {
    console.log('Resetting...');
    this.input.removeAllListeners();

    if (targetScene) {
        // If we are sent to a specific level (like Level 1),
        // we wipe the inventory to ensure a fresh start.
        this.registry.set('inventory', []);
        this.scene.start(targetScene);
    } else {
        // Normal restart (keep inventory if we have it)
        this.scene.restart();
    }
  }
}
