# Copyright (c) 2026, lukubara and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from warehousing.warehousing.api_comp_issued import component_issued_API
from warehousing.warehousing.doctype.stock_ledger.stock_ledger import make_sl_entry
from frappe.utils import getdate, nowdate, formatdate
class WorkOrderCompIssued(Document):
    
    def on_submit(self):
        status = component_issued_API(self.name)
        if status.get("status") == "failed" : 
            frappe.throw(_("Gagal mengirim data ke QAD atau terjadi kesalahan: {0}").format(status.get("message")))
        else:
            frappe.db.set_value("Work Order Split", self.work_order_split_number, {"status": "Completed"})
            frappe.db.set_value("Work Order Split Detail", {"parent": self.work_order_split_number}, {"is_closed": 1}, update_modified=False)
            
            work_order_split_doc = frappe.get_doc("Work Order Split", self.work_order_split_number)
            for item in self.item_issued:
                data = {
                    "doctype":"Work Order Comp Issued Items",
                    "doctype_link":item.name,
                    "transType":"ISS-WO",
                    "site":work_order_split_doc.site,
                    "part":item.part,
                    "lotSerial":item.lot_serial,
                    "location":item.from_location,
                    "qtyChg":item.quantity,
                    "postingDate":getdate(nowdate()),
                    "poNumber":None,
                    "poLine":None
                }
                init_sl = make_sl_entry(**data)
                init_sl.create_new()
            frappe.db.commit()

@frappe.whitelist() 
def get_lotserial_issue_details(work_order_split_number):
    work_order_split = frappe.get_doc("Work Order Split", work_order_split_number)
    destination_location = work_order_split.shopfloor_location

    list_of_details = [] 
    task_detail_map = {}
    for item in work_order_split.work_order_split_detail:
        if item.actual_required <= 0:
            continue
        getInventory = frappe.db.get_list("Inventory", filters={"part": item.part, "warehouse_location": destination_location, "qty_on_hand": [">", 0], "inventory_status": "P-GOOD"},fields=['part', 'qty_on_hand', 'lot_serial', 'warehouse_location'], order_by='lot_serial asc')

        qty_required = item.actual_required
        for inventory in getInventory:
            if qty_required <= 0:
                break
            has_handovered = frappe.db.get_all("Warehouse Task Detail", filters={"parent": ["like", "%TASK-PICK%"],"item": inventory.part, "lotserial": inventory.lot_serial, "locationdestination": inventory.warehouse_location, "status": "Completed"}, fields=["has_handovered"], order_by="creation desc", limit=1)

            if has_handovered and has_handovered[0].has_handovered: 
                qty_will_issued = min(qty_required, inventory.qty_on_hand)
                list_of_details.append({
                    "item": inventory.part,
                    "um": item.um,
                    "description": item.description,
                    "lotserial": inventory.lot_serial,
                    "item_group":   item.item_group if item.item_group else frappe.db.get_value("Part Master", inventory.part, "item_group"),
                    "quantity": qty_will_issued,
                    "location": inventory.warehouse_location,
                    "has_weighinged": 0,
                    "has_blendinged": 0,
                })
                qty_required -= qty_will_issued
                            
                key = (inventory.part)
                if key not in task_detail_map:
                    task_detail_map[key] = {
                        "quantity": 0,
                    }
                task_detail_map[key]["quantity"] += qty_will_issued

    work_order_split_detail = []
    for d in work_order_split.work_order_split_detail:
        key = (d.part)
        work_order_split_detail.append({
            "part": d.part,
            "description": d.description,
            "um": d.um,
            "qty_required": d.qty_required,
            "qty_issued": d.qty_issued,
            "actual_required": d.actual_required,
            "qty_confirm": d.qty_confirm,
            "qty_fulfilled":  task_detail_map[key]["quantity"] if key in task_detail_map else 0,
        })


    return {"details": list_of_details, "work_order_split": work_order_split_detail}