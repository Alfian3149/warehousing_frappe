// Copyright (c) 2026, lukubara and contributors
// For license information, please see license.txt

frappe.ui.form.on("Work Order Comp Issued", {
    onload: function(frm) {
        filter_child_table_items(frm);
        frm.set_df_property('work_order_split_number', 'read_only', 1);
        frm.set_df_property('section_break_whir', 'hidden', 1);
        frm.set_df_property('work_order_detail_section', 'hidden', 1);

    },
 	refresh(frm) {
        if (frm.doc.wo_api){
            frm.set_df_property('section_break_whir', 'hidden', 0);
            frm.set_df_property('work_order_detail_section', 'hidden', 0);
            frm.events.render_work_order_detail(frm,  JSON.parse(frm.doc.wo_api));
            frm.events.render_item_summary(frm, JSON.parse(frm.doc.wo_api));
            frm.events.render_lotserial_has_been_received(frm, JSON.parse(frm.doc.wo_api));
        }

        if(frm.doc.for_material_packaging__blending === "Packaging"){
            frm.set_df_property('qty_product_completed_to_be_issued', 'read_only', 1);
        }

        frm.set_query('work_order_split_number', function() {
            return {
                filters: {
                    'status': ['!=', 'Completed']
                }
            }; 
        });

        frm.set_df_property('work_order_number', 'read_only', 1);
  

    },

    render_lotserial_has_been_received: function(frm, data) {
        let data_wo_obj = data || frm.doc.wo_api ? JSON.parse(frm.doc.wo_api) : {};
        if (data_wo_obj.tt_fg_rct && data_wo_obj.tt_fg_rct.length > 0) {
            
            let container = frm.get_field('lotserial_has_received').$wrapper;
                 let html = `
                    <table class="table table-bordered" style="font-size: 13px;">
                        <thead class="bg-light">
                            <tr>
                               <th>No.</th>
                                <th>Lot/Serial</th>
                                <th>Employee Received</th>
                                <th>Date</th>
                                <th>Time </th>
                                <th>Quantity</th>
                            </tr>
                        </thead>
                        <tbody>`;


                    let item_rows = data_wo_obj.tt_fg_rct.map((lot, index) =>  `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${lot.tt_lot || ''}</td>
                            <td>${lot.tt_emp_rct}</td>
                            <td>${lot.tt_date_rct}</td>
                            <td>${lot.tt_time_rct}</td>
                            <td class="text-right">${format_number(lot.tt_qty_rct) || 0}</td>
                        </tr>
                    `).join('');
                    item_rows = item_rows + `<tr><td colspan="5" class="text-center text-muted"><strong>Total</strong></td><td class="text-right"><strong>${format_number(data_wo_obj.tt_fg_rct.reduce((acc, lot) => acc + (lot.tt_qty_rct || 0), 0)) || 0}</strong></td></tr>`;
                    html += item_rows; 
                    html += `</tbody></table>`;
                    
                    container.html(html);

        }
    },
    
    render_work_order_detail: function(frm, data) {
        let data_wo_obj = data || frm.doc.wo_api ? JSON.parse(frm.doc.wo_api) : {};
        if (data_wo_obj.womstr && data_wo_obj.woddet.length > 0) {
            
            let container = frm.get_field('html_wo_detail').$wrapper;
                 let html = `
                    <table class="table table-bordered" style="font-size: 13px;">
                        <thead class="bg-light">
                            <tr>
                               <th>No.</th>
                                <th>Part</th>
                                <th>Description</th>
                                <th>UM</th>
                                <th>Item Group</th>
                                <th>Full Required</th>
                                <th>Full Issued</th>
                            </tr>
                        </thead>
                        <tbody>`;


                    let item_rows = data_wo_obj.woddet.map((item, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${item.wodpart || ''}</td>
                            <td>${item.wodpart_desc || ''}</td>
                            <td>${item.wodpart_um || ''}</td>
                            <td>${item.item_group || ''}</td>
                            <td class="text-right"><strong>${format_number(item.wodqty_req) || 0}</strong></td>
                            <td class="text-right">${format_number(item.wodqty_iss) || 0}</td>
                        </tr>
                    `).join('');

                    html += item_rows; 
                    html += `</tbody></table>`;
                    
                    container.html(html);

        }
    },
    
    render_item_summary: function(frm, data) {
        console.log(data);
        let data_wo_obj = data || frm.doc.wo_api ? JSON.parse(frm.doc.wo_api) : {};
        if (data_wo_obj.womstr && data_wo_obj.woddet.length > 0) {
            frm.clear_table('item_summary_to_issued');
            frm.get_field('item_summary_to_issued').grid.cannot_add_rows = true;
            frm.get_field('item_summary_to_issued').grid.cannot_delete_rows = true;
            for (let d of data_wo_obj.woddet) {
                if (frm.doc.for_material_packaging__blending === "Packaging" && d.item_group == "PACKAGING") {
                    let row = frm.add_child('item_summary_to_issued');
                    row.part = d.wodpart;
                    row.um = d.wodpart_um;
                    row.description = d.wodpart_desc;
                    row.item_group = d.item_group; 
                    row.qty_full_required = d.wodqty_req;
                    row.qty_full_issued = d.wodqty_iss;
                    row.product_line = d.wodprod_line;

                    let match = data_wo_obj.simulated_picklist.find(item => item.ttdet_component === d.wodpart);
                    let qty_needed_val = match ? match.ttdet_qty_req : 0;

                    row.qty_needed = qty_needed_val;
                }
                 
            }
            frm.refresh_field('item_summary_to_issued');
        
        }
    },

    for_material_packaging__blending: function(frm) {
        if (frm.doc.for_material_packaging__blending === "Packaging") {
            frm.set_df_property('qty_product_completed_to_be_issued', 'read_only', 1);
            frm.set_df_property('work_order_split_number', 'read_only', 1);
            frm.set_df_property('work_order_number', 'read_only', 0);
        }
        else if (frm.doc.for_material_packaging__blending === "Blending") {
            frm.set_df_property('work_order_split_number', 'read_only', 0);
            frm.set_df_property('work_order_number', 'read_only', 0);
        }
        else {
            frm.set_df_property('work_order_split_number', 'read_only', 1);
            frm.set_df_property('work_order_number', 'read_only', 1);
        }
        filter_child_table_items(frm);
    },

    work_order_split_number: function(frm) {
        frm.trigger('get_work_order_details');
    },

    work_order_number: function(frm) {
        frm.trigger('fetch_workorder_from_qad');
    },
    
    display_work_order_details: function(frm) {
        let container = frm.get_field('html_wo_detail').$wrapper;
    },

    get_work_order_details: function(frm) {
        if (frm.doc.work_order_split_number) {
            frappe.call({
                method: 'warehousing.warehousing.doctype.work_order_comp_issued.work_order_comp_issued.get_lotserial_issue_details',
                args: {
                    work_order_split_number: frm.doc.work_order_split_number
                },
                callback: function(r) {
                    if (r.message) {
                        let details = r.message.details;
                        let work_order_split_detail = r.message.work_order_split;
                        frm.clear_table('item_issued');

                        details.forEach(d => {
                            let row = frm.add_child('item_issued');
                            row.part = d.item;
                            row.um = d.um;
                            row.description = d.description;
                            row.lot_serial = d.lotserial;
                            row.quantity = d.quantity;
                            row.from_location = d.location; 
                            row.item_group = d.item_group;
                            row.has_weighinged = d.has_weighinged;
                            row.has_blendinged = d.has_blendinged;
                        });

                        //alert(work_order_split_detail.length);
                        if (work_order_split_detail.length > 0) {
                
                                let html = `
                                <table class="table table-bordered" style="font-size: 13px;">
                                    <thead class="bg-light">
                                        <tr>
                                     <tbody>`;

                                let item_rows = work_order_split_detail.map((item, index) => `
                                    <tr>
                                        <td>${index + 1}</td>
                                        <td>${item.part || ''}</td>
                                         <th>No.</th>
                                            <th>Part</th>
                                            <th>Description</th>
                                            <th>UM</th>
                                            <th>Full Required</th>
                                            <th>Full Issued</th>
                                            <th>Act. Needed</th>
                                            <th>Qty Confirmed</th>
                                            <th>Qty Fulfilled</th>
                                        </tr>
                                    </thead>
                                          <td>${item.description || ''}</td>
                                        <td>${item.um || ''}</td>
                                        <td class="text-right"><strong>${item.qty_required || 0}</strong></td>
                                        <td class="text-right">${item.qty_issued || 0}</td>
                                        <td class="text-right">${item.actual_required || 0}</td>
                                        <td class="text-right">${item.qty_confirm || 0}</td>
                                        <td class="text-right">${item.qty_fulfilled || 0}</td>
                                    </tr>
                                `).join('');

                                html += item_rows; 
                                html += `</tbody></table>`;
                                
                                container.html(html);
                        } 
                        else {
                            container.html('<div class="text-muted p-3">Data detail tidak ditemukan.</div>');
                        }

                        frm.refresh_field('item_issued');
                    }
                }
            });
        }
    },

    fetch_workorder_from_qad(frm){
        let is_packaging = false;
        if (frm.doc.for_material_packaging__blending === "Packaging") {
            is_packaging = true;
        }

        frappe.call({
            method: "warehousing.warehousing.allAPI.get_workorder_from_qad", 
            args:{work_order: frm.doc.work_order_number, domain: "SMII", is_packaging: is_packaging, work_order_comp_issued_name: frm.doc.name}, 
            freeze: true, 
            freeze_message: __("Sedang memproses Work Order..."),
            callback: function(r) {
                if (r.message) {
                    let data = r.message.dsWOResponse;
                    let json_string = JSON.stringify(data, null, 2);
                    frm.set_value("wo_api",json_string);
                    
                    //frm.clear_table('work_order_split_detail');
                    frm.set_df_property('section_break_whir', 'hidden', 0);
                    frm.set_df_property('work_order_detail_section', 'hidden', 0);
                    frm.refresh_field('wo_api');
                    
                    if (data.womstr && data.womstr.length > 0) {
                        let header = data.womstr[0];
                        
                        frm.set_value("site", header.wosite);
                        frm.set_value("work_order_status", header.wostatus);
                        //frm.set_value("work_order", header.wonbr);
                        frm.set_value("id", header.wolot);
                        //frm.set_value("remarks", header.wormks);
                        frm.set_value("finish_good", header.wopart);
                        frm.set_value("fg_description", header.wopart_desc);
                        frm.set_value("um", header.wopart_um);
                        frm.set_value("order_date", header.woord_date);
                        //frm.set_value("release_date", header.worel_date);
                        //frm.set_value("due_date", header.wodue_date);
                        //frm.set_value("fg_qty_per_pallet", header.wopart_qtyperpallet);
                        //frm.set_value("fg_netwt", header.wopart_netwt);
                        frm.set_value("quantity_ordered", header.woqty_ord);
                        frm.set_value("quantity_completed", header.woqty_comp);
                        frm.set_value("quantity_rejected", header.woqty_rjct);
                        frm.set_value("qty_product_completed_to_be_issued", data.total_received || 0);
                    }

                    
                    frm.events.render_lotserial_has_been_received(frm, data);
                    frm.events.render_work_order_detail(frm,  data);
                    frm.events.render_item_summary(frm, data);

                    /* setTimeout(() => { 
                        frm.refresh_field('work_order_split_detail');
                    }, 1000); */
                }
                else {
                    frappe.msgprint(__("Work Order tidak ditemukan."));
                }
            },
            error: function(r) {
                frappe.msgprint(__("Terjadi kesalahan saat menghubungi server"));
            }
        });
    },
    
});

function filter_child_table_items(frm) {
    let filter_value = frm.doc.for_material_packaging__blending;
    let cur_grid = frm.get_field('item_issued').grid;
    frm.doc.item_issued.forEach(row => {
        if (filter_value === "Blending") {
            // Jika Blending, sembunyikan yang BUKAN 'OIL'
            if (row.item_group === "OIL") {
                cur_grid.grid_rows_by_docname[row.name].wrapper.show();
            } else {
                cur_grid.grid_rows_by_docname[row.name].wrapper.hide();
            }
        } else {
            // Jika 'ALL' atau pilihan lain, tampilkan semua baris
            cur_grid.grid_rows_by_docname[row.name].wrapper.show();
        }
    });

    // Refresh grid agar tampilan terupdate
    frm.refresh_field('item_issued');
}
