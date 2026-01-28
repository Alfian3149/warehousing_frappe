# Copyright (c) 2026, lukubara and contributors
# For license information, please see license.txt

# import frappe
from pydoc import doc
from frappe.model.document import Document
import frappe
from frappe.model.naming import make_autoname
from warehousing.warehousing.specialLogic import get_multi_bin_suggestion
 
class WarehouseTask(Document):
    """  def on_submit(self):
         from frappe.desk.doctype.notification_log.notification_log import enqueue_create_notification
         enqueue_create_notification(self.owner, {
            "subject": f"Dokumen {self.name} telah disubmit",
            "document_type": self.doctype,
            "document_name": self.name,
            "from_user": self.owner,
            "type": "Alert"
        }) """

        
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
            #self.lock_document_if_completed()

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
def create_physical_verification_task(source_doc, task_type, assigned_to_person=None, assigned_to_role=None):
    new_task = frappe.new_doc("Warehouse Task")
    new_task.task_type = task_type
    new_task.reference_doctype = "Material Label"
    new_task.reference_name = source_doc
    new_task.assign_to_user = assigned_to_person
    new_task.assign_to_role = assigned_to_role
    new_task.date_instruction = frappe.utils.nowdate()
    new_task.time_instruction = frappe.utils.nowtime()
    
    Material_Label = frappe.get_all("Material Label", 
		filters={ 
			"material_incoming_link": source_doc,
		},
		fields=["name","line", "item", "lotserial", "qty"],
	)

    Material_Incoming = frappe.get_doc("Material Incoming", source_doc)
    
    # Copy data Child Table secara otomatis
    for item in Material_Label:
        Material_Incoming_Item = next((d for d in Material_Incoming.material_incoming_item if d.pod_line == item.line), None)

        new_task.append("warehouse_task_detail", {
            "material_label_link": item.name,
            "line_po": item.line,
            "item": item.item, 
            "description": frappe.db.get_value("Part Master", item.item, "description"),
            "lotserial": item.lotserial,
            "qty_label": item.qty,
            "expired_date": Material_Incoming_Item.expired_date if Material_Incoming_Item else None,
            "status": "Pending",
            "locationsource": "supplier",
            "locationdestination": Material_Incoming_Item.location_to_receive if Material_Incoming_Item else None,
        })
     
    new_task.insert() # Simpan ke database
    """ if task_type == "Physical Verification":
        Material_Incoming.physical_verification_id =  new_task.name 
    elif task_type == "Putaway Transfer":
        Material_Incoming.transfer_task_id = new_task.name
    Material_Incoming.save() """
    frappe.db.commit()
    return {
         "status": "success",
         "name": new_task.name,
         "message": "Warehouse Task created successfully."
    } # Kembalikan ID task untuk dibuka di UI


@frappe.whitelist()
def create_putaway_transfer_task(source_doc, task_type, assigned_to_person=None, assigned_to_role=None):
    new_task = frappe.new_doc("Warehouse Task")
    new_task.task_type = task_type
    new_task.reference_doctype = "Warehouse Task"
    new_task.reference_name = source_doc
    new_task.assign_to_user = assigned_to_person
    new_task.assign_to_role = assigned_to_role
    new_task.date_instruction = frappe.utils.nowdate()
    new_task.time_instruction = frappe.utils.nowtime()

    Warehouse_Task = frappe.get_doc("Warehouse Task", source_doc)
    
    grouped_data = {}

    # Copy data Child Table secara otomatis
    for detail in Warehouse_Task.warehouse_task_detail:
        key = (detail.part)
        if key not in grouped_data:
            # Jika grup belum ada, inisialisasi dengan nilai awal
            grouped_data[key] = {
                "part": detail.part,
                "count_record": 0
            }
        grouped_data[key]["count_record"] += 1
        
    for group in grouped_data : 
        putaway_location = get_multi_bin_suggestion("1000", group.item, group.count_record)

        Warehouse_Task_Detail = frappe.get_all("Warehouse Task Detail", filters={
        "parent": Warehouse_Task.name,    # ID dokumen induk
        "part": group.part      # Filter part spesifik
        }, fields=["name", "item", "description", "lotserial", "line_po", "qty_confirmation", "expired_date", "locationdestination"])
        
        for task_detail in Warehouse_Task_Detail : 
            new_task.append("warehouse_task_detail", {
                "warehouse_task_link": task_detail.name,
                "line_po": task_detail.line_po,
                "item": task_detail.item, 
                "description": task_detail.description,
                "lotserial": task_detail.lotserial,
                "qty_label": task_detail.qty_confirmation,
                "expired_date": task_detail.expired_date,
                "status": "Pending",
                "locationsource": task_detail.locationdestination,
                "locationdestination":task_detail.locationdestination,
            })


    new_task.insert() # Simpan ke database

    frappe.db.commit()
    return {
         "status": "success",
         "name": new_task.name,
         "message": "Warehouse Task created successfully."
    } 