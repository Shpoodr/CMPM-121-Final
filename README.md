# CMPM-121-Final

## Devlog Entry - [11/14/2025]

### Introducing the team

Tools Lead: Logan Marshall

Engine Lead: Jayson Boyanitch

Design Lead: Gabriel Groenwold

Testing Lead: Andrew Hernandez

### Tools and materials

Engine: Phaser3 framework, three.js, ammo.js, enable3d. We will be using Phaser3 as the main engine for our project but since that does not come with any automatic 3d/physics support We will be including three.js as well as ammo.js to the project for the added support. Phaser will be used for features handling the main game loop, scene management, asset loading, user input, and 2D UI elements.
three.js - https://threejs.org/ will be used for handling all the 3d rendering, models, lighting, and camera managment. ammo.js https://github.com/kripken/ammo.js/ will be used for handling all of the 3d physics simulations such as, collision detection and rigid body dynamics. Luckly for us there is a plugin called enable3d that works as the "glue" between these tools which allows for all of these frameworks to talk to each other properly.

Language: Javascript, HTML, JSON

Tools: VS Code, Piskel, Aseprite, Blender, Figma, Photoshop

Generative AI: We want to use Gemini for referencing documentation of the different engines, and maybe Copilot for debugging.

Outlook: We're pretty positive about the outlook of this assignment. The jump from 2d to 3d will be challenging to say the least, especially since we're using a framework and not an actual game engine. Regardless, the actual mechanics of the game are easy enough to code, so it shouldn't be too hard once we get a handle on the difference in syntax.

## Devlog Entry - [11/21/2025]

### How We Satisfied The Software Requirements

To start, we used the Phaser3 framework as a base engine, which does not have 3d capabilities on its own. We imported the frameworks three.js and Enable3d for 3d development, and ammo.js for physics. The prototype we created using these frameworks involves the player needing to push a block to the edge of a platform in order to reach the end of the level. Thus, the player must use physics in a 3d environment to solve a puzzle. The player can fail by pushing the cube off the platform, or by missing the jump themselves. If the player fails or succeeds, they recieve feedback in the form of text on the screen. Additionally, we use Husky as a linter to check our code before commits, and Github Actions to deploy a playable version of our game.

### Reflection

We stayed pretty loyal to our original goal. Everybody stayed true to their roles for the most part, except Jayson and Andrew blended their duties together at times. The frameworks were difficult to use due to the complicated nature of making sure all the different plugins worked together. It's hard to say whether we should've used different engines, because we haven't used any other frameworks that supported 3d game develpment. However, the 3d capabilities of the framework did feel somewhat disjointed, which makes us interested in shopping around for other frameworks that perhaps had 3d capabilities in mind as the main focus, rather than as a plugin.

## Devlog Entry - [12/01/2025]

### How We Satisfied The Software Requirements

3D Rendering & Physics: We maintained our Phaser and enable3d stack. main.js initializes the Ammo.js physics engine with standard gravity, ensuring all game objects interact physically.

Navigation: Movement between rooms is handled by our shared BaseScene class. Reaching the flag triggers this.scene.start('Level2'), allowing for easy scalability.

Interaction: We implemented a 3D raycasting system in BaseScene.js. Clicking projects a ray from the camera; intersecting objects tagged isInteractable (like keys) trigger collection logic.

Inventory: We used Phaser’s registry for state persistence. Collected items are stored globally, allowing Level1 logic to verify if the player has the 'key' before granting a win.

Physics Puzzle: Level1 includes a mass-based puzzle. The player (mass 1) must manipulate a helper cube (mass 5) using physics collisions to reach higher platforms.

Skill & Reasoning: Success requires exploring to find the hidden key (reasoning) and precise platforming (skill). Reaching the goal without the key triggers a "NO KEY FOUND" failure state.

Conclusive Ending: We implemented a clear displayEndScreen method. Meeting win conditions displays "YOU WIN!", while falling off the map shows "GAME OVER," both offering a restart click.

### Reflection

We significantly refactored our plan to prioritize the DRY principle. Instead of duplicating logic, we moved player movement, UI, and input handling into a parent BaseScene class, leaving child scenes (Level1, Level2) responsible only for asset placement. We also applied the Rule of 3 by creating helper functions like spawnPlat to generate level geometry programmatically rather than hard-coding coordinates.
