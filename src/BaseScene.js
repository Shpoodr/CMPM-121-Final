import Phaser from 'phaser';
import { enable3d, Scene3D, THREE } from '@enable3d/phaser-extension';
import { Player } from './Player';
import { saveManager } from './SaveManager';
import { locales } from './locales';

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

    // Default language
    this.currentLanguage = 'en';
  }

  // I18N HELPER
  t(key) {
    if (!locales[this.currentLanguage]) return key;
    return locales[this.currentLanguage][key] || key;
  }

  // Language switcher
  switchLanguage(lang) {
    if (this.currentLanguage === lang) return;
    console.log(`Switching language to: ${lang}`);
    
    this.currentLanguage = lang;
    
    // Restarts the scene to refresh all UI and text directions completely
    this.registry.set('language', lang);

    this.scene.restart({
      inventory: this.inventory,
      position: this.player && this.player.object ? this.player.object.position : null,
      language: lang
    });
  }

  init(data) {
    this.accessThirdDimension();

    if (data && data.language) {
        this.currentLanguage = data.language;
    } else {
        this.currentLanguage = this.registry.get('language') || 'en';
    }
    // Sync registry
    this.registry.set('language', this.currentLanguage);

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

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    // Define a listener function
    const handleThemeChange = (e) => {
      const newColorScheme = e.matches ? 'dark' : 'light';
      console.log(`Theme changed to ${newColorScheme}`);
      
      // Optional: Restart scene to refresh UI colors
      this.scene.restart();
    };

    // Add the listener
    mediaQuery.addEventListener('change', handleThemeChange);

    // Cleanup listener when scene shuts down to prevent errors
    this.events.on('shutdown', () => {
        mediaQuery.removeEventListener('change', handleThemeChange);
    });
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

    // Kept keyboard shortcuts for desktop convenience
    this.input.keyboard.on('keydown-ONE', () => this.switchLanguage('en')); // 1 for English
    this.input.keyboard.on('keydown-TWO', () => this.switchLanguage('zh')); // 2 for Chinese
    this.input.keyboard.on('keydown-THREE', () => this.switchLanguage('ar')); // 3 for Arabic

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
        this.displayEndScreen('game_over', '#ff0000');
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
            // We save explicitly saying "Next time we load, we are in Level 2"
            // We set position to null so Level 2 uses its default start spawn.
            this.saveGame('auto', { level: 'Level2', position: null });

            this.scene.start('Level2', {
                inventory: this.inventory,
                language: this.currentLanguage 
            });
          } else {
            if (this.inventory.includes('key')) {
              this.displayEndScreen('you_win', '#00ff00', 'Level1');
            } else {
              this.displayEndScreen('no_key', '#ff0000', 'Level1');
            }
          }
        }
      }

      if (this.player.object.position.y < -30) {
        this.displayEndScreen('game_over', '#ff0000');
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

    // This saves the current level and position immediately.
    this.performAutoSave();
    this.showMessage('progress_saved');
  }

  createUI() {
    const width = this.cameras.main.width;
    const isRTL = this.currentLanguage === 'ar';

    // Calculates the Positions based on Direction
    let xPos = isRTL ? width - 20 : 20;
    const xOrigin = isRTL ? 1 : 0;

    // Prepares the Text Content
    const inventoryLabel = this.t('inventory');
    const controlsText = `${this.t('save_game')} | ${this.t('load_game')}`;

    // Creates the Inventory Text
    this.inventoryText = this.add
      .text(xPos, 20, `${inventoryLabel}: ${this.inventory.join(', ')}`, {
        fontSize: '20px',
        color: '#ffffff',
        backgroundColor: '#000000aa',
        rtl: isRTL,
      })
      .setOrigin(xOrigin, 0)
      .setScrollFactor(0);

    // Creates the Controls Help Text
    this.add
      .text(xPos, 50, controlsText, {
        fontSize: '16px',
        color: '#cccccc',
        rtl: isRTL,
      })
      .setOrigin(xOrigin, 0)
      .setScrollFactor(0);

    // Creates the Interactive Language Buttons
    const langStyle = {
      fontSize: '16px',
      color: '#ffff00',
      backgroundColor: '#333333',
    };
    const langY = 80;
    const gap = 80;

    const createLangBtn = (text, code, offsetIndex) => {
      // Calculates X based on direction order
      const currentX = isRTL ? xPos - offsetIndex * gap : xPos + offsetIndex * gap;

      const btn = this.add
        .text(currentX, langY, text, langStyle)
        .setOrigin(xOrigin, 0)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true });

      // Hover Effects
      btn.on('pointerover', () => btn.setStyle({ fill: '#ffffff' }));
      btn.on('pointerout', () => btn.setStyle({ fill: '#ffff00' }));

      // Click/Tap Event
      btn.on('pointerdown', () => this.switchLanguage(code));
    };

    createLangBtn('[ En ]', 'en', 0);
    createLangBtn('[ 中 ]', 'zh', 1);
    createLangBtn('[ ar ]', 'ar', 2);
  }

  createMobileControls() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    if (!isMobile) return;

    const oldJoystick = document.getElementById('joystick-zone');
    if (oldJoystick) oldJoystick.remove();

    const oldJump = document.getElementById('jump-zone');
    if (oldJump) oldJump.remove();

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
                touch-action: none; 
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
      const inventoryLabel = this.t('inventory');
      this.inventoryText.setText(`${inventoryLabel}: ${this.inventory.join(', ')}`);
    }
  }

  displayEndScreen(textKey, color, targetScene = null) {
    if (this.isGameOver) return;
    this.isGameOver = true;

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const isRTL = this.currentLanguage === 'ar';

    const t1 = this.add
      .text(width / 2, height / 2 - 50, this.t(textKey), {
        fontSize: '64px',
        fontStyle: 'bold',
        color: color,
        stroke: '#000000',
        strokeThickness: 6,
        rtl: isRTL,
      })
      .setOrigin(0.5);

    const t2 = this.add
      .text(width / 2, height / 2 + 50, this.t('restart'), {
        fontSize: '32px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
        rtl: isRTL,
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
      this.scene.start(targetScene, { 
          inventory: [], 
          position: null,
          language: this.currentLanguage
      });
    } else {
      if (this.startOfLevelInventory) {
        this.inventory = [...this.startOfLevelInventory];
        this.registry.set('inventory', this.inventory);
        this.scene.restart({ 
            inventory: this.inventory,
            language: this.currentLanguage
        });
      } else {
        this.scene.restart({
            language: this.currentLanguage
        });
      }
    }
  }

  createSaveLoadControls() {
    this.input.keyboard.on('keydown-K', () => {
      this.saveGame('slot1');
      this.showMessage('saved_to_slot');
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

  saveGame(slotName, overrides = {}) {
    if (!this.player || !this.player.object) return;

    const data = {
      level: this.scene.key,
      inventory: this.inventory,
      language: this.currentLanguage,
      position: {
        x: this.player.object.position.x,
        y: this.player.object.position.y,
        z: this.player.object.position.z,
      },
      ...overrides,
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
        language: data.language
      });
    } else {
      this.showMessage('no_save_found');
    }
  }

  showMessage(msgKey) {
    const width = this.cameras.main.width;
    const isRTL = this.currentLanguage === 'ar';

    const text = this.add
      .text(width / 2, 100, this.t(msgKey), {
        fontSize: '32px',
        color: '#ffff00',
        stroke: '#000000',
        strokeThickness: 4,
        rtl: isRTL,
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
