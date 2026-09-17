from docx import Document
from docx.oxml.ns import qn

def iter_block_items(doc):
    """Iterate paragraphs and tables in document order."""
    body = doc.element.body
    for child in body.iterchildren():
        tag = child.tag
        if tag == qn("w:p"):
            yield {"type": "paragraph", "element": child}
        elif tag == qn("w:tbl"):
            yield {"type": "table", "element": child}

doc = Document("supabase/migrations/dogovor-arendi.docx")

for block in iter_block_items(doc):
    if block["type"] == "paragraph":
        p = block["element"]
        # Get style name
        style_el = p.find(qn("w:pPr"))
        style_name = "Normal"
        if style_el is not None:
            style_el2 = style_el.find(qn("w:pStyle"))
            if style_el2 is not None:
                style_name = style_el2.get(qn("w:val")) or "Normal"
        text = p.text.strip()
        if text:
            print(f"[{style_name}] {text}")
    elif block["type"] == "table":
        table = block["element"]
        rows = table.findall(qn("w:tr"))
        print(f"\n=== TABLE ({len(rows)} rows) ===")
        for row in rows:
            cells = row.findall(qn("w:tc"))
            row_data = []
            for cell in cells:
                # Get all text in cell
                cell_text = ""
                for t in cell.iter(qn("w:t")):
                    if t.text:
                        cell_text += t.text
                row_data.append(cell_text.strip().replace("\n", " "))
            print(" | ".join(row_data))
        print("=== END TABLE ===\n")