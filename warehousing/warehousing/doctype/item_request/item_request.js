// Copyright (c) 2026, lukubara and contributors
// For license information, please see license.txt

frappe.ui.form.on('Item Request', {
	refresh(frm) {
		frm.add_custom_button(__('Confirming Picklist'), function() {
            if (!frm.doc.item_picklist || frm.doc.item_picklist.length === 0) {
                frappe.msgprint({
                    title: __('ERROR'),
                    indicator: 'red',
                    message:__('Tidak terdapat list item pada Item Request. Pastikan Anda telah menjalankan Get Item Stock sebelum konfirmasi picklist.')
                })
                frappe.validated = false;
                return;
            }
           
            let f = new frappe.ui.Dialog({
                title: __('Create Picklist for Item Request {0}', [frm.doc.name]),
                fields: [
                    {
                        label: __('Task Type'),
                        fieldname: 'task_type',
                        fieldtype: 'Select',
                        options: ['Picking', 'Physical Verification', 'Putaway Transfer', 'Putaway'],
                        default: 'Picking',
                        columns: 10,
                        read_only: 1
                    },
                    {
                        label: __('Task ID'),
                        fieldname: 'putaway_transfer_task_id',
                        fieldtype: 'Data',
                        default: frm.doc.putaway_transfer_task_id,
                        columns: 10,
                        read_only: 1
                    },
                    {
                        fieldtype: 'Section Break'
                    },
                    {
                        label: __('Assign To Person'),
                        fieldname: 'assign_to_person',
                        fieldtype: 'Link',
                        options: 'User',
                        columns: 10,
                        default: frm.doc.pt_person_assigned
                    },
                    {
                        label: __('Date Instruction'),
                        fieldname: 'date_instruction',
                        fieldtype: 'Date',
                        columns: 6,
                        default: frm.doc.pt_date_instruction_given ? frm.doc.pt_date_instruction_given : frappe.datetime.get_today()
                    },
                    {
                        fieldtype: 'Column Break'
                    },
        
                    { 
                        label: __('Assign To Role'),
                        fieldname: 'assign_to_role',
                        fieldtype: 'Link',
                        options: 'Role',
                        columns: 6,
                        default: frm.doc.pt_role_assigned
                    },
                    {
                        label: __('Time'),
                        fieldname: 'time',
                        fieldtype: 'Time',
                        columns: 6,
                        default: frm.doc.pt_time_instruction_given ? frm.doc.pt_time_instruction_given : frappe.datetime.now_time()
                    }
                ],
                size: 'medium',
                primary_action_label: __('Submit'),
                primary_action(values) {
                	let dataChildTable = frm.doc.item_picklist.map(row => {
                        return {
                            part: row.part,
                            description: row.description,
                            um: row.um,
                            lot_serial: row.lot_serial,
                            quantity: row.quantity,
                            qty_per_pallet: row.qty_per_pallet,
                            amt_pallet: row.amt_pallet,
                            from_location: row.from_location,
                            to_location: row.to_location,
                        };
                    });
                    frappe.call({
                        method: "warehousing.warehousing.doctype.item_request.item_request.comfirming_picklist",
                        args: {  
                            item_request_doc: frm.doc.name,
                            child_table: dataChildTable,
                            task_type: values.task_type,
                            assigned_to_person: values.assign_to_person,
                            assigned_to_role: values.assign_to_role,
                            date_instruction: values.date_instruction,
                            time: values.time,
                        },
                        freeze: true,
                        freeze_message: __("Sedang memproses create data picklist..."),
                        callback: function(r) {
                            let results = r.message;
                           
                            if (results.status === "success") {
                                frm.clear_table('item_picklist');
                                frm.refresh_field('item_picklist');
                                //frm.save()
                                frappe.show_alert({
                                    message: __(results.message + ` <a href="/app/warehouse-task/${results.task_name}">View Task</a>`),
                                    indicator: 'green'
                                });
                                f.hide();
                            }
                            
                        }
                    })
                }
            });
            f.show();

           
        });
	},


	get_stock_item(frm) {
        frappe.call({
            method: "warehousing.warehousing.doctype.inventory.inventory.get_fifo_picklist_with_reserved",
            args: {  
                item_request_doc: frm.doc.name,
                item_status: "P-GOOD"
            },
            freeze: true,
            freeze_message: __("Sedang memproses get items..."),
            callback: function(r) {
                let results = r.message;
                if(!results){
                    frappe.msgprint({
                            title: __('ERROR'),
                            indicator: 'red',
                            message: __('There is no stock available for the request')
                        });
                    return;
                }
                frm.clear_table('item_picklist');
                results.forEach(row => {
                    //alert(row.part + ' ' + row.lot_serial);
                    let child = frm.add_child('item_picklist');
                    child.site= row.site;
                    child.part= row.part;
                    child.description = row.description;
                    child.um = row.um;
                    child.qty_per_pallet = row.qty_per_pallet;
                    child.lot_serial = row.lot_serial;
                    child.quantity = row.qty;
                    child.amt_pallet = row.amt_pallet;
                    child.from_location = row.from_location;
                    child.to_location= row.to_location;
                });
                frm.refresh_field('item_picklist');
            }
        })
        
        
    }, 
    
})