import bpy, hashlib, json, math
from pathlib import Path
OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/realistic/rework')
def signature():
 result={}
 for name in ['mesh_0','mesh_0.001','Object_32']:
  o=bpy.data.objects[name];m=o.data
  data={'v':[list(v.co) for v in m.vertices],'faces':[list(f.vertices) for f in m.polygons],'uv':[[list(x.uv) for x in layer.data] for layer in m.uv_layers],'keys':{k.name:[list(v.co) for v in k.data] for k in m.shape_keys.key_blocks if k.name!='SitFoldCorrective'} if m.shape_keys else {}}
  result[name]=hashlib.sha256(json.dumps(data).encode()).hexdigest()
 return result
bpy.ops.wm.open_mainfile(filepath=str(OUT/'bicolor-a-v13.blend'));before=signature()
bpy.ops.wm.open_mainfile(filepath=str(OUT/'bicolor-v13-motion-study.blend'));after=signature()
assert before==after,'Rest geometry / UV / shape keys changed'
rig=bpy.data.objects['GLTF_created_0'];s=bpy.context.scene
s.frame_set(1);start={b.name:b.matrix.copy() for b in rig.pose.bones}
s.frame_set(301);end={b.name:b.matrix.copy() for b in rig.pose.bones}
error=max(abs(start[n][i][j]-end[n][i][j]) for n in start for i in range(4) for j in range(4))
assert error<1e-4,error
scale_error=0
for frame in range(1,302,10):
 s.frame_set(frame)
 for b in rig.pose.bones:
  scale_error=max(scale_error,max(abs(x-1) for x in b.scale))
  assert all(math.isfinite(x) for row in b.matrix for x in row)
assert scale_error<1e-4,scale_error
report={'baselineGeometryUvShapeKeysUnchanged':before==after,'startEndMatrixError':error,'boneScaleError':scale_error,'durationSeconds':10,'addedPoseCorrective':'SitFoldCorrective','quality':'Motion draft: seated silhouette, hind-leg fold and foot sliding require refinement. Native runtime untested.'}
(OUT/'v13-motion-audit.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report))
