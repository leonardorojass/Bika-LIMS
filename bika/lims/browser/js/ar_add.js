(function( $ ) {
"use strict";

function toggle_spec_fields(element) {
	// when a service checkbox is clicked, this is used to display
	// or remove the specification inputs.
	if(!$("#bika_setup").attr("EnableARSpecs")) { return; }
	var column = $(element).attr("column");
	var root_name = $(element).attr("name");
	var min_name   = root_name.replace("Analyses", "min");
	var max_name   = root_name.replace("Analyses", "max");
	var error_name = root_name.replace("Analyses", "error");
	var service_uid = $(element).attr("id");
	var spec_uid = $("#ar_"+column+"_Specification_uid").val();
	if ($(element).prop("checked") && $(element).siblings().filter("[name='"+min_name+"']").length === 0) {
		if (spec_uid !== ""){
			var request_data = {
				catalog_name: "uid_catalog",
				UID: spec_uid
			};
			window.jsonapi_read(request_data, function(data) {
				var min_val = "";
				var max_val = "";
				var error_val = "";
				if (data.objects.length > 0) {
					var rr = data.objects[0].ResultsRange;
					for (var i in rr) {
						if (!(rr.hasOwnProperty(i))){ continue; }
						if (rr[i].keyword == $(element).attr("keyword")) {
							min_val = rr[i].min;
							max_val = rr[i].max;
							error_val = rr[i].error;
							break;
						}
					}
				}
				var min =   $("<input class='spec_bit min'   type='text' size='3' uid='"+service_uid+"' value='"+min_val+  "' name='"+min_name+  "' keyword='"+$(element).attr("keyword")+"' autocomplete='off' placeholder='&gt;'/>");
				var max =   $("<input class='spec_bit max'   type='text' size='3' uid='"+service_uid+"' value='"+max_val+  "' name='"+max_name+  "' keyword='"+$(element).attr("keyword")+"' autocomplete='off' placeholder='&lt;'/>");
				var error = $("<input class='spec_bit error' type='text' size='3' uid='"+service_uid+"' value='"+error_val+"' name='"+error_name+"' keyword='"+$(element).attr("keyword")+"' autocomplete='off' placeholder='%'/>");
				$(element).after(error).after(max).after(min);
			});
		} else {
			var min =   $("<input class='spec_bit min'   type='text' size='3' uid='"+service_uid+"' value='' name='"+min_name+  "' keyword='"+$(element).attr("keyword")+"' autocomplete='off' placeholder='&gt;'/>");
			var max =   $("<input class='spec_bit max'   type='text' size='3' uid='"+service_uid+"' value='' name='"+max_name+  "' keyword='"+$(element).attr("keyword")+"' autocomplete='off' placeholder='&lt;'/>");
			var error = $("<input class='spec_bit error' type='text' size='3' uid='"+service_uid+"' value='' name='"+error_name+"' keyword='"+$(element).attr("keyword")+"' autocomplete='off' placeholder='%'/>");
			$(element).after(error).after(max).after(min);
		}
	} else {
		$("input[name='"+min_name+  "']").filter("[uid='"+service_uid+"']").remove();
		$("input[name='"+max_name+  "']").filter("[uid='"+service_uid+"']").remove();
		$("input[name='"+error_name+"']").filter("[uid='"+service_uid+"']").remove();
	}
}

function reset_spec_field_values(column) {
	// When a spec is selected, all existing spec fields are cleared and reset
	if(!$("#bika_setup").attr("EnableARSpecs")) { return; }
	var spec_uid = $("#ar_"+column+"_Specification_uid").val();
	if(spec_uid !== ""){
		var request_data = {
			catalog_name: "uid_catalog",
			UID: spec_uid
		};
		window.jsonapi_read(request_data, function(data) {
			// 1 empty all specification inputs.
			// 2 set specification values in all supported services.
			var min_name = "[name^='ar."+column+".min']";
			var max_name = "[name^='ar."+column+".max']";
			var error_name = "[name^='ar."+column+".error']";
			$(min_name).val("");
			$(max_name).val("");
			$(error_name).val("");
			if (data.objects.length > 0) {
				var rr = data.objects[0].ResultsRange;
				for (var i in rr) {
					var kw = "[keyword='"+rr[i].keyword+"']";
					var this_min   = $(min_name).filter(kw);
					var this_max   = $(max_name).filter(kw);
					var this_error = $(error_name).filter(kw);
					if ($(this_min)) {
						$(this_min).val(rr[i].min);
						$(this_max).val(rr[i].max);
						$(this_error).val(rr[i].error);
					}
				}
			}
		});
	}
}

function validate_spec_field_entry(element) {
	var sb_col = $(element).attr("name").split(".")[1];
	var uid = $(element).attr("uid");
	$("[name^='ar\\."+sb_col+"\\.Specification']").val("");
	$("[name^='ar\\."+sb_col+"\\.Specification_uid']").val("");
	var min_element = $("[name='ar\\."+sb_col+"\\.min:list:ignore_empty:record']").filter("[uid='"+uid+"']");
	var max_element = $("[name='ar\\."+sb_col+"\\.max:list:ignore_empty:record']").filter("[uid='"+uid+"']");
	var error_element = $("[name='ar\\."+sb_col+"\\.error:list:ignore_empty:record']").filter("[uid='"+uid+"']");
	var min = parseFloat($(min_element).val(), 10);
	var max = parseFloat($(max_element).val(), 10);
	var error = parseFloat($(error_element).val(), 10);

	if($(element).hasClass("min")){
		if(isNaN(min)) {
			$(min_element).val("");
		} else if ((!isNaN(max)) && min > max) {
			$(max_element).val("");
		}
	} else if($(element).hasClass("max")){
		if(isNaN(max)) {
			$(max_element).val("");
		} else if ((!isNaN(min)) && max < min) {
			$(min_element).val("");
		}
	} else if($(element).hasClass("error")){
		if(isNaN(error) || error < 0 || error > 100){
			$(error_element).val("");
		}
	}
}
function ar_set_tabindexes() {
	// Sets the tab index to the elements. Tab flow top to bottom instead of left
	// to right.
	// Keyboard tab flow top to bottom instead of left to right
	var index = 10;
	var count = $("input[id='col_count']").val();
	for (var i=0; i<count; i++) {
		var elements = $("td[column="+i+"]").find("input[type!=hidden]").not("[disabled]");
		for (var j=0; j<elements.length; j++) {
			$(elements[j]).attr("tabindex",index);
			index++;
		}
	}
}

// Configure the widgets that archetypes built:
// set id and name to ar-col-fieldName fornats
// un-set the readonly attribute on the fields (so that we can search).
function ar_rename_elements(){
	var i, e, elements, column;
	elements = $("td[ar_add_column_widget]").find("input[type!='hidden']").not("[disabled]");
	for (i = elements.length - 1; i >= 0; i--) {
		e = elements[i];
		column = $($(e).parents("td")).attr("column");
		// not :ignore_empty, widgets each get submitted to their own form handlers
		$(e).attr("name", "ar."+column+"."+$(e).attr("name")+":record");
		$(e).attr("id", "ar_"+column+"_"+e.id);
		$(e).removeAttr("required");
	}
	elements = $("td[ar_add_column_widget]").find("input[type='hidden']");
	for (i = elements.length - 1; i >= 0; i--) {
		e = elements[i];
		column = $($(e).parents("td")).attr("column");
		$(e).attr("id", "ar_"+column+"_"+e.id);
		// not :ignore_empty, widgets each get submitted to their own form handlers
		$(e).attr("name", "ar."+column+"."+$(e).attr("name")+":record");
	}
}

// The columnar referencewidgets that we reconfigure use this as their
// select handler.
function ar_referencewidget_select_handler(event, ui){
	/*jshint validthis:true */
	event.preventDefault();

	// Set form values in activated element (must exist in colModel!)
	var column = $(this).attr("id").split("_")[1];
	var fieldName = $(this).attr("name").split(".")[2].split(":")[0];
	$(this).val(ui.item[$(this).attr("ui_item")]);
	$(this).attr("uid", ui.item.UID);

	// split out the :ignore_empty:etc
	var bits = fieldName.split(":");
	$("input[name*='ar\\."+column+"\\."+bits[0]+"_uid']").val(ui.item.UID);

	if(fieldName == "SampleType"){
		// selecting a Sampletype - jiggle the SamplePoint element.
		var sp_element = $("#ar_"+column+"_SamplePoint");
		sp_element
			.removeClass( "cg-autocomplete-input" )
			.removeAttr( "autocomplete" )
			.removeAttr( "role" )
			.removeAttr( "aria-autocomplete" )
			.removeAttr( "aria-haspopup" );
		var new_sp_element = $(sp_element[0]).clone();
		var sp_parent_node = $(sp_element).parent();
		$(sp_element).remove();
		$(sp_parent_node).append(new_sp_element);
		sp_element = $("#ar_"+column+"_SamplePoint");
		// cut kwargs into the base_query
		var sp_base_query = $(sp_element).attr("base_query");
		sp_base_query = $.parseJSON(sp_base_query);
		sp_base_query = $.toJSON(sp_base_query);
		var sp_search_query = {"getSampleTypeTitle": ui.item[$(this).attr("ui_item")]};
		sp_search_query = $.toJSON(sp_search_query);
		sp_element.attr("search_query", sp_search_query);
		ar_referencewidget_lookups(sp_element);
	}
	if(fieldName == "SamplePoint"){
		// selecting a Samplepoint - jiggle the SampleType element.
		var st_element = $("#ar_"+column+"_SampleType");
		st_element
			.removeClass( "cg-autocomplete-input" )
			.removeAttr( "autocomplete" )
			.removeAttr( "role" )
			.removeAttr( "aria-autocomplete" )
			.removeAttr( "aria-haspopup" );
		var new_st_element = $(st_element[0]).clone();
		var st_parent_node = $(st_element).parent();
		$(st_element).remove();
		$(st_parent_node).append(new_st_element);
		st_element = $("#ar_"+column+"_SampleType");
		// cut kwargs into the base_query
		var st_base_query = $(st_element).attr("base_query");
		st_base_query = $.parseJSON(st_base_query);
		st_base_query = $.toJSON(st_base_query);
		var st_search_query = {"getSamplePointTitle": ui.item[$(this).attr("ui_item")]};
		st_search_query = $.toJSON(st_search_query);
		st_element.attr("search_query", st_search_query);
		ar_referencewidget_lookups(st_element);
	}

	// Selected a Profile
	if(fieldName == "Profile"){
		unsetTemplate(column);
		setAnalysisProfile(column, $(this).val());
		calculate_parts(column);
	}

	// Selected a Template
	if(fieldName == "Template"){
		setTemplate(column, $(this).val());
	}

	// Selected a sample to create a secondary AR.
	if(fieldName == "Sample"){
		// var e = $("input[name^='ar\\."+column+"\\."+fieldName+"']");
		// var Sample = $("input[name^='ar\\."+column+"\\."+fieldName+"']").val();
		// var Sample_uid = $("input[name^='ar\\."+column+"\\."+fieldName+"_uid']").val();
		// Install the handler which will undo the changes I am about to make
		$(this).blur(function(){
			if($(this).val() === ""){
				// clear and un-disable everything
				var disabled_elements = $("[ar_add_column_widget] [id*='ar_"+column+"']:disabled");
				$.each(disabled_elements, function(x,disabled_element){
					$(disabled_element).prop("disabled", false);
					if($(disabled_element).attr("type") == "checkbox"){
						$(disabled_element).prop("checked", false);
					} else {
						$(disabled_element).val("");
					}
				});
			}
		});
		// Then populate and disable sample fields
		$.getJSON(window.location.href.replace("/ar_add","") + "/secondary_ar_sample_info",
			{
				"Sample_uid": $(this).attr("uid"),
				"_authenticator": $("input[name='_authenticator']").val()},
			function(data){
				for (var x = data.length - 1; x >= 0; x--) {
					var fieldname = data[x][0];
					var fieldvalue = data[x][1];
					var uid_element = $("#ar_"+column+"_"+fieldname+"_uid");
					$(uid_element).val("");
					var sample_element = $("#ar_"+column+"_"+fieldname);
					$(sample_element).val("").prop("disabled", true);
					if($(sample_element).attr("type") == "checkbox" && fieldvalue){
						$(sample_element).prop("checked", true);
					} else {
						$(sample_element).val(fieldvalue);
					}
				}
			}
		);
	}

	// Selected a SampleType
	if(fieldName == "SampleType"){
		unsetTemplate(column);
		calculate_parts(column);
	}

	// Selected a Specification
	if(fieldName == "Specification"){
		reset_spec_field_values(column);
	}

	// Triggers 'selected' event (as reference widget)
	$(this).trigger("selected", ui.item.UID);
}

// we do the referencewidget_lookups differently to the widget default.
// We also include a bunch of ar_add specific on-change stuff, since the
// popup widget takes over the .change event completely.
function ar_referencewidget_lookups(elements){
	// var _ = window.jarn.i18n.MessageFactory("bika");
	// var PMF = window.jarn.i18n.MessageFactory("plone");
	var inputs;
	if(elements === undefined){
		inputs = $("input.referencewidget").not(".has_combogrid_widget");
	} else {
		inputs = elements;
	}
	for (var i = inputs.length - 1; i >= 0; i--) {
		var element = inputs[i];
		var options = $.parseJSON($(element).attr("combogrid_options"));
		if(options === "" || options === undefined){
			continue;
		}
		options.select = ar_referencewidget_select_handler;

		if(window.location.href.search("ar_add") > -1){
			options.url = window.location.href.split("/ar_add")[0] + "/" + options.url;
		}
		options.url = options.url + "?_authenticator=" + $("input[name='_authenticator']").val();
		options.url = options.url + "&catalog_name=" + $(element).attr("catalog_name");
		options.url = options.url + "&base_query=" + $(element).attr("base_query");
		options.url = options.url + "&search_query=" + $(element).attr("search_query");
        options.url = options.url + "&colModel=" + $.toJSON( $.parseJSON($(element).attr("combogrid_options")).colModel);
        options.url = options.url + "&search_fields=" + $.toJSON($.parseJSON($(element).attr("combogrid_options")).search_fields);
        options.url = options.url + "&discard_empty=" + $.toJSON($.parseJSON($(element).attr("combogrid_options")).discard_empty);
		$(element).combogrid(options);
		$(element).addClass("has_combogrid_widget");
		$(element).attr("search_query", "{}");
	}
}

function recalc_prices(column){
	if(column){
		// recalculate just this column
		var subtotal = 0.00;
		var discount_amount = 0.00;
		var vat = 0.00;
		var total = 0.00;
		var discount = parseFloat($("#member_discount").val());
		$.each($("input[name='ar."+column+".Analyses:list:ignore_empty:record']"), function(){
			var disabled = $(this).prop("disabled");
			// For some browsers, `attr` is undefined; for others, its false.  Check for both.
			if (typeof disabled !== "undefined" && disabled !== false) {
				disabled = true;
			} else {
				disabled = false;
			}
			if(!(disabled) && $(this).prop("checked")){
				var serviceUID = this.id;
				var form_price = parseFloat($("#"+serviceUID+"_price").val());
				var vat_amount = parseFloat($("#"+serviceUID+"_price").attr("vat_amount"));
				var price;
				if(discount){
					price = form_price - ((form_price / 100) * discount);
				} else {
					price = form_price;
				}
				subtotal += price;
				discount_amount += ((form_price / 100) * discount);
				vat += ((price / 100) * vat_amount);
				total += price + ((price / 100) * vat_amount);
			}
		});
		$("#ar_"+column+"_subtotal").val(subtotal.toFixed(2));
		$("#ar_"+column+"_subtotal_display").val(subtotal.toFixed(2));
		$("#ar_"+column+"_discount").val(discount_amount.toFixed(2));
		$("#ar_"+column+"_vat").val(vat.toFixed(2));
		$("#ar_"+column+"_vat_display").val(vat.toFixed(2));
		$("#ar_"+column+"_total").val(total.toFixed(2));
		$("#ar_"+column+"_total_display").val(total.toFixed(2));
	} else {
		// recalculate the entire form
		for (var col=0; col<parseInt($("#col_count").val(), 10); col++) {
			recalc_prices(String(col));
		}
	}
}

function changeReportDryMatter(){
	/*jshint validthis:true */
	var dm = $("#getDryMatterService");
	var uid = $(dm).val();
	var cat = $(dm).attr("cat");
	var poc = $(dm).attr("poc");
	var column = $(this).parents("td").attr("column");
	if ($(this).prop("checked")){
		// only play with service checkboxes when enabling dry matter
		unsetAnalysisProfile(column);
		$.ajaxSetup({async:false});
		toggleCat(poc, cat, column, [uid], true);
		$.ajaxSetup({async:true});
		var dryservice_cb = $("input[column='"+column+"']:checkbox").filter("#"+uid);
		$(dryservice_cb).prop("checked",true);
		calcdependencies([$(dryservice_cb)], true);
		calculate_parts(column);
	}
	recalc_prices();
}

function copy_service(copybutton){
	var first_val = $("input[column='0']").filter("#"+copybutton.id).prop("checked");
  var col_count = parseInt($("#col_count").val(), 10);
	var affected_elements = [];
	// 0 is the first column; we only want to change cols 1 onward.
	for (var col=1; col<col_count; col++) {
		unsetTemplate(col);
		unsetAnalysisProfile(col);
		var other_elem = $("input[column='"+col+"']").filter("#"+copybutton.id);
		if ( (!other_elem.prop("disabled")) && (other_elem.prop("checked") != first_val)) {
			other_elem.prop("checked", first_val?true:false);
			toggle_spec_fields(other_elem);
			affected_elements.push(other_elem);
		}
		calculate_parts(col);
	}
	calcdependencies(affected_elements, true);
	recalc_prices();
}

function copy_checkbox(copybutton){
	var fieldName = $(copybutton).attr("name");
	var first_val = $("input[name^='ar\\.0\\."+fieldName+"']").prop("checked");
  var col_count = parseInt($("#col_count").val(), 10);
	// col starts at 1 here; we don't copy into the the first row
	for (var col=1; col<col_count; col++) {
		var other_elem = $("#ar_" + col + "_" + fieldName);
		if ((other_elem.prop("checked")!=first_val)) {
			other_elem.prop("checked",first_val?true:false);
			other_elem.trigger("change");
		}
	}
	$("[id*='_" + fieldName + "']").change();
}

function copyButton(){
	/*jshint validthis:true */
	var fieldName = $(this).attr("name");
  var col_count = parseInt($("#col_count").val(), 10);

	if ($(this).parent().attr("class") == "service"){
		copy_service(this);
	}

	else if ($("input[name^='ar\\.0\\."+fieldName+"']").attr("type") == "checkbox") {
		copy_checkbox(this);
	}

	// Anything else

	else{
		var first_val = $("input[name^='ar\\.0\\."+fieldName+"']").filter("[type=text]").val();
		// Reference fields have a hidden *_uid field
		var first_uid = $("input[name^='ar\\.0\\."+fieldName+"_uid']").val();
		// col starts at 1 here; we don't copy into the the first row
		for (var col=1; col<col_count; col++) {
			var other_uid_elem = $("#ar_" + col + "_" + fieldName + "_uid");
			if (first_uid !== undefined && first_uid !== null){
				other_uid_elem.val(first_uid);
			}
			var other_elem = $("#ar_" + col + "_" + fieldName);
			if (!(other_elem.prop("disabled"))) {
				$(other_elem).attr("skip_referencewidget_lookup", true);
				other_elem.val(first_val);
				other_elem.trigger("change");

				if(fieldName == "Profile"){
					unsetTemplate(col);
					setAnalysisProfile(col, first_val);
					calculate_parts(col);
				}

				if(fieldName == "Template"){
					setTemplate(col, first_val);
				}

				if(fieldName == "SampleType"){
					unsetTemplate(col);
					calculate_parts(col);
				}

				if(fieldName == "Specification"){
					reset_spec_field_values(col);
				}

			}
		}
		//$('[id*=_' + fieldName + "]").change();
	}
}

function toggleCat(poc, category_uid, column, selectedservices, force_expand, disable) {
	// selectedservices and column are optional.
	// disable is used for field analyses - secondary ARs should not be able
	// to select these
	force_expand = force_expand || false;
	disable = disable || -1;
	if(!column && column !== 0) { column = ""; }

	var th = $("th[poc='"+poc+"']").filter("[cat='"+category_uid+"']");
	var tbody = $("#"+poc+"_"+category_uid);

	if($(tbody).hasClass("expanded")){
		// displaying an already expanded category
		$(tbody).toggle(true);
		if(selectedservices){
			var rows = tbody.children();
			for(var i = 0; i < rows.length; i++){
				var service = rows[i];
				var service_uid = $(service).attr("id");
				if(selectedservices.indexOf(service_uid) > -1){
					var cb = $("input#"+service_uid).filter("[column='"+column+"']");
					$(cb).prop("checked",true);
					toggle_spec_fields(cb);
				}
			}
			recalc_prices(column);
		} else {
			if (force_expand){ $(tbody).toggle(true); }
			else { $(tbody).toggle(); }
		}
	} else {
		if(!selectedservices) selectedservices = [];
		$(tbody).removeClass("collapsed").addClass("expanded");
		$(th).removeClass("collapsed").addClass("expanded");
		var options = {
			"selectedservices": selectedservices.join(","),
			"categoryUID": category_uid,
			"column": column,
			"disable": disable > -1 ? column : -1,
			"col_count": $("#col_count").attr("value"),
			"poc": poc
		};
		// possibly remove the fake ar context
		var url = window.location.href.split("/ar_add")[0] + "/analysisrequest_analysisservices";
		$(tbody).load(url, options, function(){
			// analysis service checkboxes
			$("input[name*='Analyses']").unbind();
			$("input[name*='Analyses']").bind("change", service_checkbox_change);
			if(selectedservices!=[]){
				recalc_prices(column);
				for(i=0;i<selectedservices.length;i++){
					var service_uid = selectedservices[i];
					var e = $("input[column='"+column+"']").filter("#"+service_uid);
					toggle_spec_fields(e);
				}
			}
		});
	}
}

function calc_parts_handler(column, data){
	// Set new part numbers in hidden form field
	var formparts = $.parseJSON($("#parts").val());
	var parts = data.parts;
	formparts[column] = parts;
	$("#parts").val($.toJSON(formparts));
	// write new part numbers next to checkboxes
	for(var p in parts) { if(!parts.hasOwnProperty(p)){ continue; }
		for (var s in parts[p].services) {
			if (!parts[p].services.hasOwnProperty(s)) { continue; }
			$(".partnr_"+parts[p].services[s]).filter("[column='"+column+"']").empty().append(p+1);
		}
	}
}

function calculate_parts(column) {
	// Template columns are not calculated
	if ($("#ar_"+column+"_Template").val() !== ""){
		return;
	}
	var st_uid = $("#ar_"+column+"_SampleType_uid").val();
	var checked = $("[name^='ar\\."+column+"\\.Analyses']").filter(":checked");
	var service_uids = [];
	for(var i=0;i<checked.length;i++){
		var uid = $(checked[i]).attr("value");
		service_uids.push(uid);
	}
	// if no sampletype or no selected analyses:  remove partition markers
	if (st_uid === "" || service_uids.length === 0) {
		$("[class*='partnr_']").filter("[column='"+column+"']").empty();
		return;
	}
	var request_data = {
			services: service_uids.join(","),
			sampletype: st_uid,
			_authenticator: $("input[name='_authenticator']").val()
	};
	window.jsonapi_cache = window.jsonapi_cache || {};
	var cacheKey = $.param(request_data);
	if (typeof window.jsonapi_cache[cacheKey] === "undefined") {
		$.ajax({
			type: "POST",
			dataType: "json",
			url: window.portal_url + "/@@API/calculate_partitions",
			data: request_data,
			success: function(data) {
				window.jsonapi_cache[cacheKey] = data;
				calc_parts_handler(column, data);
			}
		});
	} else {
		var data = window.jsonapi_cache[cacheKey];
		calc_parts_handler(column, data);
	}
}

function add_Yes(dlg, dep_args, element, remaining_columns){
	/*jshint validthis:true */
	var column = $(element).attr("column");
	$.each(dep_args, function(i,args){
		var tbody = $("#"+args[0]+"_"+args[1]);
		if ($(tbody).hasClass("expanded")) {
			// if cat is already expanded, we toggle(true) it and manually select service checkboxes
			$(tbody).toggle(true);
			$.each(args[3], function(x,serviceUID){
				var e = $("input[column='"+args[2]+"']").filter("#"+serviceUID);
				$(e).prop("checked",true);
				toggle_spec_fields(e);
				// if elements from more than one column were passed, set all columns to be the same.
				for(var col in remaining_columns){
					var cb_el = $("input[column='"+remaining_columns[col]+"']").filter("#"+serviceUID);
					$(cb_el).prop("checked",true);
					toggle_spec_fields(cb_el);
				}
			});
		} else {
			// otherwise, toggleCat will take care of everything for us
			$.ajaxSetup({async:false});
			toggleCat(args[0], args[1], args[2], args[3]);
			$.ajaxSetup({async:true});
		}
	});
	recalc_prices();
	calculate_parts(column);
	for(var col in remaining_columns){
		calculate_parts(col);
	}
	$(dlg).dialog("close");
	$("#messagebox").remove();
}

function add_No(dlg, element, remaining_columns){
	/*jshint validthis:true */
	var column = $(element).attr("column");
	var serviceUID = $(element).attr("id");
	$(element).prop("checked",false);
	recalc_prices();
	for(var col in remaining_columns){
		var e = $("input[column='"+remaining_columns[col]+"']").filter("#"+serviceUID);
		$(e).prop("checked",false);
		toggle_spec_fields(e);
	}
	recalc_prices(column);
	calculate_parts(column);
	for(col in remaining_columns){
		calculate_parts(column);
	}
	$(dlg).dialog("close");
	$("#messagebox").remove();
}

function calcdependencies(elements, auto_yes) {
	/*jshint validthis:true */
	auto_yes = auto_yes || false;
	var _ = window.jarn.i18n.MessageFactory("bika");
	// elements is a list of jquery checkbox objects
	// it's got one element in it when a single checkbox was changed,
	// and one from each column when a copy button was clicked.
	var element = elements.shift();
	var column = $(element).attr("column");
	column = column || 0;
	var remaining_columns = [];
	var x, _col;
	for(x = 0; x<elements.length; x++){
		_col = $(elements[x]).attr("column");
		if(!(_col in remaining_columns)){
			remaining_columns.push($(elements[x]).attr("column"));
		}
	}

	var service_uid = $(element).attr("id");
	var service_data = window.bika_utils.data.services[service_uid];
	if (!service_data){
		// if service_uid is not in bika_utils.data.services, there are no deps.
		return;
	}
	var deps = service_data.deps;
	// actions are discovered and stored in dep_args, until confirmation dialog->Yes.
	var dep_args = [];
	var backrefs = service_data.backrefs;

	var affected_services = [];
	var affected_titles = [];
	if ($(element).prop("checked")){
		// selecting a service; discover services it depends on.
		var pocdata = [];
		if (deps) {
			pocdata = deps;
		} else {
			pocdata = [];
		}
		var cat;
		for(var pocid_poctitle in pocdata) {
			if (!pocdata.hasOwnProperty(pocid_poctitle)) { continue; }
			var catdata = pocdata[pocid_poctitle];
			var poc = pocid_poctitle.split("_");
			var services = [];
			for (var catid_cattitle in catdata){
				if (!catdata.hasOwnProperty(catid_cattitle)) { continue; }
				var servicedata = catdata[catid_cattitle];
				cat = catid_cattitle.split("_");
				for (x = 0; x < servicedata.length; x++) {
					if (!servicedata.hasOwnProperty(x)) { continue; }
					var serviceuid_servicetitle = servicedata[x];
					var service = serviceuid_servicetitle.split("_");
					// if the service is already checked, skip it.
					if (! $("input[column='"+column+"']").filter("#"+service[0]).prop("checked") ){
						// this one is for the current category
						services.push(service[0]);
						// and this one decides if the confirmation box gets shown at all.
						affected_services.push(service[0]);
						// this one is for the pretty message box.
						affected_titles.push(service[1] + " ("+cat[1]+")");
					}
				}
				// we want to confirm, then process these all at once
				if(services.length > 0){
					dep_args.push([poc[0], cat[0], column, services]);
				}
			}
		}
		if (affected_services.length > 0) {
			$("body").append(
				"<div id='messagebox' style='display:none' title='" + _("Service dependencies") + "'>"+
				_("<p>${service} requires the following services to be selected:</p><br/><p>${deps}</p><br/><p>Do you want to apply these selections now?</p>",
					{service:$(element).attr("title"),
					deps: affected_titles.join("<br/>")})+"</div>");
			if (auto_yes) {
				$("#messagebox").remove();
				add_Yes(this, dep_args, element, remaining_columns);
			} else {
				$("#messagebox").dialog({width:450, resizable:false, closeOnEscape: false, buttons:{
							yes: function(){
								add_Yes(this, dep_args, element, remaining_columns);
							},
							no: function(){
								add_No(this, element, remaining_columns);
							}
							}});
			}
		}
	} else {
		// unselecting a service; discover back dependencies
		var s_uids = backrefs ? backrefs : [];
		var serviceUID;
		var cb;
		if (s_uids.length > 0){
			for (x in s_uids){
				if (!s_uids.hasOwnProperty(x)) { continue; }
				serviceUID = s_uids[x];
				cb = $("input[column='"+column+"']").filter("#"+serviceUID);
				if (cb.prop("checked")){
					affected_services.push(serviceUID);
					affected_titles.push(cb.attr("title"));
				}
			}
			$("body").append(
				"<div id='messagebox' style='display:none' title='" + _("Service dependencies") + "'>"+
				_("<p>The following services depend on ${service}, and will be unselected if you continue:</p><br/><p>${deps}</p><br/><p>Do you want to remove these selections now?</p>",
					{service:$(element).attr("title"),
					deps: affected_titles.join("<br/>")})+"</div>");
			if (affected_services.length > 0) {
				// var yes = _("Yes");
				// var no = _("No");
				$("#messagebox").dialog({
					width:450,
					resizable:false,
					closeOnEscape: false,
					buttons:{
					Yes: function(){
						for(var x in affected_services) {
							if (!affected_services.hasOwnProperty(x)){ continue; }
							serviceUID = affected_services[x];
							cb = $("input[column='"+column+"']").filter("#"+serviceUID);
							$(cb).prop("checked", false);
							toggle_spec_fields($(cb));
							$(".partnr_"+serviceUID).filter("[column='"+column+"']")
								.empty();
							if ($(cb).val() == $("#getDryMatterService").val()) {
								$("#ar_"+column+"_ReportDryMatter").prop("checked",false);
							}
							// if elements from more than one column were passed, set all columns to be the same.
							for(var col in remaining_columns){
								if (!remaining_columns.hasOwnProperty(col)){ continue ;}
								cb = $("input[column='"+remaining_columns[col]+"']")
									.filter("#"+serviceUID);
								$(cb).prop("checked",false);
								toggle_spec_fields($(cb));
								$(".partnr_"+serviceUID).filter("[column='"+col+"']")
									.empty();
								if ($(cb).val() == $("#getDryMatterService").val()) {
									$("#ar_"+col+"_ReportDryMatter").prop("checked",false);
								}
							}
						}
						recalc_prices();
						calculate_parts(column);
						for(col in remaining_columns){
							calculate_parts(column);
						}
						$(this).dialog("close");
						$("#messagebox").remove();
					},
					No:function(){
						$(element).prop("checked",true);
						toggle_spec_fields($(element));
						for(var col in remaining_columns){
							var cb = $("input[column='"+remaining_columns[col]+"']").filter("#"+serviceUID);
							$(cb).prop("checked",true);
							toggle_spec_fields($(cb));
						}
						recalc_prices(column);
						$(this).dialog("close");
						calculate_parts(column);
						for(col in remaining_columns){
							calculate_parts(column);
						}
						$("#messagebox").remove();
					}
				}});
			} else {
				$("#messagebox").remove();
			}
		}
	}
}

function unsetAnalyses(column){
	$.each($("input[name^='ar."+column+".Analyses']"), function(){
		if($(this).prop("checked")) {
			$(this).prop("checked",false);
			toggle_spec_fields($(this));
		}
		$(".partnr_"+this.id).filter("[column='"+column+"']").empty();
	});
}
// function uncheck_partnrs(column){
// 	// all unchecked services have their part numbers removed
// 	var ep = $("[class^='partnr_']").filter("[column='"+column+"']").not(":empty");
// 	for(var i=0;i<ep.length;i++){
// 		var em = ep[i];
// 		var uid = $(ep[0]).attr("class").split("_")[1];
// 		var cb = $("#"+uid);
// 		if ( ! $(cb).prop("checked") ){
// 			$(em).empty();
// 		}
// 	}
// }

function unsetAnalysisProfile(column){
	if($("#ar_"+column+"_Profile").val() !== ""){
		$("#ar_"+column+"_Profile").val("");
	}
}


function unsetTemplate(column){
	if($("#ar_"+column+"_Template").val() !== ""){
		$("#ar_"+column+"_Template").val("");
	}
}


function setTemplate(column, template_title){
	unsetAnalyses(column);
	var request_data = {
		portal_type: "ARTemplate",
		title: template_title,
		include_fields: [
			"SampleType",
			"SampleTypeUID",
			"SamplePoint",
			"SamplePointUID",
			"ReportDryMatter",
			"AnalysisProfile",
			"Partitions",
			"Analyses"]
	};
	window.jsonapi_read(request_data, function(data){
		var template = data.objects[0];
		var request_data, x, i;
		// set our template fields
		$("#ar_"+column+"_SampleType").val(template.SampleType);
		$("#ar_"+column+"_SampleType_uid").val(template.SampleTypeUID);
		$("#ar_"+column+"_SamplePoint").val(template.SamplePoint);
		$("#ar_"+column+"_SamplePoint_uid").val(template.SamplePointUID);
		$("#ar_"+column+"_reportdrymatter").prop("checked", template.reportdrymatter);
		// lookup AnalysisProfile
		if(template.AnalysisProfile) {
			request_data = {
				portal_type: "AnalysisProfile",
				title: template.AnalysisProfile,
				include_fields: ["UID"]
			};
			window.jsonapi_read(request_data, function(data){
				$("#ar_"+column+"_Profile").val(template.AnalysisProfile);
				$("#ar_"+column+"_Profile_uid").val(data.objects[0].UID);
			});
		} else {
				$("#ar_"+column+"_Profile").val("");
				$("#ar_"+column+"_Profile_uid").val("");
		}

		// scurrel the parts into hashes for easier lookup
		var parts_by_part_id = {};
		var parts_by_service_uid = {};
		for (x in template.Partitions) {
			if (!template.Partitions.hasOwnProperty(x)){ continue; }
			var P = template.Partitions[x];
			P.part_nr = parseInt(P.part_id.split("-")[1], 10);
			P.services = [];
			parts_by_part_id[P.part_id] = P;
		}
		for (x in template.Analyses) {
			if(!template.Analyses.hasOwnProperty(x)){ continue; }
			i = template.Analyses[x];
			parts_by_part_id[i.partition].services.push(i.service_uid);
			parts_by_service_uid[i.service_uid] = parts_by_part_id[i.partition];
		}
		// this one goes through with the form submit
		var parts = [];
		for(x in parts_by_part_id){
			if(!parts_by_part_id.hasOwnProperty(x)){ continue; }
			parts.push(parts_by_part_id[x]);
		}
		var formparts = $.parseJSON($("#parts").val());
		formparts[column] = parts;
		$("#parts").val($.toJSON(formparts));

		// lookup the services specified in the template
		request_data = {
			portal_type: "AnalysisService",
			UID: [],
			include_fields: ["PointOfCapture", "CategoryUID", "UID"]
		};
		for (x in template.Analyses) {
			if (!template.Analyses.hasOwnProperty(x)){ continue; }
			request_data.UID.push(template.Analyses[x].service_uid);
		}
		// save services in hash for easier lookup this
		window.jsonapi_read(request_data, function(data) {
			var e;
			var poc_cat_services = {};
			for(var x in data.objects) {
				if(!data.objects.hasOwnProperty(x)){ continue; }
				var service = data.objects[x];
				var poc_title = service.PointOfCapture;
				if (!(poc_title in poc_cat_services)) {
					poc_cat_services[poc_title] = {};
				}
				if (!(service.CategoryUID in poc_cat_services[poc_title])) {
					poc_cat_services[poc_title][service.CategoryUID] = [];
				}
				poc_cat_services[poc_title][service.CategoryUID].push(service.UID);
			}
			// expand categories, select, and enable controls for template services
			for (var p in poc_cat_services) {
				if (!poc_cat_services.hasOwnProperty(p)){ continue; }
				var poc = poc_cat_services[p];
				for (var cat_uid in poc) {
					if (!poc.hasOwnProperty(cat_uid)) {continue; }
					var service_uids = poc[cat_uid];
					var tbody = $("tbody[id='"+p+"_"+cat_uid+"']");
					var service_uid;
					// expand category
					if(!($(tbody).hasClass("expanded"))) {
						$.ajaxSetup({async:false});
						toggleCat(p, cat_uid, 0);
						$.ajaxSetup({async:true});
					}
					$(tbody).toggle(true);
					// select checkboxes
					for(i=0;i<service_uids.length;i++){
						service_uid = service_uids[i];
						e = $("input[column='"+column+"']").filter("#"+service_uid);
						$(e).prop("checked", true);
						toggle_spec_fields(e);
					}
					// set part number indicators
					for(i=0;i<service_uids.length;i++){
						service_uid = service_uids[i];
						var partnr = parts_by_service_uid[service_uid].part_nr;
						e = $(".partnr_"+service_uid).filter("[column='"+column+"']");
						$(e).empty().append(partnr);
					}
				}
			}
		});
	});

	recalc_prices(column);

}

function setAnalysisProfile(column, profile_title){
	var request_data = {
		portal_type: "AnalysisProfile",
		title: profile_title
	};
	window.jsonapi_read(request_data, function(data){
		var profile_objects = data.objects;
		var request_data = {
			portal_type: "AnalysisService",
			title: profile_objects[0].Service,
			include_fields: ["PointOfCapture", "Category", "UID", "title"]
		};
		window.jsonapi_read(request_data, function(data){
			var i;
			unsetAnalyses(column);
			$("#ar_"+column+"_ReportDryMatter").prop("checked",false);

			var service_objects = data.objects;
			if (service_objects.length === 0) return;
			var categorised_services = {};
			for (i in service_objects){
				var key = service_objects[i].PointOfCapture + "_" +
					service_objects[i].Category;
				if(categorised_services[key] === undefined)
					categorised_services[key] = [];
				categorised_services[key].push(service_objects[i].UID);
			}

			for (var poc_cat in categorised_services) {
				var service_uids = categorised_services[poc_cat];
				var th = $("th#cat_"+poc_cat);
				if($(th).hasClass("expanded")){
					for (i in service_uids){
						var service_uid = service_uids[i];
						var e = $("input[column='"+column+"']").filter("#"+service_uid);
						$(e).prop("checked", true);
						toggle_spec_fields($(e));
					}
					recalc_prices(column);
				} else {
					var poc = poc_cat.split("_")[0];
					var cat_uid = $(th).attr("cat");
					$.ajaxSetup({async:false});
					toggleCat(poc, cat_uid, column, service_uids);
					$.ajaxSetup({async:true});
				}
				$(th).removeClass("collapsed").addClass("expanded");
			}
			calculate_parts(column);
		});
	});
}

function service_checkbox_change(){
	/*jshint validthis:true */
	var column = $(this).attr("column");
	var element = $(this);
	unsetAnalysisProfile(column);
	unsetTemplate(column);

	// Unselecting Dry Matter Service unsets 'Report Dry Matter'
	if ($(this).val() == $("#getDryMatterService").val() && !$(this).prop("checked")) {
		$("#ar_"+column+"_ReportDryMatter").prop("checked",false);
	}

	// unselecting service: remove part number.
	if (!$(this).prop("checked")){
		$(".partnr_"+this.id).filter("[column='"+column+"']").empty();
	}

	calcdependencies([element]);
	recalc_prices();
	calculate_parts(column);
	toggle_spec_fields(element);

}

function clickAnalysisCategory(){
	/*jshint validthis:true */
	// cat is a category uid, and no column is required here.
	toggleCat($(this).attr("poc"), $(this).attr("cat"));
	if($(this).hasClass("expanded")){
		$(this).addClass("collapsed");
		$(this).removeClass("expanded");
	} else {
		$(this).removeClass("collapsed");
		$(this).addClass("expanded");
	}
}

function applyComboFilter(element, filterkey, filtervalue) {
    var base_query=$.parseJSON($(element).attr("base_query"));
    base_query[filterkey] = filtervalue;
    $(element).attr("base_query", $.toJSON(base_query));
    var options = $.parseJSON($(element).attr("combogrid_options"));
    options.url = window.location.href.split("/ar_add")[0] + "/" + options.url;
    options.url = options.url + "?_authenticator=" + $("input[name='_authenticator']").val();
    options.url = options.url + "&catalog_name=" + $(element).attr("catalog_name");
    options.url = options.url + "&base_query=" + $.toJSON(base_query);
    options.url = options.url + "&search_query=" + $(element).attr("search_query");
    options.url = options.url + "&colModel=" + $.toJSON( $.parseJSON($(element).attr("combogrid_options")).colModel);
    options.url = options.url + "&search_fields=" + $.toJSON($.parseJSON($(element).attr("combogrid_options")).search_fields);
    options.url = options.url + "&discard_empty=" + $.toJSON($.parseJSON($(element).attr("combogrid_options")).discard_empty);
    options.force_all="false";
    $(element).combogrid(options);
    $(element).addClass("has_combogrid_widget");
    $(element).attr("search_query", "{}");
}

$(document).ready(function() {

	// Only if the view is the Analysis Request Add View
	if ($(".template-ar_add #analysisrequest_edit_form").length > 0) {

	// var _ = window.jarn.i18n.MessageFactory("bika");
	// var PMF = window.jarn.i18n.MessageFactory("plone");

	// var curDate = new Date();
	// var y = curDate.getFullYear();
	// var limitString = "1900:" + y;
	// var dateFormat = _("date_format_short_datepicker");

	ar_rename_elements();
	ar_referencewidget_lookups();
	ar_set_tabindexes();

	$(".copyButton").live("click",  copyButton );

	$("th[class^='analysiscategory']").click(clickAnalysisCategory);

	$("input[name^='Price']").live("change", recalc_prices );

	$("input[id*='_ReportDryMatter']").change(changeReportDryMatter);

  $(".spec_bit").live("change", function() {
		validate_spec_field_entry(this);
  });

	// AR Add/Edit ajax form submits
	var ar_edit_form = $("#analysisrequest_edit_form");
	if (ar_edit_form.ajaxForm !== undefined){
		var options = {
			url: window.location.href.split("/portal_factory")[0] + "/analysisrequest_submit",
			dataType: "json",
			data: {"_authenticator": $("input[name='_authenticator']").val()},
			beforeSubmit: function() {
				$("input[class~='context']").prop("disabled",true);
			},
			success: function(responseText) {
				var destination;
				if(responseText.success !== undefined){
					if(responseText.labels !== undefined){
						destination = window.location.href
							.split("/portal_factory")[0];
						var ars = responseText.labels;
						var labelsize = responseText.labelsize;
						var q = "/sticker?size="+labelsize+"&items=";
						q = q + ars.join(",");
						window.location.replace(destination+q);
					} else {
						destination = window.location.href
							.split("/portal_factory")[0];
						window.location.replace(destination);
					}
				} else {
					var msg = "";
					for(var error in responseText.errors){
						var x = error.split(".");
						var e;
						if (x.length == 2){
							e = x[1] + ", Column " + (+x[0]) + ": ";
						} else {
							e = "";
						}
						msg = msg + e + responseText.errors[error] + "<br/>";
					}
					window.bika_utils.portalMessage(msg);
					window.scroll(0,0);
					$("input[class~='context']").prop("disabled", false);
				}
			},
			error: function(XMLHttpRequest, statusText) {
				window.bika_utils.portalMessage(statusText);
				window.scroll(0,0);
				$("input[class~='context']").prop("disabled", false);
			}
		};
		$("#analysisrequest_edit_form").ajaxForm(options);
	}

	// these go here so that popup windows can access them in our context
	window.recalc_prices = recalc_prices;
	window.calculate_parts = calculate_parts;
	window.toggleCat = toggleCat;

    	// Show only the contacts and CC from the selected Client
	var fromclient = window.location.href.search("/clients/") >= 0;
	if (fromclient) {
		for (var col=0; col<parseInt($("#col_count").val(), 10); col++) {
			var element = $("#ar_" + col + "_Contact");
			var clientuid = $("#ar_" + col + "_Client_uid").val();
			applyComboFilter(element, "getParentUID", clientuid);
    	        element = $("#ar_" + col + "_CCContact");
    	        applyComboFilter(element, "getParentUID", clientuid);
		}
	} else {
		$("[id$='_Client']").bind("change", function() {
			var col = this.id.split("_")[1];
			var element = $("#ar_" + col + "_Contact");
			var clientuid = $(this).attr("uid");
			applyComboFilter(element, "getParentUID", clientuid);
                element = $("#ar_" + col + "_CCContact");
                applyComboFilter(element, "getParentUID", clientuid);
		});
	}
}
});
}(jQuery));
