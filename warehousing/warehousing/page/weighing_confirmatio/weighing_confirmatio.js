frappe.pages['weighing-confirmatio'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Weighing & Blending Confirmation',
		single_column: true
	});

	let container = $(wrapper).find('.layout-main-section');
	
	container.append(`
        <div id="dashboard-content" class="p-3">
            <div id="wo-list-area">
                <h4>Work Order List</h4>
                <table class="table table-bordered table-hover">
                    <thead>
                        <tr>
							<th>Work Order</th>
							<th>Finish Good</th>
							<th>Description</th>
							<th>Quantity</th>
							<th>Status</th>
							<th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody id="wo-split-list"></tbody>
                </table>
            </div>

            <div id="weighing-area" style="display:none;">
                <button class="btn btn-sm btn-default mb-3" onclick="back_to_list()">⬅ Kembali ke Daftar</button>
                <h4 id="selected-wo-title"></h4>
                <div class="card p-3">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Lot/Batch</th>
                                <th>Qty</th>
                                <th class="text-center">Selesai Timbang?</th>
                            </tr>
                        </thead>
                        <tbody id="weighing-items-body"></tbody>
                    </table>
                    <button class="btn btn-primary mt-3" onclick="submit_weighing()">Simpan & Selesaikan Timbang</button>
                </div>
            </div>
        </div>
    `);

    load_work_orders();
};

// 2. Load Daftar Work Order
window.load_work_orders = function() {
	
    $('#wo-list-area').show();
    $('#weighing-area').hide();
    
    frappe.call({
        method: 'frappe.client.get_list',
        args: {
            doctype: 'Work Order Split',
            fields: ['name', 'status','finish_good', 'fg_description', 'quantity_to_be_produced_immediately'],
			filters: { 'status': ['=', 'Ready for Weighing'] },
        },
        callback: function(r) {
            let tbody = $('#wo-split-list').empty();
            r.message.forEach(doc => {
                tbody.append(`
                    <tr>
                        <td><strong>${doc.name}</strong></td>
                        <td><strong>${doc.finish_good}</strong></td>
                        <td><strong>${doc.fg_description}</strong></td>
                        
                        <td>${doc.quantity_to_be_produced_immediately}</td>
                        <td>
                        <span class="indicator blue">
                        <strong>${doc.status}</strong>
                        </span>
                        </td>
                        <td>
                            <button class="btn btn-sm btn-primary" 
                                onclick="open_weighing('${doc.name}')">
                                    Timbang
                            </button>
                        </td>
                    </tr>
                `);
            });
        }
    });
};

// 3. Load Detail Item (Langsung Tampil di Page)
window.selected_wo = "";
window.open_weighing = function(wo_name) {
    window.selected_wo = wo_name;
    $('#wo-list-area').hide();
    $('#weighing-area').show();
    $('#selected-wo-title').text("Menimbang: " + wo_name);

    frappe.call({
        method: 'frappe.client.get_value',
        args: {
            doctype: 'Work Order Split',
            filters: { 'name': wo_name, 'docstatus': 1 },
            fieldname: 'name'
        },
        callback: function(r) {
            if (r.message) {
                render_items(r.message.name);
            }
        }
    });
};

function render_items(handover_id) {
    frappe.model.with_doc('Work Order Split', handover_id, function() {
        let items = frappe.get_doc('Work Order Split', handover_id).work_order_split_detail;
        let tbody = $('#weighing-items-body').empty();
        
        items.forEach((item, i) => {
            tbody.append(`
                <tr>
                    <td>${item.part}<br><small>${item.description}</small></td>
                    <td><span class="badge badge-warning">LOT1</span></td>
                    <td>${item.actual_required} ${item.um}</td>
                    <td class="text-center">
                        <input type="checkbox" class="item-check" data-item="${item.part}" data-batch="${item.batch_no}" data-qty="${item.actual_required}">
                    </td>
                </tr>
            `);
        });
    });
}

// 4. Submit Data secara Background
window.submit_weighing = function() {
    let checked_items = [];
    let all_checked = true;

    $('.item-check').each(function() {
        if (!$(this).is(':checked')) {
            all_checked = false;
        }
        checked_items.append({
            item_code: $(this).data('item'),
            batch_no: $(this).data('batch'),
            qty: $(this).data('qty')
        });
    });

    if (!all_checked) {
        frappe.msgprint("Semua item harus ditimbang sebelum disimpan!");
        return;
    }

    // Buat dokumen Konfirmasi Timbang via API
    frappe.call({
        method: 'frappe.client.insert',
        args: {
            doc: {
                doctype: 'Konfirmasi Timbang',
                work_order_split: window.selected_wo,
                status: 'Completed',
                items: checked_items.map(i => ({
                    item_code: i.item_code,
                    batch_no: i.batch_no,
                    qty_handover: i.qty,
                    sudah_ditimbang: 1
                }))
            }
        },
        callback: function() {
            frappe.show_alert({message: __('Timbang Berhasil Disimpan'), indicator: 'green'});
            load_work_orders(); // Kembali ke list
        }
    });
};

window.back_to_list = function() {
    $('#wo-list-area').show();
    $('#weighing-area').hide();
};