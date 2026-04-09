// Copyright (c) 2026, lukubara and contributors
// For license information, please see license.txt
 
frappe.ui.form.on("Item Picklist", {
    onload(frm) {
        if (frm.doc.needed_date == undefined){
        frm.set_value("needed_date", frappe.datetime.get_today())
        }
    },
 	refresh(frm) {
         frm.set_query('select_request', function() {
            return {
                filters: {
                    'status': ['!=', 'Fully Picked']
                }
            };
        });
        /* frm.set_query('request_master', 'select_request', function() {
            return {
                filters: {
                    'status': ['=', "Open"]
                }
            };
        }); */
 	},
	get_item_stock(frm) {
    
        frappe.call({
            method: "warehousing.warehousing.doctype.inventory.inventory.get_fifo_picklist_with_reserved",
            args: {  
                itemPicklistName: frm.doc.name,
                item_status: "P-GOOD"
            },
            freeze: true,
            freeze_message: __("Sedang memproses get items..."),
            callback: function(r) {
                let results = r.message.results;
                let summary = r.message.summary;
                if(!results){
                    frappe.msgprint({
                            title: __('ERROR'),
                            indicator: 'red',
                            message: __('There is no stock available for the request')
                        });
                    return;
                }
                frm.clear_table('item_picklist_summary');
                frm.clear_table('item_picklist_detail');
                //alert(results);
                summary.forEach(row => {
                    let summary_child = frm.add_child('item_picklist_summary');
                    summary_child.part= row.part;
                    summary_child.site= row.site;
                    summary_child.quantity_requested= row.quantity_requested;
                    summary_child.quantity_picked= row.quantity_picked;
                });
                
                results.forEach(row => {
                    let child = frm.add_child('item_picklist_detail');
                    child.site= row.site;
                    child.part= row.part;
                    child.description = row.description;
                    child.um = row.um;
                    child.qty_per_pallet = row.qty_per_pallet;
                    child.lot_serial = row.lot_serial;
                    child.quantity = row.qty;
                    child.amt_pallet = row.amt_pallet;
                    child.conversion_factor = row.conversion_factor;
                    child.um_conversion = row.um_conversion;
                    child.from_location = row.from_location;
                    child.to_location= row.to_location;
                });
                frm.refresh_field('item_picklist_summary');
                frm.refresh_field('item_picklist_detail');
            }
        })
        
        
    }, 
    
});


frappe.ui.form.on('Item Picklist Detail', {
    quantity: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        
        if (row.part) {
            update_summary_total(frm, row.item_code);
        }
    },
    items_remove: function(frm) {
        // Trigger jika ada baris yang dihapus
        calculate_all_summaries(frm);
    }
});


var update_summary_total = function(frm, item_code) {
    let total = 0;

    // 1. Hitung total qty dari detail table untuk item tersebut
    (frm.doc.item_picklist_detail || []).forEach(d => {
        if (d.item_code === item_code) {
            total += flt(d.quantity);
        }
    });

    // 2. Cari baris yang sesuai di summary table dan update
    let summary_row_found = false;
    (frm.doc.item_picklist_summary || []).forEach(s => {
        if (s.item_code === item_code) {
            s.quantity_picked = total;
            summary_row_found = true;
        }
    });

    // 3. Refresh field summary table agar perubahan terlihat
    frm.refresh_field('item_picklist_summary');
};

// Fungsi opsional untuk kalkulasi ulang seluruhnya
var calculate_all_summaries = function(frm) {
    let totals = {};
    
    // Kelompokkan semua qty berdasarkan item_code
    (frm.doc.item_picklist_detail || []).forEach(d => {
        if (!totals[d.part]) totals[d.item_code] = 0;
        totals[d.part] += flt(d.quantity);
    });

    // Update semua baris di summary
    (frm.doc.item_picklist_summary || []).forEach(s => {
        s.quantity_picked = totals[s.part] || 0;
    });

    frm.refresh_field('item_picklist_summary');
};