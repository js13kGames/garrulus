# Game Design Document: Prototype Iteration - Orbit of the Unicorn[cite: 1]

## The Problem
Initial playtesting revealed that the central gravity mechanic is currently too forgiving[cite: 1]. Unlike the standard *Suika Game* container which forces elements upwards, our 360-degree orbit allows outward expansion across a massive area[cite: 1]. Because the area expands quadratically ($A = \pi r^2$), players rarely feel spatial pressure, removing the tension required for the merging puzzle loop[cite: 1].

## The Solution
Instead of over-engineering one complex solution, we will implement and playtest three separate isolation modes[cite: 1]. This will help us identify which constraint introduces the most "fun panic" without feeling unfair[cite: 1].

## Proposed Testing Modes
The following three modes will be built as separate scenes or toggles in the game engine[cite: 1]. Each attacks the "infinite space" problem from a different mechanical angle[cite: 1].

### Mode 1: The Claustrophobia Test (Spatial Constraint)
This mode directly attacks the geometric problem by drastically reducing the playable area and inflating the size of late-game elements[cite: 1].
*   **Shrunk Death Ring:** The orbital spawn line is moved 40% closer to the central core[cite: 1]. The margin for error is razor-thin[cite: 1].
*   **Exponential Scaling:** Higher-tier merged faces (e.g., the Blue and Orange giants) scale up exponentially rather than linearly[cite: 1]. A top-tier merge instantly eats up a massive percentage of the orbital volume[cite: 1].
*   **Testing Goal:** Does sheer lack of space recreate the original Suika tension, or does it make the game end too abruptly?[cite: 1]

### Mode 2: The Jagged Orbit Test (Friction & Obstacles)
This mode focuses on preventing the perfect, dense honeycomb packing seen in the initial prototype screenshot[cite: 1].
*   **Irregular Colliders:** Faces are no longer perfect circles[cite: 1]. We add small invisible (or visible) bumps, horns, or asymmetrical shapes to the colliders so they lock together awkwardly[cite: 1].
*   **High Friction Physics:** Elements no longer slide smoothly around one another[cite: 1]. They stick and grind, creating jagged, unstable towers that point outward toward the death ring[cite: 1].
*   **Static Dead Stars:** 2 or 3 small, unmovable obstacles are permanently placed in the orbit[cite: 1]. Players must drop items around them, disrupting perfect spherical growth[cite: 1].
*   **Testing Goal:** Does irregular packing create satisfying, unpredictable physics interactions, or is it just frustrating?[cite: 1]

### Mode 3: The Momentum Test (Rotational Instability)
This mode embraces the physics engine, turning the central cluster into a swinging, volatile pendulum[cite: 1].
*   **Heavy Mass Impact:** Dropping a heavy item off-center transfers massive momentum to the core cluster, causing the entire "planet" of faces to rotate violently[cite: 1].
*   **Centrifugal Force:** If the cluster spins too fast, items on the outer edge might be flung outward, instantly hitting the death ring[cite: 1].
*   **Strategic Spinning:** Players must balance their drops on both sides of the cluster to keep it stable, or intentionally drop a heavy item on the edge to spin a trapped space into view[cite: 1].
*   **Testing Goal:** Does managing the rotation and stability of the cluster add a fun layer of action/strategy to the puzzle loop?[cite: 1]

## Evaluation Criteria
After compiling the three modes, we will run A/B testing with the following metrics in mind[cite: 1]:
*   **Session Length:** Aiming for 3 to 7 minutes per run[cite: 1]. If runs consistently pass 15 minutes, the mode is still too easy[cite: 1].
*   **Player Stress Curve:** The game should feel relaxing for the first minute, transitioning into escalating tension[cite: 1].
*   **Merge Satisfaction:** Which mode makes the large merges feel most rewarding? (e.g., Mode 1 makes it a relief of space; Mode 3 might cause a satisfying spin)[cite: 1].

*Note: The final game may not be just one of these modes, but a balanced hybrid of the best elements from the playtests[cite: 1].*
