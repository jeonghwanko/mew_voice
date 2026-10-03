"""Add dorsal rib-cage volume and shoulder width to the V6 clay study."""
import bpy,bmesh,math,json
from pathlib import Path
from mathutils import Vector
OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/blender')
assert bpy.data.filepath.replace('\\','/').endswith('/cat-a-foundation-v6.blend')
scene=bpy.context.scene
body=bpy.data.objects['Cat_Anatomical_Surface']
def smooth(a,b,x):
    t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
def displacement(p):
    x,y,z=p
    height=smooth(.28,.72,z)*(1-smooth(1.78,2.12,z))
    dorsal=smooth(-.44,.18,y)
    # Fill both sides of the rib cage, strongest at the upper back. The
    # foreleg/front-chest plane and the face remain outside the deformation.
    width=(.27+.16*math.exp(-((z-1.53)/.36)**2))*height*dorsal
    depth=.23*height*dorsal*math.exp(-((z-1.17)/.80)**2)
    return Vector((x*width,depth,0))
before=[v.co.copy() for v in body.data.vertices]
for v in body.data.vertices:v.co+=displacement(v.co)
body.data.update()
# Carry the tail attachment with the pelvis, tapering the adjustment along
# the existing tail instead of leaving its root inside the widened back.
tail=bpy.data.objects['A4_Tail'];attr=tail.data.attributes.get('TailT')
for v in tail.data.vertices:
    p=tail.matrix_world@v.co
    t=attr.data[v.index].value if attr else 0
    delta=displacement(p)*(1-smooth(.03,.32,t))
    v.co+=tail.matrix_world.inverted().to_3x3()@delta
tail.data.update()
report={}
for label,z in [('pelvis',.65),('rib_cage',1.15),('shoulders',1.55)]:
    old=[p for p in before if abs(p.z-z)<.025 and p.y>-.12]
    new=[v.co for v in body.data.vertices if abs(v.co.z-z)<.025 and v.co.y>-.12]
    report[label]={'before_width':max(p.x for p in old)-min(p.x for p in old),'after_width':max(p.x for p in new)-min(p.x for p in new),'before_back':max(p.y for p in old),'after_back':max(p.y for p in new)}
for obj in [body,tail]:
    bm=bmesh.new();bm.from_mesh(obj.data)
    assert all(e.is_manifold for e in bm.edges)
    assert bm.calc_volume(signed=True)>0
    bm.free()
scene['production_stage']='V7 wider shoulders and dorsal rib cage; unapproved clay foundation.'
camera=scene.camera
camera.location=(3,8,3.1);camera.rotation_euler=(Vector((0,0,1.6))-camera.location).to_track_quat('-Z','Y').to_euler()
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.region_3d.view_rotation=camera.rotation_euler.to_quaternion()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'cat-a-foundation-v7.blend'))
bpy.ops.object.select_all(action='DESELECT')
for obj in bpy.data.collections['CatA_Sculpt'].objects:obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'cat-a-foundation-v7.glb'),export_format='GLB',use_selection=True,export_animations=False,export_skins=False,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_draco_position_quantization=16,export_draco_normal_quantization=16)
(OUT/'back-v7-measurements.json').write_text(json.dumps(report,indent=2))
print('BACK_V7_SAVED',json.dumps(report),flush=True)
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=900;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
for name,loc in [('back',(0,9,2.8)),('side',(9,0,2.8)),('backquarter',(4,8,3.2)),('front',(0,-9,2.8))]:
    camera.location=loc;camera.rotation_euler=(Vector((0,0,1.6))-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(OUT/('v7-'+name+'.png'));bpy.ops.render.render(write_still=True)
    print('RENDERED_V7',name,flush=True)
