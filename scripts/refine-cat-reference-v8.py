"""V6 -> V8: dorsal volume plus muzzle/nose/chin study informed by the
LOOF anatomy plates and CFA Bengal muzzle/profile photographs. Cartoon
proportions remain art decisions; no breed-standard dimensional claims.
"""
import bpy,bmesh,math,json
from pathlib import Path
from mathutils import Vector
OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/blender')
assert bpy.data.filepath.replace('\\','/').endswith('/cat-a-foundation-v6.blend')
scene=bpy.context.scene;body=bpy.data.objects['Cat_Anatomical_Surface'];cat=bpy.data.collections['CatA_Sculpt']
def smooth(a,b,x):
    t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
def g(x,z,cx,cz,sx,sz):return math.exp(-((x-cx)/sx)**2-((z-cz)/sz)**2)
def backdelta(p):
    x,y,z=p;h=smooth(.16,.42,z)*math.exp(-((z-1.22)/.62)**2)*(1-smooth(1.86,2.12,z));rear=smooth(-.60,.25,y)
    return Vector((x*.30*h*rear,.23*h*rear,0))
for v in body.data.vertices:
    x,y,z=v.co;v.co+=backdelta(v.co)
    if y<-.32 and 1.83<z<2.52:
        f=smooth(.32,.55,-y)
        # Paired upper-lip pads, recessed philtrum, and a supported lower jaw.
        pads=.075*(g(x,z,.19,2.15,.16,.125)+g(x,z,-.19,2.15,.16,.125))
        chin=.19*g(x,z,0,1.995,.24,.085)
        lowerlip=.070*g(x,z,0,2.06,.25,.047)
        shorten=.055*g(x,z,0,2.18,.095,.085)
        bridge=.11*g(x,z,0,2.30,.12,.13)
        v.co.y+=f*(shorten-pads-chin-lowerlip-bridge)
        line=2.075+.047*(min(abs(x)/.28,1))**1.8
        v.co.y+=f*.029*math.exp(-((z-line)/.014)**2-(x/.32)**6)
        v.co.y+=f*.023*math.exp(-(x/.013)**2-((z-2.16)/.072)**4)
body.data.update()
tail=bpy.data.objects['A4_Tail'];attr=tail.data.attributes.get('TailT')
for v in tail.data.vertices:
    t=attr.data[v.index].value if attr else 0
    v.co+=tail.matrix_world.inverted().to_3x3()@ (backdelta(tail.matrix_world@v.co)*(1-smooth(.03,.32,t)))
tail.data.update()
# Rounded nasal leather with actual recessed nostrils. The nose is a small
# wedge integrated visually into the muzzle, not an ellipsoid/button.
old=bpy.data.objects['A4_Nose'];clay=body.data.materials[0]
bpy.data.objects.remove(old,do_unlink=True)
outline=[(-.11,.041),(-.052,.057),(.052,.057),(.11,.041),(.10,-.003),(.048,-.050),(0,-.070),(-.048,-.050),(-.10,-.003)]
verts=[(x,y+(.025*max(0,z/.057) if y<-.9 else 0),z+2.198) for y in [-1.01,-.72] for x,z in outline];n=len(outline)
faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
mesh=bpy.data.meshes.new('Nasal_leather_surface');mesh.from_pydata(verts,[],faces);mesh.update()
nose=bpy.data.objects.new('A8_Nose',mesh);cat.objects.link(nose);nose.data.materials.append(clay)
def active(o):
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
active(nose)
bevel=nose.modifiers.new('Soft_nose_edges','BEVEL');bevel.width=.018;bevel.segments=4;bpy.ops.object.modifier_apply(modifier=bevel.name)
for side in [-1,1]:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=20,location=(side*.073,-1.005,2.204))
    cutter=bpy.context.object;cutter.scale=(.026,.043,.011);cutter.rotation_euler.y=side*-.30
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    active(nose);mod=nose.modifiers.new('Recessed_nostril','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cutter;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True)
bm=bmesh.new();bm.from_mesh(nose.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(nose.data);bm.free()
for p in nose.data.polygons:p.use_smooth=True
report={}
for obj in [body,tail,nose]:
    bm=bmesh.new();bm.from_mesh(obj.data);report[obj.name]={'vertices':len(bm.verts),'nonmanifold_edges':sum(not e.is_manifold for e in bm.edges),'volume':bm.calc_volume(signed=True)};bm.free()
    assert report[obj.name]['nonmanifold_edges']==0,obj.name
    assert report[obj.name]['volume']>0,obj.name
scene['production_stage']='V8 reference-informed dorsal volume, whisker pads, nose leather/nostrils, philtrum and chin; unapproved clay study.'
scene['reference_notes']='LOOF anatomy pp 7-9; CFA Bengal presentation pp 19/26; see references/anatomy/README.md. Breed examples are structural references, not target breed proportions.'
active(body);bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'cat-a-foundation-v8.blend'))
bpy.ops.object.select_all(action='DESELECT')
for obj in cat.objects:obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'cat-a-foundation-v8.glb'),export_format='GLB',use_selection=True,export_animations=False,export_skins=False,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_draco_position_quantization=16,export_draco_normal_quantization=16)
(OUT/'reference-v8-topology.json').write_text(json.dumps(report,indent=2));print('V8_SAVED',json.dumps(report),flush=True)
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=900;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
camera=scene.camera
for name,loc,target,scale in [('back',(0,9,2.8),(0,0,1.6),3.8),('side',(9,0,2.8),(0,0,1.6),3.8),('face',(0,-9,2.45),(0,-.25,2.45),1.85),('muzzle-side',(9,-.05,2.24),(0,-.05,2.24),2.1)]:
    camera.data.ortho_scale=scale;camera.location=loc;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(OUT/('v8-'+name+'.png'));bpy.ops.render.render(write_still=True);print('RENDERED_V8',name,flush=True)
