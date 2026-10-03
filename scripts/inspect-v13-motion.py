import bpy,json
s=bpy.context.scene;s.frame_set(1);r=bpy.data.objects['GLTF_created_0']
print(json.dumps([{'n':b.name,'parent':b.parent.name if b.parent else None,'head':list(r.matrix_world@b.head),'tail':list(r.matrix_world@b.tail)} for b in r.pose.bones]))
