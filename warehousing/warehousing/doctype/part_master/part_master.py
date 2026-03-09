# Copyright (c) 2026, lukubara and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class PartMaster(Document):
	def before_save(self):
		conversion_factor = self.um_conversion_factor
		if conversion_factor:
			default_count = 0
			for row in conversion_factor:
				if row.default:
					default_count += 1

			if default_count > 1:
				frappe.msgprint("Only one conversion factor can be set as default.")
				return	
			elif default_count == 0:
				frappe.msgprint("Please set one conversion factor as default.")
				return
	def validate(self):
		self.part = self.part.upper()

@frappe.whitelist()
def get_item_stock_details(item_code):
    item_info = frappe.db.get_value("Part Master", item_code, 
        ["name", "description", "drawing_location", "um", "category"], 
        as_dict=1
    )
    if not item_info:
        frappe.throw(f"Item {item_code} tidak ditemukan", frappe.DoesNotExistError)
    inventory_entries = frappe.get_all("Inventory", 
        filters={"part": item_code, "qty_on_hand": [">", 0]},
        fields=["warehouse_location", "qty_on_hand","lot_serial","creation","expire_date", "site"]
    )
    locations = []
    total_stock = 0
    for entry in inventory_entries:
        total_stock += entry.qty_on_hand
        
        rack_prefix = entry.warehouse_location.split('-')[0] if '-' in entry.warehouse_location else entry.warehouse_location[:4]
        
        locations.append({
            "rack": rack_prefix,
            "lot_serial": entry.lot_serial,
            "location": entry.warehouse_location,
            "quantity": entry.qty_on_hand,
            "creation": entry.creation,
            "expire_date": entry.expire_date
        })
    reserved_stock = frappe.db.get_all('Reserved Task Entry', filters={'purpose': "Picking",'site': entry.site,'part': item_code},fields=['SUM(qty) as total_reserved'])
    result = {
        item_info.name: {
            "sku": item_info.name,
            "name": item_info.description,
            "um": item_info.um,
            "category": item_info.category, 
            "drawing_location": item_info.drawing_location,
            "totalStock": total_stock,
            "minStock": 0,
            "locations": locations,
            "unitPrice": 0,
            "reservedStock": reserved_stock[0].total_reserved if reserved_stock else 0
        }
    }

    return result