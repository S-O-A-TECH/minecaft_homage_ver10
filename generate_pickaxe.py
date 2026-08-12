import bpy
import os
import sys

def setup_scene():
    if bpy.ops.object.select_all:
        bpy.ops.object.select_all(action='SELECT')
        bpy.ops.object.delete(use_global=False)

def create_material(name, color, metallic=0.0, roughness=0.5, emissive=(0.0, 0.0, 0.0, 1.0)):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs['Base Color'].default_value = color
        bsdf.inputs['Metallic'].default_value = metallic
        bsdf.inputs['Roughness'].default_value = roughness
        bsdf.inputs['Emission Color'].default_value = emissive
    return mat

def add_voxel(x, y, z, size, mat):
    bpy.ops.mesh.primitive_cube_add(size=size, location=(x, y, z))
    obj = bpy.context.active_object
    obj.data.materials.append(mat)
    return obj

def build_pickaxe(tier, output_path):
    setup_scene()
    
    # 1. Setup materials based on pickaxe tier
    # Shared wood handle material
    wood_mat = create_material("WoodHandle", (0.32, 0.18, 0.08, 1.0), 0.0, 0.90)
    dark_mat = create_material("SupportFrame", (0.10, 0.10, 0.12, 1.0), 0.1, 0.8)
    
    if tier == "wooden":
        # Rough oak wood blade
        blade_mat = create_material("WoodBlade", (0.50, 0.32, 0.16, 1.0), 0.0, 0.85)
        blade_accent = create_material("WoodAccent", (0.42, 0.25, 0.10, 1.0), 0.0, 0.90)
    elif tier == "stone":
        # Rugged textured stone blade
        blade_mat = create_material("StoneBlade", (0.45, 0.45, 0.45, 1.0), 0.05, 0.80)
        blade_accent = create_material("StoneAccent", (0.35, 0.35, 0.35, 1.0), 0.05, 0.85)
    elif tier == "iron":
        # Shiny, highly reflective iron blade
        blade_mat = create_material("IronBlade", (0.85, 0.85, 0.88, 1.0), 0.95, 0.15)
        blade_accent = create_material("IronAccent", (0.70, 0.70, 0.73, 1.0), 0.90, 0.20)
    elif tier == "diamond":
        # Magical glowing cyan diamond blade
        blade_mat = create_material("DiamondBlade", (0.15, 0.82, 0.95, 1.0), 0.85, 0.12, (0.02, 0.15, 0.22, 1.0))
        blade_accent = create_material("DiamondAccent", (0.50, 0.96, 1.0, 1.0), 0.60, 0.10, (0.05, 0.25, 0.30, 1.0))
    else:
        # Fallback
        blade_mat = create_material("FallbackBlade", (0.8, 0.8, 0.8, 1.0), 0.5, 0.5)
        blade_accent = create_material("FallbackAccent", (0.6, 0.6, 0.6, 1.0), 0.5, 0.5)
        
    vs = 0.04
    
    # 2. Build vertical handle stick
    for i in range(-8, 6):
        add_voxel(0, 0, i * vs, vs, wood_mat)
        
        # Base cap
        if i == -8:
            add_voxel(-vs, 0, i * vs, vs, dark_mat)
            add_voxel(vs, 0, i * vs, vs, dark_mat)
            add_voxel(0, -vs, i * vs, vs, dark_mat)
            add_voxel(0, vs, i * vs, vs, dark_mat)
            
    # 3. Connection head hub
    head_z = 5 * vs
    add_voxel(0, 0, head_z, vs, dark_mat)
    
    # 4. Symmetrical crescent blade
    # Right Blade (+X, -Z curve)
    right_wing = [
        (1, 0), (2, 0), (2, -1), (3, -1), (3, -2), (4, -2), (4, -3)
    ]
    for dx, dz in right_wing:
        add_voxel(dx * vs, 0, head_z + dz * vs, vs, blade_mat)
        add_voxel(dx * vs, vs * 0.1, head_z + dz * vs, vs * 0.9, blade_accent)
        
    # Left Blade (-X, -Z curve)
    left_wing = [
        (-1, 0), (-2, 0), (-2, -1), (-3, -1), (-3, -2), (-4, -2), (-4, -3)
    ]
    for dx, dz in left_wing:
        add_voxel(dx * vs, 0, head_z + dz * vs, vs, blade_mat)
        add_voxel(dx * vs, vs * 0.1, head_z + dz * vs, vs * 0.9, blade_accent)

    # 5. Group meshes
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.join()
    
    # 6. Set natural pivot to the bottom of the grip
    bpy.context.scene.cursor.location = (0, 0, -8 * vs)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR', center='MEDIAN')
    
    obj = bpy.context.active_object
    obj.location = (0, 0, 0)
    
    # 7. Export to GLB (translates Z-up to Y-up)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=output_path, export_format='GLB')
    print(f"SUCCESS: Generated {tier} pickaxe GLB at: {output_path}")

if __name__ == "__main__":
    # Generate all four tiers in one run!
    tiers = {
        "wooden": "public/assets/wooden_pickaxe.glb",
        "stone": "public/assets/stone_pickaxe.glb",
        "iron": "public/assets/iron_pickaxe.glb",
        "diamond": "public/assets/diamond_pickaxe.glb"
    }
    
    for tier, path in tiers.items():
        build_pickaxe(tier, path)
