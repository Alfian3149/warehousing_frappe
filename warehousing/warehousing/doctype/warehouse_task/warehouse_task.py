# Copyright (c) 2026, lukubara and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document
import frappe
from frappe.model.naming import make_autoname

class WarehouseTask(Document):

    def autoname(self):
        # 1. Tentukan mapping kode berdasarkan task_type
        type_codes = {
            "Picking": "PICK",
            "Physical Verification": "VER",
            "Stock Transfer": "TRF",
            "Putaway": "PUT"
        }

        # 2. Ambil kode singkatnya, default ke 'GEN' jika tidak ditemukan
        code = type_codes.get(self.task_type, "GEN")

        # 3. Ambil tahun saat ini
        year = frappe.utils.nowdate()[:4]

        # 4. Gabungkan menjadi format Naming Series
        # Format: TASK-CODE-YYYY-#####
        # .##### akan otomatis diisi dengan nomor urut (00001, 00002, dst)
        self.name = make_autoname(f"WHTASK-{code}-{year}-.#####")

    def validate(self):
            self.update_status_based_on_details()
            self.lock_document_if_completed()

    def update_status_based_on_details(self):
        if not self.warehouse_task_detail:
            self.status = "Pending"
            return

        all_complete = all(d.status == "Completed" for d in self.warehouse_task_detail)
        
        if all_complete:
            self.status = "Completed"


    def lock_document_if_completed(self):
            """Kunci dokumen jika status sebelumnya sudah Complete"""
            # Ambil data asli dari database sebelum perubahan disimpan
            old_doc = self.get_doc_before_save()
            
            # Jika di database statusnya sudah 'Complete'
            if old_doc and old_doc.status == "Completed":
                # Izinkan hanya System Manager yang bisa melakukan bypass/edit
                if "System Manager" not in frappe.get_roles():
                    frappe.throw(
                        _("Dokumen ini sudah dikunci karena statusnya sudah Complete. "
                        "Hanya System Manager yang dapat mengubah dokumen ini."),
                        frappe.ValidationError
                    )
@frappe.whitelist()
def create_warehouse_task(source_doc, task_type, assigned_to_person=None, assigned_to_role=None):
    # Ambil data dari dokumen sumber (misal: Physical Verification)
    #parent_doc = frappe.get_doc("Physical Verification Instruction", source_doc)
    task =  frappe.get_all("Material Label", 
		filters={ 
			"material_incoming_link": source_doc,
		},
		fields=["line", "item", "lotserial"],
	)
    new_task = frappe.new_doc("Warehouse Task")
    new_task.task_type = task_type
    new_task.reference_doctype = "Material Label"
    new_task.reference_name = source_doc
    new_task.assign_to_user = assigned_to_person
    new_task.assign_to_role = assigned_to_role
    new_task.date_instruction = frappe.utils.nowdate()
    new_task.time_instruction = frappe.utils.nowtime()
    
    parent_doc = frappe.get_all("Material Label", 
		filters={ 
			"material_incoming_link": source_doc,
		},
		fields=["name","line", "item", "lotserial", "qty"],
	)
    # Copy data Child Table secara otomatis
    for item in parent_doc:
        new_task.append("warehouse_task_detail", {
            "material_label_link": item.name,
            "line_po": item.line,
            "item": item.item, 
            "description": frappe.db.get_value("Part Master", item.item, "description"),
            "lotserial": item.lotserial,
            "qty_label": item.qty,
            "status": "Pending",
            "locationsource": "supplier"
        })
    
    new_task.insert() # Simpan ke database
    return new_task.name # Kembalikan ID task untuk dibuka di UI