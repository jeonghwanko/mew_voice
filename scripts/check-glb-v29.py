import json,struct,hashlib,math
from pathlib import Path
root=Path('assets/avatar/realistic/rework');d=(root/'bicolor-a-v29.glb').read_bytes();size=struct.unpack_from('<I',d,12)[0];g=json.loads(d[20:20+size]);assert len(d)==struct.unpack_from('<I',d,8)[0]
assert [a['name'] for a in g['animations']]==['JawOpen','SlowBlink','LookAround']
materials=[m for m in g['materials'] if m['name'] in ['A_UnifiedCoat_V28','A_ShortCoatRootColor']];assert len(materials)==2
for m in materials:assert m['pbrMetallicRoughness']['baseColorTexture'].get('texCoord',0)==0
fur=next(n for n in g['nodes'] if n.get('name')=='A_ShortCoat');assert 'skin' in fur
report={'bytes':len(d),'triangles':sum(g['accessors'][p['indices']]['count']//3 for m in g['meshes'] for p in m['primitives']),'joints':[len(s['joints']) for s in g['skins']],'clips':[a['name'] for a in g['animations']],'fur_vertices':sum(g['accessors'][p['attributes']['POSITION']]['count'] for p in g['meshes'][fur['mesh']]['primitives']),'fur_skin':True,'fur_morphs':g['meshes'][fur['mesh']].get('extras',{}).get('targetNames',[])}
manifest=json.loads(Path('dist/web/cat-rework/models.json').read_text());assert manifest['rebuilt']['sha256']==hashlib.sha256(d).hexdigest()
assert hashlib.sha256((root.parent/'bicolor-cat.glb').read_bytes()).hexdigest()=='4b395ba943d647f4c490c982a70fa2175ef91569615773da7ef3429e427ed21a'
(root/'v29-glb-check.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
