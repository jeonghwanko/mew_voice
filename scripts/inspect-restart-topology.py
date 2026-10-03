import bpy,bmesh
bpy.ops.wm.open_mainfile(filepath='C:/Users/turbo08/mew_voice/assets/avatar/rebuild-v2/v13-wholebody-restart.blend')
o=bpy.data.objects['WholeBody_Retopology_Start'];bm=bmesh.new();bm.from_mesh(o.data)
print('BAD_VERTS',sum(not v.is_manifold for v in bm.verts),'BAD_NORMALS',sum(not e.is_contiguous for e in bm.edges),'VOL',bm.calc_volume(signed=True));print('VALIDATE',o.data.validate(verbose=True));bm.free()
