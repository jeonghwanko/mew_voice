"""Bicolor-based A face blockout. Preserve UVs, topology, rig and source morphs."""
import bpy,math,json
from pathlib import Path
from mathutils import Vector
OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/realistic/rework')
assert bpy.data.filepath.replace('\\','/').endswith('bicolor-source-study.blend')
scene=bpy.context.scene;scene.frame_set(1);bpy.context.view_layer.update()
meshes=[bpy.data.objects[n] for n in ['mesh_0','mesh_0.001','Object_32']]
rig=bpy.data.objects['GLTF_created_0']
def smooth(a,b,x):
    t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
def gauss(x,z,cx,cz,sx,sz):return math.exp(-((x-cx)/sx)**2-((z-cz)/sz)**2)
report={'source':'Bicolor Cat / kenchoo / Fripouille by guillaume bolis / CC BY 4.0','meshes':[]}
for o in meshes:
    old=[v.co.copy() for v in o.data.vertices];inv=o.matrix_world.inverted()
    def deform(local):
        p=o.matrix_world@local;x,y,z=p
        head=smooth(.249,.283,z)*(1-smooth(-.246,-.192,y))
        # Round the head and reduce the forward wedge while keeping the nose.
        p.x*=1+.20*head;p.z=.300+(p.z-.300)*(1+.10*head)
        p.y=-.235+(p.y+.235)*(1-.07*head)
        # Enlarge both the socket and the matching eye geometry continuously.
        for sign in [-1,1]:
            cx=sign*.0268;cz=.313
            w=gauss(p.x,p.z,cx,cz,.020,.016)*(1-smooth(-.272,-.250,p.y))
            p.x+=(p.x-cx)*.34*w;p.z+=(p.z-cz)*.38*w
        # Fuller lower cheek, shorter muzzle, gentle neck transition.
        cheek=gauss(p.x,p.z,0,.287,.060,.023)*(1-smooth(-.267,-.22,p.y))
        p.x*=1+.06*cheek
        return inv@p
    if o.data.shape_keys:
        for key in o.data.shape_keys.key_blocks:
            for v in key.data:v.co=deform(v.co)
        for v,k in zip(o.data.vertices,o.data.shape_keys.key_blocks[0].data):v.co=k.co
    else:
        for v in o.data.vertices:v.co=deform(v.co)
    o.data.update()
    body_delta=max((v.co-old[i]).length for i,v in enumerate(o.data.vertices) if (o.matrix_world@old[i]).z<.24) if any((o.matrix_world@p).z<.24 for p in old) else 0
    report['meshes'].append({'name':o.name,'vertices':len(o.data.vertices),'max_change':max((v.co-old[i]).length for i,v in enumerate(o.data.vertices)),'below_neck_max_change':body_delta,'morph_count':len(o.data.shape_keys.key_blocks)-1 if o.data.shape_keys else 0})
    o['source_credit']='Bicolor Cat by kenchoo; based on Fripouille by guillaume bolis; CC BY 4.0; modified face geometry by this project.'
scene['stage']='A face blockout from Bicolor, standing source pose; not final artwork.'
scene['changes']='Rounder skull and lower cheeks; enlarged socket region and matching face parts; UV/40-joint rig/source morphs preserved.'
(OUT/'bicolor-a-v1-check.json').write_text(json.dumps(report,indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'bicolor-a-v1.blend'))
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:
    if o.type in ['EMPTY','ARMATURE'] or o in meshes:o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT/'bicolor-a-v1.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_skins=True,export_morph=True,export_extras=True)
print('REWORK_V1_SAVED',json.dumps(report),flush=True)
# Review in the bind pose to avoid confusing anatomical changes with animation.
for o in scene.objects:
    if o.animation_data:o.animation_data_clear()
    if o.type=='MESH' and o.data.shape_keys:
        o.data.shape_keys.animation_data_clear()
        for k in o.data.shape_keys.key_blocks:k.value=0
for pb in rig.pose.bones:pb.matrix_basis.identity()
scene.frame_set(1);bpy.context.view_layer.update()
for o in list(scene.objects):
    if o.type=='MESH' and o not in meshes:o.hide_render=True
scene.world=bpy.data.worlds.new('Review_world');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.72,.70,.65,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.5
bpy.ops.object.camera_add();camera=bpy.context.object;camera.data.type='ORTHO';scene.camera=camera
for loc,power,size in [((-.3,-.65,.7),22,.45),((.35,-.2,.45),8,.35),((0,.25,.5),14,.35)]:
    bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,-.15,.22))-o.location).to_track_quat('-Z','Y').to_euler()
scene.render.engine='CYCLES';scene.cycles.samples=40;scene.render.resolution_x=900;scene.render.resolution_y=900;scene.render.resolution_percentage=100
for name,loc,scale,target in [('face',(0,-1,.315),.17,(0,-.275,.312)),('face-quarter',(.34,-.9,.35),.17,(0,-.26,.312)),('side',(.9,-.26,.315),.17,(0,-.26,.312)),('full',(.65,-.95,.48),.59,(0,.0,.19))]:
    camera.location=loc;camera.data.ortho_scale=scale;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(OUT/('bicolor-a-v1-'+name+'.png'));bpy.ops.render.render(write_still=True);print('REWORK_RENDER',name,flush=True)
