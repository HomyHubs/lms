/** Shared `title` + `level` + `skill` inputs of the create-set and import-set forms (FormData names). */
export function SetMetaFields(): React.ReactElement {
  return (
    <>
      <label className="grid gap-1">Tên bộ đề<input name="title" required maxLength={200} className="c-input" /></label>
      <label className="grid gap-1">Cấp độ<select name="level" className="c-input">
        <option value="starter">Starter</option><option value="mover">Mover</option><option value="flyer">Flyer</option>
      </select></label>
      <label className="grid gap-1">Kỹ năng<select name="skill" className="c-input">
        <option value="reading">Reading</option><option value="listening">Listening</option>
        <option value="writing">Writing</option><option value="speaking">Speaking</option>
      </select></label>
    </>
  )
}
