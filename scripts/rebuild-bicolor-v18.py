"""Rebuild seated body and separate jaw/oral surfaces; retain Bicolor head/morphs."""
import bpy,bmesh,math,json
from pathlib import Path
from mathutils import Vector,Matrix
OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/realistic/rework');scene=bpy.context.scene
rig=bpy.data.objects['GLTF_created_0'];head=bpy.data.objects['mesh_0.001'];eyes=bpy.data.objects['mesh_0'];whiskers=bpy.data.objects['Object_32']
for o in scene.objects:
 if o.animation_data:o.animation_data_clear()
 if o.type=='MESH' and o.data.shape_keys:
  o.data.shape_keys.animation_data_clear()
  for k in o.data.shape_keys.key_blocks:k.value=0
for b in rig.pose.bones:b.matrix_basis.identity()
bpy.context.view_layer.update()
def sm(a,b,x):
 t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
def active(o):
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
# Keep the actual head; the failed folded lower body is replaced.
bm=bmesh.new();bm.from_mesh(head.data)
remove=[v for v in bm.verts if (head.matrix_world@v.co).z<.243 or (head.matrix_world@v.co).y>-.162]
bmesh.ops.delete(bm,geom=remove,context='VERTS');bm.to_mesh(head.data);bm.free();head.data.update()
# Cut a real opening through the old closed mouth surface.
bm=bmesh.new();bm.from_mesh(head.data)
removed=[v for v in bm.verts if (lambda p:p.y<-.235 and (p.x/.022)**2+((p.z-.270)/.0045)**2<1)(head.matrix_world@v.co)]
bmesh.ops.delete(bm,geom=removed,context='VERTS');bm.to_mesh(head.data);bm.free()
# Smooth the new aperture into a lip loop and keep every morph consistent.
bm=bmesh.new();bm.from_mesh(head.data);bm.verts.ensure_lookup_table()
indices={v.index for e in bm.edges if e.is_boundary for v in e.verts if (lambda p:p.y<-.24 and abs(p.x)<.032 and .253<p.z<.283)(head.matrix_world@v.co)};bm.free()
inv=head.matrix_world.inverted();jawrim={}
for i in indices:
 old=head.data.vertices[i].co.copy();p=head.matrix_world@old;angle=math.atan2((p.z-.270)/.005,p.x/.022)
 target=Vector((.0225*math.cos(angle),-.282+.004*abs(math.cos(angle)),.270+.0012*math.sin(angle)))
 delta=inv@target-old;jawrim[i]=1 if math.sin(angle)<0 else 0
 for k in head.data.shape_keys.key_blocks:k.data[i].co+=delta
 head.data.vertices[i].co+=delta
mouthfaces=removed
# A dedicated hinge, independent of the misleading source Head_Jaw eye weights.
active(rig);bpy.ops.object.mode_set(mode='EDIT');b=rig.data.edit_bones.new('A_Jaw');inv=rig.matrix_world.inverted();b.head=inv@Vector((0,-.235,.271));b.tail=inv@Vector((0,-.282,.266));b.parent=rig.data.edit_bones['Wolf_Neck_TopSHJnt_14'];bpy.ops.object.mode_set(mode='OBJECT');bpy.context.view_layer.update()
g=head.vertex_groups.new(name='A_Jaw')
for v in head.data.vertices:
 p=head.matrix_world@v.co;x,y,z=p;w=(1-sm(.263,.273,z))*(1-sm(-.245,-.217,y))*sm(.237,.250,z)
 if v.index in jawrim:w=jawrim[v.index]
 if w<.001:continue
 for old in list(v.groups):
  group=head.vertex_groups[old.group]
  if group.name!='A_Jaw':group.add([v.index],old.weight*(1-w),'REPLACE')
 g.add([v.index],w,'REPLACE')
