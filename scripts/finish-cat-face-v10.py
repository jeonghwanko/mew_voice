import bpy,math,json,bmesh
from mathutils import Vector
from pathlib import Path
OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/blender')
body=bpy.data.objects['A10_Continuous_Sculpt']
# First establish the outer globe envelope, then relax it into facial skin.
# Run once after rebuild-cat-face-v10.py; repeated runs add extra smoothing.
for v in body.data.vertices:
    x,y,z=v.co
    if y>-.22 or z<2.38 or z>2.92:continue
    for sign in [-1,1]:
        dx=x-sign*.29;dz=z-2.65;dz_open=dz-sign*dx*.10
        bound=(.170 if dz_open>=0 else .139)*math.sqrt(max(0,1-(dx/.225)**2))
        outside=abs(dx)>.225 or abs(dz_open)>bound
        e=1-(dx/.255)**2-(dz/.215)**2
        if outside and e>-.12:
            front=-.405-.15*math.sqrt(max(0,e))-.040
            w=1 if e>=0 else (1+e/.12)
            v.co.y=min(v.co.y,v.co.y*(1-w)+front*w)
# Relax only the orbit region so projection does not leave a stepped rim.
bpy.ops.object.select_all(action='DESELECT');body.select_set(True);bpy.context.view_layer.objects.active=body
group=body.vertex_groups.new(name='V10_orbital_finish')
for v in body.data.vertices:
    x,y,z=v.co
    if y>-.20:continue
    d=min(((x-sign*.29)/.34)**2+((z-2.65)/.28)**2 for sign in [-1,1])
    if d<1.4:group.add([v.index],max(0,min(1,(1.4-d)/.4)),'REPLACE')
m=body.modifiers.new('Orbital_rim_relax','SMOOTH');m.vertex_group=group.name;m.factor=.6;m.iterations=25
bpy.ops.object.modifier_apply(modifier=m.name)
# Preserve the intended aperture; make the surrounding skin enclose the globe.
for v in body.data.vertices:
    x,y,z=v.co
    if y>-.22 or z<2.38 or z>2.92:continue
    for sign in [-1,1]:
        dx=x-sign*.29;dz=z-2.65;dz_open=dz-sign*dx*.10
        bound=(.170 if dz_open>=0 else .139)*math.sqrt(max(0,1-(dx/.225)**2))
        edge=max(abs(dx)-.225,abs(dz_open)-bound)
        blend=max(0,min(1,(edge+.025)/.040));blend=blend*blend*(3-2*blend)
        e=1-(dx/.255)**2-(dz/.215)**2
        if blend>0 and e>-.12:
            front=-.405-.15*math.sqrt(max(0,e))-.040
            w=(1 if e>=0 else (1+e/.12))*blend
            v.co.y=min(v.co.y,v.co.y*(1-w)+front*w)
body.data.update()
m=body.modifiers.new('Orbital_final_relax','SMOOTH');m.vertex_group=group.name;m.factor=.45;m.iterations=8
bpy.ops.object.modifier_apply(modifier=m.name)
bm=bmesh.new();bm.from_mesh(body.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(body.data);bm.free()
scene=bpy.context.scene
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'cat-a-foundation-v10.blend'))
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.data.collections['CatA_Sculpt'].objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'cat-a-foundation-v10.glb'),export_format='GLB',use_selection=True,export_animations=False,export_skins=False,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_draco_position_quantization=16,export_draco_normal_quantization=16)
exec((OUT.parents[2]/'scripts/check-cat-face-v10.py').read_text())
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=900;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
camera=scene.camera
for name,loc,target,scale in [('face',(0,-9,2.62),(0,-.15,2.62),1.75),('face-quarter',(4,-8,2.7),(0,-.15,2.60),1.85),('face-side',(9,-.04,2.65),(0,-.15,2.60),1.85),('full',(4,-8,3.1),(-.10,0,1.66),3.8)]:
    camera.data.ortho_scale=scale;camera.location=loc;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(OUT/('v10-release-'+name+'.png'));bpy.ops.render.render(write_still=True);print('V10_VERIFIED_RENDER',name,flush=True)
