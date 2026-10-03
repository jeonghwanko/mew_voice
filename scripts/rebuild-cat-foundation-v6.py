"""Reconstruct the cat as one anatomical surface; no fur or image materials.

Uses the corrected A5 paw and closed-tail geometry. This is a clay foundation,
not a finished character or a claim of a production topology/rig.
"""
import bpy,bmesh,math
from mathutils import Vector
OUT='C:/Users/turbo08/mew_voice/assets/avatar/blender'
assert bpy.data.filepath.replace('\\','/').endswith('/cat-a-refined-v5.blend')
scene=bpy.context.scene;scene.frame_set(1);cat=bpy.data.collections['CatA_Sculpt'];rig=bpy.data.objects['A_Cat_Rig']
rig.animation_data_clear()
for bone in rig.pose.bones:bone.rotation_euler=(0,0,0)

def active(obj):
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
def material(name,color,roughness):
    mat=bpy.data.materials.new(name);mat.diffuse_color=(*color,1);mat.use_nodes=True
    bs=mat.node_tree.nodes['Principled BSDF'];bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=roughness;bs.inputs['Specular IOR Level'].default_value=.12
    return mat
clay=material('Foundation_warm_clay',(.40,.36,.29),.85)
eyeclay=material('Foundation_eye',(.065,.061,.050),.38)

# Lower the cranium into the neck envelope; flatten the spherical occiput and
# taper the forehead. Preserve the broad lower cheek and projecting muzzle.
for obj in list(cat.objects):
    if obj.type!='MESH':continue
    for modifier in list(obj.modifiers):obj.modifiers.remove(modifier)
    obj.parent=None
    if obj.name not in ['A4_Body','A4_Tail']:obj.location.z-=.20
    if obj.name=='A4_Head':
        for vert in obj.data.vertices:
            if vert.co.y>.1:vert.co.y=.1+(vert.co.y-.1)*.82
            if vert.co.z>2.93:vert.co.x*=1-.07*min(1,(vert.co.z-2.93)/.35)
        # Close the orbital boundary before volume reconstruction. The curved
        # eye and eyelid forms remain forward of this recessed skull surface.
        bm=bmesh.new();bm.from_mesh(obj.data);bmesh.ops.holes_fill(bm,edges=[e for e in bm.edges if e.is_boundary],sides=0);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(obj.data);bm.free()
    if obj.data.shape_keys:obj.shape_key_clear()
    obj.data.materials.clear();obj.data.materials.append(eyeclay if obj.name.startswith('A4_Eye_') else clay)

# Head, neck, chest, shoulder, back, pelvis and paws become a single continuous
# surface. Ear bases are blended into the cranium instead of floating shells.
parts=[bpy.data.objects[n] for n in ['A4_Head','A4_Body','A4_Ear_-1','A4_Ear_1']]
active(parts[1])
for obj in parts:obj.select_set(True)
bpy.ops.object.join();body=bpy.context.object;body.name='Cat_Anatomical_Surface'
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
mod=body.modifiers.new('Continuous_anatomical_volume','REMESH');mod.mode='VOXEL';mod.voxel_size=.012;mod.use_smooth_shade=True;bpy.ops.object.modifier_apply(modifier=mod.name)
mod=body.modifiers.new('Neck_shoulder_transition','SMOOTH');mod.factor=.55;mod.iterations=5;bpy.ops.object.modifier_apply(modifier=mod.name)
def g(x,z,cx,cz,sx,sz):return math.exp(-((x-cx)/sx)**2-((z-cz)/sz)**2)
# The muzzle, philtrum and chin must read in clay, without a painted face.
for vert in body.data.vertices:
    x,y,z=vert.co
    if y<-.30 and 1.90<z<2.86:
        front=max(0,min(1,(-y-.30)/.14))
        pads=.13*(g(x,z,.145,2.14,.14,.10)+g(x,z,-.145,2.14,.14,.10))
        cheek=.055*(g(x,z,.42,2.31,.25,.19)+g(x,z,-.42,2.31,.25,.19))
        brow=.035*(g(x,z,.30,2.73,.24,.065)+g(x,z,-.30,2.73,.24,.065))
        chin=.06*g(x,z,0,1.99,.20,.065)
        smilez=2.065+.045*(abs(x)/.19)**1.4
        mouth=.020*math.exp(-((z-smilez)/.012)**2-(x/.24)**4)
        philtrum=.017*math.exp(-(x/.012)**2-((z-2.15)/.060)**4)
        vert.co.y+=front*(-pads-cheek-brow-chin+mouth+philtrum)
    if y<-.53 and .115<z<.30:
        for s in [-1,1]:
            dx=x-s*.25
            if abs(dx)<.19:vert.co.z-=.020*sum(math.exp(-((dx-gap)/.012)**2) for gap in [-.096,0,.096])*math.exp(-((y+.69)/.10)**2)
