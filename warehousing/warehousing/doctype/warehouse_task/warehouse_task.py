# Copyright (c) 2026, lukubara and contributors
# For license information, please see license.txt

# import frappe
from pydoc import doc
from frappe.model.document import Document
import frappe
from frappe.model.naming import make_autoname
from warehousing.warehousing.specialLogic import get_multi_bin_suggestion
import copy

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

    """ def on_update(self):
        for row in self.warehouse_task_detail:
            if row.status == 'Completed' and not self.has_background_job :
                self.has_background_job = True
                self.save() """

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
    default_site = frappe.db.get_single_value("Material Incoming Control", "default_site")

    new_task = frappe.new_doc("Warehouse Task")
    new_task.task_type = task_type
    new_task.reference_doctype = "Warehouse Task"
    new_task.reference_name = source_doc
    new_task.assign_to_user = assigned_to_person
    new_task.assign_to_role = assigned_to_role
    new_task.date_instruction = frappe.utils.nowdate()
    new_task.time_instruction = frappe.utils.nowtime()

    Warehouse_Task = frappe.get_doc("Warehouse Task", source_doc)

    sorted_task_details = sorted(
        Warehouse_Task.warehouse_task_detail, 
        key=lambda x: (x.item, x.lotserial), 
        reverse=True
    )
    grouped_summary = {}
    for td in sorted_task_details:
        if td.item not in grouped_summary:
            grouped_summary[td.item] = 0

        current_val = grouped_summary[td.item]
        grouped_summary[td.item] = current_val + 1

    item_location_map = {}
    item_location_map_copy = {}

    for item_code, total_pallet in grouped_summary.items():
        item_location_map[item_code] = location_suggestion(item_code, total_pallet, source_doc)

    item_location_map_copy = copy.deepcopy(item_location_map)

    for task_detail in sorted_task_details:
        item_code = task_detail.item

        if item_location_map.get(item_code):
            current_suggestion = item_location_map[item_code][0]
            target_location = current_suggestion['location']

            current_suggestion['amt_pallet_covered'] -= 1

            if current_suggestion['amt_pallet_covered'] <= 0:
                item_location_map[item_code].pop(0)

            print(f"Assigning item {item_code} and lotserial {task_detail.lotserial} to location {target_location}. Remaining pallet for this location: {current_suggestion['amt_pallet_covered']}")
            new_task.append("warehouse_task_detail", {
                "warehouse_task_link": source_doc,
                "line_po": task_detail.line_po,
                "item": task_detail.item, 
                "description": task_detail.description,
                "lotserial": task_detail.lotserial,
                "qty_label": task_detail.qty_confirmation,
                "expired_date": task_detail.expired_date,
                "status": "Pending",
                "locationsource": task_detail.locationdestination,
                "locationsuggestion":target_location,
            })
 
    new_task.insert()
    frappe.db.commit()
    for key, data in item_location_map_copy.items():
        if not data:
            continue
        new_reserved = frappe.new_doc("Reserved Task Entry")
        new_reserved.site = default_site
        new_reserved.warehouse_location = data[0]['location']
        new_reserved.doctype_source = "Warehouse Task"
        new_reserved.task = new_task.name
        new_reserved.qty = data[0]['amt_pallet_covered']
 
        new_reserved.insert() 
    frappe.db.commit()

    return {
        "status": "success",
        "name": new_task.name,
        "message": "Warehouse Task created successfully.",
        "grouped_summary": grouped_summary
    } 

def location_suggestion(item_code, total_incoming_pallet, reference_doc=None):
    control = frappe.get_doc("Material Incoming Control")
    drawing_loc = frappe.db.get_value("Part Master", item_code, "drawing_location")
    
    # Penampung hasil split
    suggestions = []
    remaining_pallet = total_incoming_pallet

    if not drawing_loc:
        frappe.throw(f"Part Master {item_code} tidak memiliki Drawing Location")

    putaway_method = frappe.get_doc("Putaway Method", drawing_loc)
    sorted_locations = sorted(
        putaway_method.locations, 
        key=lambda x: (x.priority, x.location)
    )

    for loc in sorted_locations:
        if remaining_pallet <= 0:
            break

        # 1. Cek Mix Item (Sesuai logic Anda)
        if not control.storage_can_mix_item:
            exists = frappe.db.exists("Inventory", {
                "site": control.default_site,
                "warehouse_location": loc.location,
                "part": ["!=", item_code]
            })
            if exists:
                continue

        # 2. Hitung Kapasitas Tersedia (Free Pallet)
        reserved_entries = frappe.db.get_all('Reserved Task Entry', filters={
            'site': control.default_site,
            'warehouse_location': loc.location
        }, fields=['SUM(qty) as total_reserved'])

        total_reserved = reserved_entries[0].total_reserved if reserved_entries and reserved_entries[0].total_reserved else 0
        free_pallet = loc.capacity - total_reserved

        # 3. Skip jika lokasi penuh
        if free_pallet <= 0:
            continue

        # 4. Tentukan berapa yang bisa masuk ke lokasi ini
        can_take = min(free_pallet, remaining_pallet)

        # 5. Cek Threshold (Optional, jika ingin minimal pengisian tertentu)
        if control.rack_availability_threshold > 0:
            free_percentage = free_pallet / total_incoming_pallet * 100
            if free_percentage < control.rack_availability_threshold:
                continue

        # 6. Catat lokasi dan jumlah pallet yang dialokasikan
        suggestions.append({
            "location": loc.location,
            "amt_pallet_covered": can_take
        })

        # 7. Kurangi sisa pallet yang belum dapat tempat
        remaining_pallet -= can_take

    return suggestions
