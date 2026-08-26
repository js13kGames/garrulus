# Game Design Document: garrulus

## 1. Concept Overview

"garrulus" is a physics-based puzzle game taking the viral _Suika Game_ merging mechanics and applying a central gravity twist. Fitting the "Rainbows and Unicorns" theme, players drop magical elements from a fixed circular orbit toward a sleepy unicorn core. As elements collide and merge, they form a chaotic, rotating planetary mass.

## 2. Core Mechanics

The gameplay loop relies on spatial awareness and physics manipulation rather than stacking.

-   **Central Gravity:** All dropped objects are pulled toward the exact center of the screen.
-   **Orbital Spawning:** The player controls a cloud moving strictly along a circular perimeter to choose the drop angle.
-   **Evolution Chain:** Elements merge upon contact (e.g., Sparkle -> Rainbow -> Crystal -> Cosmic Unicorn).
-   **Kinetic Impact:** Dropping heavy items off-center rotates the entire clustered mass, revealing new merging opportunities.
-   **Game Over State:** The outer orbit line acts as the death boundary. If the central mass expands and breaches this line for 3 seconds, the game ends.

## 3. Game Feel and Aesthetics

To captivate players immediately, the game focuses heavily on tactile feedback and vibrant visuals.

-   **Art Style:** Cute, 2D vector art with vibrant pastel colors against a dark cosmic background.
-   **Juice:** Heavy screen shake and a brief frame freeze (hit stop) occur upon high-tier merges.
-   **Audio:** Pitch-shifting "pop" sounds for small merges and an escalating musical chord progression for larger combinations.

## 4. Technical Implementation

The game relies on standard 2D physics engines available in Unity or Godot, minimizing custom collision coding.

-   **Physics Engine:** Global gravity is disabled; a Point Effector (Unity) or Area2D Point Gravity (Godot) is placed at the origin to pull rigidbodies inward.
-   **Orbital Math:** The player's spawn cloud position is calculated using the mouse cursor angle relative to the center.
-   **Angle Calculation:** The angle is determined by $\theta = \text{atan2}(y_{\text{mouse}} - y_{\text{center}}, x_{\text{mouse}} - x_{\text{center}})$.
-   **Position Formula:** The final coordinates are mapped using $x = R \cos(\theta)$ and $y = R \sin(\theta)$, where $R$ is the orbit radius.