body.data.update()
bpy.data.objects['A4_Nose'].location.y-=.10
body.data.materials.clear();body.data.materials.append(clay)
for face in body.data.polygons:face.use_smooth=True

# Keep the clay view strictly about sculpture. No groom, tabby image projection,
# inherited animation or drawn whisker fan hides the form.
for obj in list(cat.objects):
    if obj.name.startswith('A4_Whisker'):bpy.data.objects.remove(obj,do_unlink=True)
    elif obj.type=='ARMATURE':bpy.data.objects.remove(obj,do_unlink=True)
    elif obj.type=='MESH':
        for attr in list(obj.data.color_attributes):obj.data.color_attributes.remove(attr)
        obj.vertex_groups.clear()

bpy.context.view_layer.update()
lowest=min((obj.matrix_world@Vector(corner)).z for obj in cat.objects if obj.type=='MESH' for corner in obj.bound_box)
for obj in cat.objects:
    if obj.type=='MESH':obj.location.z-=lowest
floor=bpy.data.objects['A_StudioFloor'];floor.location.z=-.002
scene.view_settings.exposure=0
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.5
scene.camera=bpy.data.objects['A_Camera_ThreeQuarter'];scene.camera.location=(4,-8,3.2)
scene.camera.rotation_euler=(Vector((0,0,1.6))-scene.camera.location).to_track_quat('-Z','Y').to_euler();scene.camera.data.ortho_scale=3.8
for obj in bpy.data.collections['CatA_Studio'].objects:obj.hide_set(True)
active(body)
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            space=area.spaces.active;space.shading.type='SOLID';space.shading.color_type='MATERIAL';space.overlay.show_overlays=False
            space.region_3d.view_location=(0,0,1.6);space.region_3d.view_distance=4.4;space.region_3d.view_rotation=scene.camera.rotation_euler.to_quaternion();space.region_3d.view_perspective='ORTHO'
scene['production_stage']='V6 clay anatomical reconstruction; no textures, groom or animation. Unapproved foundation study.'
bpy.ops.wm.save_as_mainfile(filepath=OUT+'/cat-a-foundation-v6.blend')
bpy.ops.object.select_all(action='DESELECT')
for obj in cat.objects:obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT+'/cat-a-foundation-v6.glb',export_format='GLB',use_selection=True,export_animations=False,export_skins=False,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_draco_position_quantization=16,export_draco_normal_quantization=16)
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=900;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
for name,loc in [('ThreeQuarter',(4,-8,3.2)),('Front',(0,-9,2.8)),('Side',(9,0,2.8)),('Back',(0,9,2.8))]:
    scene.camera.location=loc;scene.camera.rotation_euler=(Vector((0,0,1.6))-scene.camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=OUT+'/v6-'+name.lower()+'.png';bpy.ops.render.render(write_still=True);print('RENDERED_FOUNDATION',name,flush=True)
print('V6_FOUNDATION_SAVED',flush=True)
