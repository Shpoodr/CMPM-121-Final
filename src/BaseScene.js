import Phaser from 'phaser';
import { enable3d, Scene3D, THREE } from '@enable3d/phaser-extension';
import { Player } from './Player';
import { saveManager } from './SaveManager';

export class BaseScene extends Scene3D {
  constructor(key) {
    super({ key: key });
    this.player = null;
    this.floor = null;

    this.isGameOver = false;
    this.inventory = [];
    this.inventoryText = null;
    this.uiElements = [];

    this.loadedPosition = null;
    // [New] To track what we had when the level started
    this.startOfLevelInventory = [];
  }

  // 1. Modified INIT to snapshot inventory
  init(data) {
    this.accessThirdDimension();

    // A. Recover Inventory
    if (data && data.inventory) {
      this.inventory = data.inventory;
      this.registry.set('inventory', this.inventory);
    } else {
      this.inventory = this.registry.get('inventory') || [];
    }

    // [FIX] Create a backup of the inventory at the start of the level
    // We will revert to this if the player dies.
    this.startOfLevelInventory = [...this.inventory];

    // B. Recover Position
    if (data && data.position) {
      this.loadedPosition = data.position;
      console.log(" [System] LOADING SAVE at:", this.loadedPosition);
    } else {
      this.loadedPosition = null; 
      console.log(" [System] STARTING FRESH (Default Spawn)");
    }
  }

  preload() {
    this.third.load.preload('chip', 'assets/chip.glb');
  }

  async create() {
    this.isGameOver = false;
    this.createUI();

    this.input.on('pointerdown', (pointer) => this.handleInput(pointer));
    this.createSaveLoadControls();

    await this.createLevel();

    const startX = this.loadedPosition ? this.loadedPosition.x : (this.startPosition ? this.startPosition.x : 0);
    const startY = this.loadedPosition ? this.loadedPosition.y : (this.startPosition ? this.startPosition.y : 5);
    const startZ = this.loadedPosition ? this.loadedPosition.z : (this.startPosition ? this.startPosition.z : 0);
    
    await this.spawnPlayer(startX, startY, startZ);

    this.time.delayedCall(1000, () => {
        this.performAutoSave(); 
    });
  }

  async createLevel() {
    console.warn('createLevel() should be overridden by the child scene');
  }

  async spawnPlayer(x, y, z) {
    const gltf = await this.third.load.gltf('chip');
    const chip = gltf.scene.clone();

    chip.name = 'player';
    chip.scale.set(1, 1, 1);
    chip.position.set(x, y, z);
    chip.rotation.y = Math.PI;

    this.third.add.existing(chip);
    this.third.physics.add.existing(chip, {
      shape: 'box', height: 2.5, width: 1.6, depth: 1.6, mass: 1,
    });

    this.player = new Player(this, chip);

    if (this.floor) {
      this.third.physics.add.collider(chip, this.floor, () => {
        this.displayEndScreen('GAME OVER', '#ff0000');
      });
    }
  }

