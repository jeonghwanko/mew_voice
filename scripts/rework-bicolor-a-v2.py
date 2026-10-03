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
            cx=sign*.0244;cz=.3044
            w=(1-smooth(.014,.032,math.hypot(p.x-cx,p.z-cz)))*(1-smooth(-.272,-.248,p.y))
            p.x+=(p.x-cx)*.55*w;p.z+=(p.z-cz)*.60*w
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
# Authored circular pupils and amber irises follow the original eye surface.
# The original socket/skin and corneal surface remain underneath.
def lin(x):return x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4
mat=bpy.data.materials.new('A_amber_eye');mat.use_nodes=True
bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.20
attr=mat.node_tree.nodes.new('ShaderNodeVertexColor');attr.layer_name='EyeColor';mat.node_tree.links.new(attr.outputs['Color'],bs.inputs['Base Color'])
for sign in [-1,1]:
    vertices=[];faces=[];colors=[];N=96
    radii=[0,.002,.004,.0063,.0065,.0066,.0075,.0088,.010,.0116]
    # deform expects the last source object's local coordinates.
    source_obj=bpy.data.objects['Object_32']
    for r in radii:
        for i in range(N):
            angle=i*math.tau/N
            p=Vector((sign*.0204+r*math.cos(angle),-.2821+.006*(r/.0116)**2,.304+r*math.sin(angle)))
            local=source_obj.matrix_world.inverted()@p;p=source_obj.matrix_world@deform(local)
            vertices.append(tuple(p))
            if r<=.0065:c=(.023,.029,.021)
            else:
                t=(r-.0066)/.005;c=(.68-.30*t,.46-.12*t,.12-.035*t)
                detail=.04*math.sin(angle*41)+.02*math.sin(angle*17)
                c=tuple(max(0,min(1,k+detail)) for k in c)
            colors.append((*[lin(k) for k in c],1))
    for j in range(len(radii)-1):
        for i in range(N):
            a=j*N+i;b=j*N+(i+1)%N;faces.append((a,a+N,b+N,b))
    d=bpy.data.meshes.new('A_EyeSurface');d.from_pydata(vertices,[],faces);d.update()
    eye=bpy.data.objects.new('A_AmberEye_L' if sign<0 else 'A_AmberEye_R',d);scene.collection.objects.link(eye);eye.parent=rig;d.materials.append(mat)
    color=d.color_attributes.new(name='EyeColor',type='FLOAT_COLOR',domain='POINT')
    for i,c in enumerate(colors):color.data[i].color=c
    d.color_attributes.active_color=color
    for p in d.polygons:p.use_smooth=True
    g=eye.vertex_groups.new(name='Wolf_Neck_TopSHJnt_14');g.add(list(range(len(vertices))),1,'REPLACE');m=eye.modifiers.new('Original_head_rig','ARMATURE');m.object=rig;meshes.append(eye)
scene['stage']='A face blockout from Bicolor, standing source pose; not final artwork.'
scene['changes']='Rounder skull and lower cheeks; enlarged socket region and matching face parts; UV/40-joint rig/source morphs preserved.'
(OUT/'bicolor-a-v2-check.json').write_text(json.dumps(report,indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'bicolor-a-v2.blend'))
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:
    if o.type in ['EMPTY','ARMATURE'] or o in meshes:o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT/'bicolor-a-v2.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_skins=True,export_morph=True,export_extras=True)
print('REWORK_V2_SAVED',json.dumps(report),flush=True)
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
    camera.location=loc;camera.data.ortho_scale=scale;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(OUT/('bicolor-a-v2-'+name+'.png'));bpy.ops.render.render(write_still=True);print('REWORK_RENDER',name,flush=True)
