"""V11 -> V12 proportion study: head -8%, additional width -3%; fur guides."""
import bpy,bmesh,json
from pathlib import Path
from mathutils import Vector
OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/blender')
assert bpy.data.filepath.replace('\\','/').endswith('cat-a-foundation-v11.blend')
scene=bpy.context.scene;scene.frame_set(1);cat=bpy.data.collections['CatA_Sculpt']
body=bpy.data.objects['A11_Continuous_Sculpt'];anchor=Vector((0,0,1.95))
def active(o):
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
def weight(z):
    t=max(0,min(1,(z-1.78)/.37));return t*t*(3-2*t)
def export(path,objects,animated=False):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_animations=animated,export_animation_mode='ACTIVE_ACTIONS',export_skins=animated,export_morph=animated,export_morph_normal=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_draco_position_quantization=16,export_draco_normal_quantization=16)
def fur_guide(version):
    data=body.data.copy();guide=bpy.data.objects.new('Fur_envelope_'+version,data);scene.collection.objects.link(guide)
    bm=bmesh.new();bm.from_mesh(data)
    bmesh.ops.delete(bm,geom=[v for v in bm.verts if v.co.z<2.13],context='VERTS');bm.normal_update()
    # Keep the rear silhouette and crown/ears, omitting the facial eye holes.
    bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.calc_center_median().y<-.02 and f.calc_center_median().z<2.93],context='FACES')
    bm.normal_update()
    for v in bm.verts:
        # Approximate coat allowance; small at front, larger at cheeks/temples.
        length=.060 if v.normal.y>-.4 or abs(v.co.x)>.40 else .012
        length*=min(1,max(0,(v.co.z-2.13)/.18))
        v.co+=v.normal*length
    bm.to_mesh(data);bm.free();data.update();active(guide)
    m=guide.modifiers.new('Guide_density','DECIMATE');m.ratio=.45;bpy.ops.object.modifier_apply(modifier=m.name)
    export(OUT/('fur-envelope-v'+version+'.glb'),[guide])
    bpy.data.objects.remove(guide,do_unlink=True)
fur_guide('11')
before={o.name:[tuple(v.co) for v in o.data.vertices] for o in [body,bpy.data.objects['A11_Free_Tail']]}
for o in list(cat.objects):
    if o.type!='MESH' or 'Tail' in o.name:continue
    inv=o.matrix_world.inverted()
    def transform(p):
        world=o.matrix_world@p;w=weight(world.z) if o==body else 1
        d=world-anchor;target=anchor+Vector((d.x*.92*.97,d.y*.92,d.z*.92))
        return inv@(world+(target-world)*w)
    if o.data.shape_keys:
        for key in o.data.shape_keys.key_blocks:
            for v in key.data:v.co=transform(v.co)
        for v,k in zip(o.data.vertices,o.data.shape_keys.key_blocks[0].data):v.co=k.co
    else:
        for v in o.data.vertices:v.co=transform(v.co)
    o.data.update()
    o.name=o.name.replace('A11','A12')
rig=bpy.data.objects['A11_Motion_Rig'];rig.name='A12_Motion_Rig'
# The pivot stays at the neck. Changing bone length is unnecessary for rotation.
fur_guide('12')
report={'head_scale_xyz':[.8924,.92,.92],'pivot':[0,0,1.95],'fur_allowance':{'cheeks_temples':.060,'front':.012,'units':'scene units; visual estimate, not groomed fur'},'meshes':{}}
report['lower_body_max_delta']=max((Vector(old)-v.co).length for old,v in zip(before['A11_Continuous_Sculpt'],body.data.vertices) if old[2]<=1.78)
tail=bpy.data.objects['A11_Free_Tail'];report['tail_max_delta']=max((Vector(old)-v.co).length for old,v in zip(before['A11_Free_Tail'],tail.data.vertices))
assert report['lower_body_max_delta']<1e-7 and report['tail_max_delta']<1e-7
for o in [body,bpy.data.objects['A12_Nose'],tail]:
    bm=bmesh.new();bm.from_mesh(o.data);s={'vertices':len(bm.verts),'nonmanifold':sum(not e.is_manifold for e in bm.edges),'volume':bm.calc_volume(signed=True)};bm.free()
    assert s['nonmanifold']==0 and s['volume']>0
    report['meshes'][o.name]=s
(OUT/'v12-proportion-check.json').write_text(json.dumps(report,indent=2))
scene['production_stage']='V12 head size comparison: 8 percent smaller, extra 3 percent narrower; estimated fur silhouette is separate.'
active(body);bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'cat-a-foundation-v12.blend'));export(OUT/'cat-a-foundation-v12.glb',list(cat.objects),True)
print('V12_SAVED',json.dumps(report),flush=True)
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=900;scene.render.resolution_y=1000;scene.render.resolution_percentage=100;camera=scene.camera
for name,loc,frame,scale,target in [('front',(0,-9,2.6),1,3.8,(0,0,1.67)),('quarter',(4,-8,3.1),1,3.8,(0,0,1.67)),('side',(9,0,2.6),1,3.8,(0,0,1.67)),('blink',(0,-9,2.6),50,1.85,(0,-.1,2.55))]:
    scene.frame_set(frame);camera.data.ortho_scale=scale;camera.location=loc;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(OUT/('v12-'+name+'.png'));bpy.ops.render.render(write_still=True);print('V12_RENDER',name,flush=True)
