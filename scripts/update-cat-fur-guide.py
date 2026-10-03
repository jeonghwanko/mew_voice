"""Re-export only the proportion guide using the same source helper."""
import bpy,ast
from pathlib import Path
import bmesh
OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/blender')
version='12' if bpy.data.filepath.endswith('v12.blend') else '11'
assert bpy.data.filepath.endswith('v'+version+'.blend')
scene=bpy.context.scene;scene.frame_set(1)
body=bpy.data.objects['A'+version+'_Continuous_Sculpt']
source=Path('C:/Users/turbo08/mew_voice/scripts/resize-cat-v12.py').read_text()
tree=ast.parse(source)
helpers=ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in ['active','export','fur_guide']],type_ignores=[])
exec(compile(helpers,'resize-cat-v12.py','exec'))
fur_guide(version)
print('FUR_GUIDE_UPDATED',version)
