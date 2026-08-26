import {WorldImpl} from "../lib/world.js";
import {AnimatePop} from "./components/com_animate_pop.js";
import {Camera2D} from "./components/com_camera2d.js";
import {Children} from "./components/com_children.js";
import {CollideCircle} from "./components/com_collide_circle.js";
import {DropCloud} from "./components/com_drop_cloud.js";
import {Lifespan} from "./components/com_lifespan.js";
import {LocalTransform2D} from "./components/com_local_transform2d.js";
import {Merge} from "./components/com_merge.js";
import {RigidBody2D} from "./components/com_rigid_body2d.js";
import {SpatialNode2D} from "./components/com_spatial_node2d.js";

/**
 * Floats per entity in InstanceData.
 *
 * The template uses this buffer to feed the WebGL instanced renderer. We draw
 * with Context2D instead, so the buffer only has to hold the 6 floats of the
 * world matrix of each SpatialNode2D.
 */
export const FLOATS_PER_INSTANCE = 6;

const enum Component {
    AnimatePop,
    Camera2D,
    Children,
    CollideCircle,
    Dirty,
    DropCloud,
    Lifespan,
    LocalTransform2D,
    Merge,
    RigidBody2D,
    SpatialNode2D,
}

export const enum Has {
    None = 0,
    AnimatePop = 1 << Component.AnimatePop,
    Camera2D = 1 << Component.Camera2D,
    Children = 1 << Component.Children,
    CollideCircle = 1 << Component.CollideCircle,
    Dirty = 1 << Component.Dirty,
    DropCloud = 1 << Component.DropCloud,
    Lifespan = 1 << Component.Lifespan,
    LocalTransform2D = 1 << Component.LocalTransform2D,
    Merge = 1 << Component.Merge,
    RigidBody2D = 1 << Component.RigidBody2D,
    SpatialNode2D = 1 << Component.SpatialNode2D,
}

export class World extends WorldImpl {
    InstanceData = new Float32Array(this.Capacity * FLOATS_PER_INSTANCE);

    AnimatePop: Array<AnimatePop> = [];
    Camera2D: Array<Camera2D> = [];
    Children: Array<Children> = [];
    CollideCircle: Array<CollideCircle> = [];
    DropCloud: Array<DropCloud> = [];
    Lifespan: Array<Lifespan> = [];
    LocalTransform2D: Array<LocalTransform2D> = [];
    Merge: Array<Merge> = [];
    RigidBody2D: Array<RigidBody2D> = [];
    SpatialNode2D: Array<SpatialNode2D> = [];
}