# Disable the earlier stretchy lip test; jaw animation now drives opening.
if 'MouthOpen' in head.data.shape_keys.key_blocks:
 k=head.data.shape_keys.key_blocks['MouthOpen'];basis=head.data.shape_keys.key_blocks[0]
 for a,b in zip(k.data,basis.data):a.co=b.co
parts=[]
def ellipsoid(name,loc,scale,segments=48,rings=32):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=loc);o=bpy.context.object;o.name=name;o.scale=scale;active(o);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);parts.append(o);return o
# A single lofted torso avoids stacked ellipsoid bulges.
knots=[(.012,.063,.053,-.135),(.04,.077,.065,-.140),(.08,.077,.069,-.148),(.12,.068,.061,-.163),(.16,.058,.052,-.185),(.20,.047,.042,-.211),(.235,.042,.035,-.225),(.260,.037,.029,-.229),(.275,.024,.020,-.229)]
verts=[];faces=[];N=64
for i,(z,rx,ry,cy) in enumerate(knots):
 for j in range(N):
  a=j*2*math.pi/N;verts.append((rx*math.cos(a),cy+ry*math.sin(a),z))
 if i:
  for j in range(N):faces.append(((i-1)*N+j,(i-1)*N+(j+1)%N,i*N+(j+1)%N,i*N+j))
faces+=[tuple(reversed(range(N))),tuple((len(knots)-1)*N+j for j in range(N))]
me=bpy.data.meshes.new('TorsoLoft');me.from_pydata(verts,[],faces);torso=bpy.data.objects.new('TorsoLoft',me);scene.collection.objects.link(torso);parts.append(torso)
for sign in [-1,1]:
 ellipsoid('Haunch',(sign*.053,-.129,.058),(.039,.053,.052))
 ellipsoid('HindPaw',(sign*.069,-.211,.015),(.027,.040,.015))
 ellipsoid('Foreleg',(sign*.035,-.239,.097),(.017,.023,.084))
 ellipsoid('FrontPaw',(sign*.035,-.263,.015),(.024,.030,.015))
active(parts[0])
for o in parts:o.select_set(True)
bpy.ops.object.join();body=bpy.context.object;body.name='A_SeatedBody';body.data.remesh_voxel_size=.0022;bpy.ops.object.voxel_remesh();mod=body.modifiers.new('SurfaceRelax','SMOOTH');mod.factor=.55;mod.iterations=26;bpy.ops.object.modifier_apply(modifier=mod.name)
for p in body.data.polygons:p.use_smooth=True
# Continuous tapered tail tube, kept distinct from the rear paws.
verts=[];faces=[];count=64;sides=14
for i in range(count):
 t=i/(count-1);angle=t*math.pi*1.12;center=Vector((-.090*math.sin(angle),-.080+.045*math.cos(angle)-.13*t,.026+.045*(1-t)**4));tangent=Vector((-.090*math.pi*1.12*math.cos(angle),-.045*math.pi*1.12*math.sin(angle)-.13,-.18*(1-t)**3)).normalized();side=tangent.cross(Vector((0,0,1))).normalized();up=side.cross(tangent).normalized();r=.015*(1-.7*t**2)
 for j in range(sides):verts.append(center+r*(math.cos(j*2*math.pi/sides)*side+math.sin(j*2*math.pi/sides)*up))
 for j in range(sides):
  if i:faces.append(((i-1)*sides+j,(i-1)*sides+(j+1)%sides,i*sides+(j+1)%sides,i*sides+j))
