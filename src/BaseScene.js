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
    this.startOfLevelInventory = [];

    this.inputs = { x: 0, y: 0, jump: false };
  }

  init(data) {
    this.accessThirdDimension();

    // A. Recover Inventory
    if (data && data.inventory) {
      this.inventory = data.inventory;
      this.registry.set('inventory', this.inventory);
    } else {
      this.inventory = this.registry.get('inventory') || [];
    }

    // Snapshot inventory for "Death" resets
    this.startOfLevelInventory = [...this.inventory];

    // B. Recover Position
    if (data && data.position) {
      this.loadedPosition = data.position;
      console.log(' [System] LOADING SAVE at:', this.loadedPosition);
    } else {
      this.loadedPosition = null;
      console.log(' [System] STARTING FRESH (Default Spawn)');
    }
  }

  preload() {
    this.third.load.preload('chip', 'assets/chip.glb');
  }

  async create() {
    this.isGameOver = false;
    this.createUI();
    this.createMobileControls();

    this.input.on('pointerdown', (pointer) => this.handleInput(pointer));
    this.createSaveLoadControls();

    await this.createLevel();

    // Use loaded position if it exists, otherwise use Level specific startPosition
    const startX = this.loadedPosition
      ? this.loadedPosition.x
      : this.startPosition
        ? this.startPosition.x
        : 0;
    const startY = this.loadedPosition
      ? this.loadedPosition.y
      : this.startPosition
        ? this.startPosition.y
        : 5;
    const startZ = this.loadedPosition
      ? this.loadedPosition.z
      : this.startPosition
        ? this.startPosition.z
        : 0;

    await this.spawnPlayer(startX, startY, startZ);
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
      shape: 'box',
      height: 2.5,
      width: 1.6,
      depth: 1.6,
      mass: 1,
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
            // --- [NEW] SAVE TRANSITION TO LEVEL 2 ---
            // We save explicitly saying "Next time we load, we are in Level 2"
            // We set position to null so Level 2 uses its default start spawn.
            this.saveGame('auto', { level: 'Level2', position: null });

            this.scene.start('Level2');
          } else {
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
        } else if (object.parent && object.parent.userData.isInteractable) {
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

    // --- [EXISTING] SAVE ON KEY GRAB ---
    // This saves the current level and position immediately.
    this.performAutoSave();
    this.showMessage('Progress Saved!');
  }

  createUI() {
    this.inventoryText = this.add.text(20, 20, 'Inventory: ' + this.inventory.join(', '), {
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#000000aa',
    });
    this.inventoryText.setScrollFactor(0);
    this.add
      .text(20, 50, '[K] Save | [L] Load | [O] Load Auto-Save', {
        fontSize: '16px',
        color: '#cccccc',
      })
      .setScrollFactor(0);
  }

  //all controls for mobile
  createMobileControls() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (!isMobile) return;
    // 1. CLEANUP: If a joystick exists from a previous session/restart, destroy it.
    // This ensures we don't have "ghost" controls talking to dead scenes.
    const oldJoystick = document.getElementById('joystick-zone');
    if (oldJoystick) oldJoystick.remove();

    const oldJump = document.getElementById('jump-zone');
    if (oldJump) oldJump.remove();

    // 2. INJECT STYLES (idempotent - only adds if missing)
    if (!document.getElementById('mobile-controls-style')) {
      const style = document.createElement('style');
      style.id = 'mobile-controls-style';
      style.innerHTML = `
            #joystick-zone {
                position: fixed;
                bottom: 50px;
                left: 50px;
                width: 120px;
                height: 120px;
                z-index: 99999;
                touch-action: none; /* Critical for mobile */
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .joystick-base {
                width: 100%;
                height: 100%;
                background: rgba(255, 255, 255, 0.2);
                border: 2px solid rgba(255, 255, 255, 0.5);
                border-radius: 50%;
                position: relative;
            }
            .joystick-stick {
                width: 50px;
                height: 50px;
                background: #3178c6;
                border-radius: 50%;
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                box-shadow: 0 0 10px rgba(0,0,0,0.5);
                pointer-events: none;
            }
            #jump-zone {
                position: fixed;
                bottom: 60px;
                right: 60px;
                z-index: 99999;
                touch-action: none;
            }
            .jump-btn {
                width: 90px;
                height: 90px;
                background-color: #ff6b6b;
                border: 4px solid #c92a2a;
                border-radius: 50%;
                color: white;
                font-weight: bold;
                font-size: 18px;
                box-shadow: 0 6px 0 #c92a2a;
            }
            .jump-btn:active {
                box-shadow: 0 0 0 #c92a2a;
                transform: translateY(6px);
            }
        `;
      document.head.appendChild(style);
    }

    // 3. CREATE UI ELEMENTS
    const gui = document.createElement('div');
    gui.innerHTML = `
        <div id="joystick-zone">
            <div class="joystick-base">
                <div id="stick" class="joystick-stick"></div>
            </div>
        </div>
        <div id="jump-zone">
            <button id="jump-btn" class="jump-btn">JUMP</button>
        </div>
    `;
    document.body.appendChild(gui);

    // 4. BIND EVENTS (Connects to THIS scene instance)
    const stick = document.getElementById('stick');
    const zone = document.getElementById('joystick-zone');
    const jumpBtn = document.getElementById('jump-btn');
    const maxDist = 40;

    const handleTouch = (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = zone.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = touch.clientX - centerX;
      const deltaY = touch.clientY - centerY;
      const distance = Math.min(Math.hypot(deltaX, deltaY), maxDist);
      const angle = Math.atan2(deltaY, deltaX);

      const stickX = Math.cos(angle) * distance;
      const stickY = Math.sin(angle) * distance;
      stick.style.transform = `translate(calc(-50% + ${stickX}px), calc(-50% + ${stickY}px))`;

      this.inputs.x = stickX / maxDist;
      this.inputs.y = stickY / maxDist;
    };

    const resetStick = () => {
      stick.style.transform = `translate(-50%, -50%)`;
      this.inputs.x = 0;
      this.inputs.y = 0;
    };

    zone.addEventListener('touchstart', handleTouch);
    zone.addEventListener('touchmove', handleTouch);
    zone.addEventListener('touchend', resetStick);

    jumpBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.inputs.jump = true;
    });
    jumpBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.inputs.jump = false;
    });
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

  resetLevel(targetScene) {
    console.log('Resetting Game...');
    this.input.removeAllListeners();

    this.uiElements.forEach((el) => el.destroy());
    this.uiElements = [];

    if (targetScene) {
      this.registry.set('inventory', []);
      this.scene.start(targetScene, { inventory: [], position: null });
    } else {
      if (this.startOfLevelInventory) {
        this.inventory = [...this.startOfLevelInventory];
        this.registry.set('inventory', this.inventory);
        this.scene.restart({ inventory: this.inventory });
      } else {
        this.scene.restart();
      }
    }
  }

  createSaveLoadControls() {
    this.input.keyboard.on('keydown-K', () => {
      this.saveGame('slot1');
      this.showMessage('Game Saved to Slot 1');
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

  // --- [UPDATED] SAVE GAME WITH OVERRIDES ---
  // Added 'overrides' parameter to allow saving specific states (like changing level name)
  saveGame(slotName, overrides = {}) {
    if (!this.player || !this.player.object) return;

    const data = {
      level: this.scene.key,
      inventory: this.inventory,
      position: {
        x: this.player.object.position.x,
        y: this.player.object.position.y,
        z: this.player.object.position.z,
      },
      ...overrides, // Merge custom data (like forcing level: 'Level2')
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
        position: data.position,
      });
    } else {
      this.showMessage('No Save Found!');
    }
  }

  showMessage(msg) {
    const width = this.cameras.main.width;
    const text = this.add
      .text(width / 2, 100, msg, {
        fontSize: '32px',
        color: '#ffff00',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(100);

    this.tweens.add({
      targets: text,
      alpha: 0,
      duration: 1000,
      delay: 1000,
      onComplete: () => text.destroy(),
    });
  }
}
