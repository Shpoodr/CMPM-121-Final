import Phaser from 'phaser';
import { enable3d, Canvas } from '@enable3d/phaser-extension';
import { Level1 } from './Level1';

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
    debug: true,
  },
  scene: [Level1],
  ...Canvas(),
};

window.addEventListener('load', () => {
  enable3d(() => new Phaser.Game(config)).withPhysics('lib');
});