faces+=[tuple(reversed(range(sides))),tuple((count-1)*sides+j for j in range(sides))]
mesh=bpy.data.meshes.new('TailTube');mesh.from_pydata(verts,[],faces);tail=bpy.data.objects.new('A_Tail',mesh);scene.collection.objects.link(tail)
for p in mesh.polygons:p.use_smooth=True
# Simple pigment material for new geometry; head retains its detailed source texture.
def material(name,color,rough=.65):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;return m
fur=material('A_BodyOrange',(.34,.115,.025));body.data.materials.append(fur);tail.data.materials.append(fur)
# Mouth cavity opens toward -Y and has a dark interior instead of a flat black decal.
parts=[]
cavity=ellipsoid('A_OralCavity',(0,-.258,.267),(.020,.011,.012),40,24);cavity.data.materials.append(material('MouthInterior',(.018,.004,.007),.8))
tongue=ellipsoid('A_Tongue',(0,-.263,.260),(.010,.008,.0025),32,16);tongue.data.materials.append(material('Tongue',(.36,.065,.085),.4))
# Skinned attachments share the original rig. Body bones can be refined after posing review.
def bind(o,bone):
 world=o.matrix_world.copy();o.parent=rig;o.matrix_world=world;g=o.vertex_groups.new(name=bone);g.add(list(range(len(o.data.vertices))),1,'REPLACE');m=o.modifiers.new('Armature','ARMATURE');m.object=rig
bind(body,'Wolf_ROOTSHJnt_38');bind(tail,'Wolf_ROOTSHJnt_38');bind(cavity,'Wolf_Neck_TopSHJnt_14');bind(tongue,'A_Jaw')
meshes=[head,eyes,whiskers,body,tail,cavity,tongue]
# Rotate around the hinge's local representation of the world X axis.
pb=rig.pose.bones['A_Jaw'];axis=pb.bone.matrix_local.to_3x3().inverted()@(rig.matrix_world.to_3x3().inverted()@Vector((1,0,0)));axis.normalize();pb.rotation_mode='AXIS_ANGLE'
for frame,a in [(1,0),(16,0),(30,.32),(45,.32),(60,0),(76,0)]:pb.rotation_axis_angle=(a,*axis);pb.keyframe_insert('rotation_axis_angle',frame=frame)
rig.animation_data.action.name='JawOpen';scene.frame_start=1;scene.frame_end=76;scene.render.fps=30;scene.frame_set(1)
scene['stage']='V18 body reconstruction and independent jaw/oral cavity prototype; requires visual QA.'
(OUT/'v18-build-check.json').write_text(json.dumps({'cut_mouth_faces':len(mouthfaces),'body_vertices':len(body.data.vertices),'bones':len(rig.data.bones)},indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'bicolor-a-v18.blend'))
active(rig)
for o in scene.objects:
 if o.type in ['EMPTY','ARMATURE'] or o in meshes:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'bicolor-a-v18.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_skins=True,export_morph=True)
# Neutral rendering with actual open/closed jaw and side profile.
for o in scene.objects:
 if o.type=='MESH' and o not in meshes:o.hide_render=True
scene.world=bpy.data.worlds.new('Review');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.55,.55,.55,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.4
bpy.ops.object.camera_add();camera=bpy.context.object;camera.data.type='ORTHO';scene.camera=camera
for loc,power in [((-.3,-.65,.7),18),((.35,-.2,.45),8)]:
 bpy.ops.object.light_add(type='AREA',location=loc);l=bpy.context.object;l.data.energy=power;l.data.size=.45;l.rotation_euler=(Vector((0,-.18,.2))-l.location).to_track_quat('-Z','Y').to_euler()
scene.render.engine='CYCLES';scene.cycles.samples=20;scene.render.resolution_x=700;scene.render.resolution_y=800;scene.render.resolution_percentage=100
for name,loc,target,scale,frame in [('front',(0,-1,.22),(0,-.18,.18),.43,1),('side',(1,-.18,.23),(0,-.18,.18),.43,1),('mouth-open',(.25,-1,.31),(0,-.27,.295),.17,35),('mouth-closed',(.25,-1,.31),(0,-.27,.295),.17,1)]:
 scene.frame_set(frame);camera.location=loc;camera.data.ortho_scale=scale;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(OUT/('v18-'+name+'.png'));bpy.ops.render.render(write_still=True)
