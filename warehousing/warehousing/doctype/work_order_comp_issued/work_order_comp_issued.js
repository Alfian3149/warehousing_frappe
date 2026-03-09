// Copyright (c) 2026, lukubara and contributors
// For license information, please see license.txt

frappe.ui.form.on("Work Order Comp Issued", {
 	refresh(frm) {

    },

    work_order_split_number: function(frm) {
        frm.trigger('get_work_order_details');
    },
    
    get_work_order_details: function(frm) {
        if (frm.doc.work_order_split_number) {
            let container = frm.get_field('html_wo_detail').$wrapper;
            frappe.db.get_doc('Work Order Split', frm.doc.work_order_split_number)
            .then(doc => {
                if (doc && doc.work_order_split_detail && doc.work_order_split_detail.length > 0) {
                    
                    let html = `
                    <table class="table table-bordered" style="font-size: 13px;">
                        <thead class="bg-light">
                            <tr>
                                <th>No.</th>
                                <th>Part</th>
                                <th>Description</th>
                                <th>UM</th>
                                <th>Full Required</th>
                                <th>Full Issued</th>
                                <th>Act. Needed</th>
                            </tr>
                        </thead>
                        <tbody>`;

                    let item_rows = doc.work_order_split_detail.map((item, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${item.part || ''}</td>
                            <td>${item.description || ''}</td>
                            <td>${item.um || ''}</td>
                            <td class="text-right"><strong>${item.qty_required || 0}</strong></td>
                            <td class="text-right">${item.qty_issued || 0}</td>
                            <td class="text-right">${item.actual_required || 0}</td>
                        </tr>
                    `).join('');

                    html += item_rows; 
                    html += `</tbody></table>`;
                    
                    container.html(html);
                } 
                else {
                    container.html('<div class="text-muted p-3">Data detail tidak ditemukan.</div>');
                }
            })
            .catch(err => {
                console.error(err);
                container.html('<div class="text-danger p-3">Gagal mengambil data.</div>');
            });

            frappe.call({
                method: 'warehousing.warehousing.doctype.work_order_comp_issued.work_order_comp_issued.get_lorserial_issue_details',
                args: {
                    work_order_split_number: frm.doc.work_order_split_number
                },
                callback: function(r) {
                    if (r.message) {
                        let details = r.message;
                        frm.clear_table('item_issued');
                        details.forEach(d => {
                                let row = frm.add_child('item_issued');
                                row.part = d.item;
                                row.um = d.um;
                                row.description = d.description;
                                row.lot_serial = d.lotserial;
                                row.quantity = d.qty_confirmation;
                                row.from_location = d.locationdestination; 
                                row.has_weighinged = d.has_weighinged;
                                row.has_blendinged = d.has_blendinged;
                            });
                            frm.refresh_field('item_issued');
                    }
                }
            });
        }
    }
    
});