  update() {
    if (this.isGameOver) return;

    if (this.player && this.player.object && this.player.object.body) {
      this.player.update();
      this.third.camera.lookAt(this.player.object.position);

      if (this.flag) {
        const dist = this.player.object.position.distanceTo(this.flag.position);
        
        if (dist < 2.5) {
           if (this.scene.key === 'Level1') {
             this.scene.start('Level2'); 
           } 
           else {
             if (this.inventory.includes('key')) {
                this.displayEndScreen('YOU WIN!', '#00ff00', 'Level1');
             } else {
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

  handleInput(pointer) {
    if (this.isGameOver) return;
    const mouse = new THREE.Vector2();
    mouse.x = (pointer.x / this.scale.width) * 2 - 1;
    mouse.y = -(pointer.y / this.scale.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.third.camera);

    const intersects = raycaster.intersectObjects(this.third.scene.children, true);

    if (intersects.length > 0) {
        const hit = intersects[0];
        const object = hit.object;

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

  interactWith(object) {
    if (object.name.includes('key') || object.name.includes('item')) {
      this.addToInventory(object.name);
      this.third.scene.remove(object);
      this.third.physics.destroy(object);
    }
  }

  addToInventory(itemName) {
    this.inventory.push(itemName);
    this.registry.set('inventory', this.inventory);
    this.updateInventoryUI();
    
    // Auto-save when picking up important items
    // NOTE: This updates the 'auto' save slot. 
    // If you reload the page, you WILL have the key.
    // However, the "Death" logic below handles the in-game reset correctly.
    this.performAutoSave();
    this.showMessage("Progress Saved!");
  }

  createUI() {
    this.inventoryText = this.add.text(20, 20, 'Inventory: ' + this.inventory.join(', '), {
      fontSize: '20px', color: '#ffffff', backgroundColor: '#000000aa',
    });
    this.inventoryText.setScrollFactor(0);
    this.add.text(20, 50, '[K] Save | [L] Load', { fontSize: '16px', color: '#cccccc' }).setScrollFactor(0);
  }

  updateInventoryUI() {
    if (this.inventoryText) {
      this.inventoryText.setText('Inventory: ' + this.inventory.join(', '));
    }
  }

  displayEndScreen(text, color, targetScene = null) {
    if (this.isGameOver) return;
    this.isGameOver = true;

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const t1 = this.add.text(width / 2, height / 2 - 50, text, {
        fontSize: '64px', fontStyle: 'bold', color: color, stroke: '#000000', strokeThickness: 6,
      }).setOrigin(0.5);

    const t2 = this.add.text(width / 2, height / 2 + 50, 'Click to Restart', {
        fontSize: '32px', color: '#ffffff', stroke: '#000000', strokeThickness: 4,
      }).setOrigin(0.5);

    this.uiElements.push(t1, t2);

    this.input.once('pointerdown', () => {
      this.resetLevel(targetScene);
    });
  }

  // 2. Modified Reset Level to handle inventory rollback
  resetLevel(targetScene) {
    console.log('Resetting Game...');
    this.input.removeAllListeners();

    this.uiElements.forEach(el => el.destroy());
    this.uiElements = [];

    if (targetScene) {
        // [FULL GAME RESET - Win]
        this.registry.set('inventory', []);
        this.scene.start(targetScene, { inventory: [], position: null });
    } else {
        // [LEVEL RESTART - Death]
        // Reset inventory to the state it was in when the level STARTED.
        if (this.startOfLevelInventory) {
            console.log("Reverting Inventory to:", this.startOfLevelInventory);
            
            // 1. Reset local array
            this.inventory = [...this.startOfLevelInventory];
            
            // 2. Reset Phaser Registry (Global State)
            this.registry.set('inventory', this.inventory);
            
            // 3. Restart Scene with the CLEAN inventory
            this.scene.restart({ inventory: this.inventory });
        } else {
            this.scene.restart();
        }
    }
  }

  createSaveLoadControls() {
    this.input.keyboard.on('keydown-K', () => {
        this.saveGame('slot1');
        this.showMessage("Game Saved to Slot 1");
    });
    this.input.keyboard.on('keydown-L', () => {
        this.loadGame('slot1');
    });
    this.input.keyboard.on('keydown-O', () => {
        this.loadGame('auto');
    });
  }

  performAutoSave() {
      this.saveGame('auto');
  }

  saveGame(slotName) {
      if (!this.player || !this.player.object) return;

      const data = {
          level: this.scene.key,
          inventory: this.inventory,
          position: {
              x: this.player.object.position.x,
              y: this.player.object.position.y,
              z: this.player.object.position.z
          }
      };
      saveManager.save(slotName, data);
      console.log(`Saved to ${slotName}`, data);
  }

  loadGame(slotName) {
      const data = saveManager.load(slotName);
      if (data) {
          console.log(`Loading from ${slotName}`, data);
          this.scene.start(data.level, {
              inventory: data.inventory,
              position: data.position
          });
      } else {
          this.showMessage("No Save Found!");
      }
  }

  showMessage(msg) {
      const width = this.cameras.main.width;
      const text = this.add.text(width / 2, 100, msg, {
          fontSize: '32px', color: '#ffff00', stroke: '#000000', strokeThickness: 4
      }).setOrigin(0.5).setDepth(100);
      
      this.tweens.add({
          targets: text, alpha: 0, duration: 1000, delay: 1000,
          onComplete: () => text.destroy()
      });
  }
}