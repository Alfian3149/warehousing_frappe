# Copyright (c) 2025, lukubara and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document
from frappe.model.naming import getseries
from frappe.utils import getdate, nowdate
import frappe
class MaterialLabel(Document):
	def auto_name(self):
		today = getdate(nowdate())
		month = today.strftime("%m")
		year  = today.strftime("%y")
	
		label_prefix = f"LBL-{month}{year}-"
		label_running_number = getseries(label_prefix, 4)
		self.name = f"{month}{year}-{label_running_number}"


@frappe.whitelist()
def sync_material_labels(data, parent_doc_name):
    import json
    items = json.loads(data)
    
    # 1. Ambil semua ID yang ada di database saat ini untuk parent ini
    # Asumsi: Ada field 'reference_parent' yang menghubungkan Label ke dokumen saat ini
    existing_labels = frappe.get_all("Material Label", 
        filters={"material_incoming_link": parent_doc_name}, 
        fields=["name"]
    )
    existing_ids = [d.name for d in existing_labels]
    
    incoming_ids = [row.get("name") for row in items if row.get("name")]
    
    # 2. DELETE: Hapus data yang ada di DB tapi tidak ada di kiriman Dialog
    ids_to_delete = [id for id in existing_ids if id not in incoming_ids]
    for doc_name in ids_to_delete:
        frappe.delete_doc("Material Label", doc_name)

    # 3. INSERT & UPDATE
    for row in items:
        if row.get("name") and row.get("name") in existing_ids:
            # UPDATE data yang sudah ada
            doc = frappe.get_doc("Material Label", row.get("name"))
            doc.line = row.get("line")
            doc.item = row.get("item")
            doc.lotserial = row.get("lotserial")
            doc.qty = row.get("qty")
            doc.barcode_fwrj = row.get("item") + "#" + row.get("lotserial"),
            doc.save()
        else:
            # INSERT data baru
            new_doc = frappe.get_doc({
                "doctype": "Material Label",
                "material_incoming_link": parent_doc_name,
                "line": row.get("line"),
                "item": row.get("item"),
                "lotserial": row.get("lotserial"),
                "qty": row.get("qty"),
                "barcode_fwrj": row.get("item") + "#" + row.get("lotserial"),
            })
            new_doc.insert()

    frappe.db.commit()
    return {"status": "success", "message": "Sinkronisasi Berhasil"}