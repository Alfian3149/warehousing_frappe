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
		fields=["line", "item", "lotserial"],
	)
    # Copy data Child Table secara otomatis
    for item in parent_doc:
        new_task.append("table_jaqu", {
            "line_po": item.line,
            "item": item.item,
            "lotserial": item.lotserial,
            "status": "Pending",
            "locationsource": "supplier"
        })
    
    new_task.insert() # Simpan ke database
    return new_task.name # Kembalikan ID task untuk dibuka di UI