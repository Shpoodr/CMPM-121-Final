// src/SaveManager.js

export default class SaveManager {
  constructor() {
    this.prefix = 'CMPM121_FINAL_SAVE_';
  }

  /**
   * Saves the current game state to a specific slot.
   * @param {string} slot - 'auto', 'slot1', 'slot2', etc.
   * @param {object} data - The game state object (level, inventory, position, etc.)
   */
  save(slot, data) {
    try {
      const saveKey = `${this.prefix}${slot}`;
      const saveData = {
        ...data,
        timestamp: new Date().toISOString(), // Useful for showing "Last Saved: ..."
      };
      localStorage.setItem(saveKey, JSON.stringify(saveData));
      console.log(`[SaveManager] Game saved to ${slot}`);
    } catch (e) {
      console.error('[SaveManager] Failed to save game:', e);
    }
  }

  /**
   * Loads game state from a specific slot.
   * @param {string} slot 
   * @returns {object|null} The game state or null if not found.
   */
  load(slot) {
    try {
      const saveKey = `${this.prefix}${slot}`;
      const json = localStorage.getItem(saveKey);
      return json ? JSON.parse(json) : null;
    } catch (e) {
      console.error('[SaveManager] Failed to load game:', e);
      return null;
    }
  }

  /**
   * Checks if a save exists.
   */
  hasSave(slot) {
    return !!localStorage.getItem(`${this.prefix}${slot}`);
  }

  /**
   * Clears all saves (useful for debugging or a generic "Reset Progress" button).
   */
  clearAll() {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    });
  }
}

export const saveManager = new SaveManager();