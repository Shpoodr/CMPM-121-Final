// Player.js
import Phaser from 'phaser';

export class Player {
  constructor(scene, object3d) {
    this.scene = scene;
    this.object = object3d;

    // Sets what keys we will use
    this.keys = {
      w: scene.input.keyboard.addKey('w'),
      a: scene.input.keyboard.addKey('a'),
      s: scene.input.keyboard.addKey('s'),
      d: scene.input.keyboard.addKey('d'),
      space: scene.input.keyboard.addKey('space'),
    };

    // 2. Locks the rotation so the player doesn't roll around like a ball
    this.object.body.setAngularFactor(0, 0, 0);
    this.object.body.setFriction(0.8);
  }

  update() {
    if (!this.object || !this.object.body) return;

    // Movement settings
    const speed = 6;
    const jumpForce = 7; // This is enough to jump on the box while 6 is not enough

    // Gets the current velocity to preserve gravity (y-axis)
    const currentVelocity = this.object.body.velocity;
    let x = 0;
    let z = 0;

    // Checks Input for Movement (X and Z axes)
    if (this.keys.w.isDown) z = -speed;
    if (this.keys.s.isDown) z = speed;
    if (this.keys.a.isDown) x = -speed;
    if (this.keys.d.isDown) x = speed;

    // Applies velocity (keeping the current Y velocity for gravity)
    this.object.body.setVelocity(x, currentVelocity.y, z);

    const onGround = Math.abs(currentVelocity.y) < 0.1;

    // Checks if Space was just pressed
    const jumpPressed = Phaser.Input.Keyboard.JustDown(this.keys.space);

    if (jumpPressed && onGround) {
      this.object.body.applyForceY(jumpForce);
    }
  }
}
