import bpy,json,pathlib
p=pathlib.Path(__file__).resolve().parents[2]/'output/meshy/kit-v1'
bpy.ops.wm.open_mainfile(filepath=str(p/'biomecha-kit-v1.blend'))
q=json.loads((p/'review-status.json').read_text())
for o in bpy.data.objects:
 id=o.get('asset_id')
 if id:
  o['review_status']=q.get(id,{}).get('status','candidate');o['review_note']=q.get(id,{}).get('note','Not approved for game integration')
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(p/'biomecha-kit-v1.blend'))
print('QUALITY_FLAGS_UPDATED')
