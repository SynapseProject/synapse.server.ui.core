var SYNAPSEUI = (function () {

    // private variables
    var $spanFilterType = $("#span-filter-type");
    var $txtFilter = $("#txt-filter");
    var $listboxPlanList = $("#listbox-plan-list");
    var $gridPlanHistory = $("#grid-plan-history");
    var $codeResultPlan = $("#code-result-plan");
    var $treelistDynamicParams = $("#treelist-dynamic-params");
    var $diagramPlanStatus = $("#diagram-plan-status");
    var $diagramResultPlan = $("#diagram-result-plan");
    var $txtRequestNumber = $("#txt-request-number");
    
    //var $treeviewExecutePlan = $("#treeview-execute-plan");
    var planVM = kendo.observable({
        selectedPlanName: "",
        selectedInstanceId: "",
        lastExecutedInstanceId: "",
        isExecute: true,
        tabstripSelected: "",
        isReset: function () { return !this.get("isExecute"); },
        planSelected: function () { return this.get("selectedPlanName") !== ""; },
        planExecuted: function () { return this.get("lastExecutedInstanceId") !== ""; }
    });
    planVM.bind("change", function (e) {
        console.log("planVM.change() is called.", e);
        switch (e.field) {
            case "selectedPlanName":
                this.set("isExecute", true);
                this.set("lastExecutedInstanceId", "");
                refreshPlanHistory();
                refreshPlanStatus();
                refreshDynamicParameters();

                break;

            case "selectedInstanceId":
                clearResultPlan();
                if (this.get("selectedInstanceId") === "") {
                    // sets the datasource for diagram to null
                }
                else {                   
                    var pn = this.get("selectedPlanName");
                    var pii = this.get("selectedInstanceId");
                    $.ajax({
                        async: true,
                        method: 'GET',
                        url: getActionUrl("GetPlanStatus","Home"),
                        data: { 'planUniqueName': pn, 'planInstanceId': pii },
                        dataType: 'json',
                    }).done(function (data, textStatus, xhr) {
                        var c = JSON.stringify(data, null, 4);
                        $codeResultPlan.html(c);
                        }).fail(function (xhr, textStatus, errorThrown) { $codeResultPlan.html("There was a problem reading the file"); });

                    // call the datasource that reads GetPlanStatusForDiagram
                }
                break;
            case "lastExecutedInstanceId":
                refreshPlanStatus();
                break;
            case "tabstripSelected":
                var whichStrip = this.get("tabstripSelected");
                if (whichStrip === "Status") refreshPlanStatus();
                else if (whichStrip === "History") refreshPlanHistory();
                break;
        }  // end switch
    });

    // private methods
    var bindUIActions = function () {
        $txtFilter.keyup(function (e) {
            console.log("txt-filter.keyup() is called.", e);
            $listboxPlanList.data("kendoListBox").dataSource.read();
        });
        $spanFilterType.click(function (e) {
            console.log("span-filter-type.click() is called.", e);
            $(this).toggleClass('regex-filter in-string-filter');
            $txtFilter.attr("placeholder", $(this).hasClass("regex-filter") ? "RegEx Filter" : "In-String Filter");
        });
    };
    var clearResultPlan = function () {
        $codeResultPlan.empty().closest("pre").scrollTop(0).scrollLeft(0);
    };
    var refreshPlanHistory = function () {
        if (planVM.get("selectedPlanName") === "") $gridPlanHistory.data("kendoGrid").dataSource.data([]);
        else $gridPlanHistory.getKendoGrid().dataSource.read();
    };
    var refreshPlanStatus = function () {
        if (planVM.get("selectedPlanName") === "") $diagramPlanStatus.data("kendoDiagram").dataSource.data([]);
        else $diagramPlanStatus.getKendoDiagram().dataSource.read();
    };
    var refreshDynamicParameters = function() {
        if (planVM.get("selectedPlanName") === "") $treelistDynamicParams.data("kendoTreeList").dataSource.data([]);
        else $treelistDynamicParams.data("kendoTreeList").dataSource.read();
    };
    var getActionUrl = function (action, controller) {
        return $("base").attr("href") + controller + "/" + action;
    };
    var createPlanStatusDiagram = function () {        
        $diagramPlanStatus.kendoDiagram({
            autoBind: false,
            editable: false,
            selectable: {
                multiple: false
            },
            //zoom: 0,  // this will disable zooming
            dataSource: {
                transport:
                {
                    read: {
                        url: getActionUrl("GetPlanStatusForDiagram", "Home"),
                        data: SYNAPSEUI.diagramPlanStatusData,
                        type: "Get"
                    },
                },
                schema: {
                    model: {
                        id: "Name",
                        fields: {
                            Status: { type: "string" },
                            StatusColor: { type: "string" }
                        },
                        children: "Actions"
                    }
                }
            },
            layout: {
                type: "Tree",
                subType: "Down",
                horizontalSeparation: 30,
                verticalSeparation: 30
            },
            shapeDefaults: {
                visual: SYNAPSEUI.diagramPlanStatusVisualTemplate,
                editable: {
                    drag: false
                }
            },
            connectionDefaults: {
                stroke: {
                    color: "#787878",
                    width: 1
                },
                editable: false,
                endCap: {
                    type: "ArrowEnd", fill: { color: "#979797" }
                }
            },
            dataBound: SYNAPSEUI.diagramPlanStatusDataBound
        });
        var diagram = $diagramPlanStatus.getKendoDiagram();
        diagram.bringIntoView(diagram.shapes);
    };
    var init = function () {
        createPlanStatusDiagram();       
        bindUIActions();
        kendo.bind(document.body, planVM);
    };
    // btn-refresh-plan-list
    var btnRefreshPlanListClick = function (e) {
        console.log("btnRefreshPlanListClick is running");
        $listboxPlanList.data("kendoListBox").dataSource.read();
    };
    // listbox-plan-list
    var listboxPlanListData = function () {
        return {
            filterString: $txtFilter.val(),
            isRegexFilter: $spanFilterType.hasClass("regex-filter")
        };
    };
    var listboxPlanListChange = function (e) {
        console.log("listboxPlanListChange is running");
        var pn = $(e.sender.wrapper).find(".k-item.k-state-selected").text();
        planVM.set("selectedPlanName", pn);
        //$("#span-planname").val(pn);
    };
    var listboxPlanListDataBound = function (e) {
        console.log("listboxPlanListDataBound is running");
        planVM.set("selectedPlanName", "");
    };
    // tabstrip
    var tabstripSelect = function (e) {
        console.log("tabstripSelect is running");
        planVM.set("tabstripSelected", $(e.item).find("> .k-link").text());
    };
    // grid-plan-history
    var gridPlanHistoryData = function () {
        console.log("gridPlanHistoryData is running");
        var pn = planVM.get("selectedPlanName");
        return {
            planUniqueName: pn
        };
    };
    var gridPlanHistoryDataBound = function (e) {
        console.log("gridPlanHistoryDataBound is running");
        // reset the scrollbars to topleft. Not sure why it doesnt do that by default
        var container = e.sender.wrapper.children(".k-grid-content"); // or ".k-virtual-scrollable-wrap"
        container.scrollLeft(0);
        container.scrollTop(0);
        // default to first record
        if ($gridPlanHistory.getKendoGrid().dataSource.data().length !== 0) {
            setTimeout(function () {
                $gridPlanHistory.getKendoGrid().select(e.sender.tbody.find("tr:first"));
            }, 50)
        }

        planVM.set("selectedInstanceId", "");
    };
    var gridPlanHistoryChange = function (e) {
        console.log("gridPlanHistoryChange is running");
        var selectedItem = e.sender.dataItem(this.select());
        planVM.set("selectedInstanceId", selectedItem.PlanInstanceId);
    };
    // btn-refresh-plan-history
    var btnRefreshPlanHistoryClick = function (e) {
        refreshPlanHistory();
    };
    // treelist-dynamic-params
    var treelistDynamicParamsData = function (e) {
        console.log("treelistDynamicParamsData is running");
        var pn = planVM.get("selectedPlanName");
        return {
            planUniqueName: pn
        };
    };
    // btn-execute-plan
    var btnExecutePlanClick = function (e) {
        console.log("btnExecutePlanClick is running");
        if (planVM.get("isExecute")) {
            var pn = planVM.get("selectedPlanName");
            //$(".js-dynamic-value").each(function () {
            //    // what to do if the dynamic value is blank?
            //    d[$(this).attr('name')] = $(this).val();
            //})
            
            //var $dynamicval = $(".js-dynamic-value");
            //var d = $.param({ 'planUniqueName': pn }) + ($dynamicval.length ? '&' + $(".js-dynamic-value").serialize() : '');           

            // work on the dynamic parameters
            // if there are duplicate parameter names, only the last one will be accepted
            var dyn = {};
            $.each($(".js-dynamic-value"), function (i, obj) {
                obj.value = obj.value.trim();
                var $passblank = $(this).closest('tr').find('.js-pass-blank');
                if (obj.value.length !== 0) {
                    dyn[obj.name] = obj.value;
                    $passblank.prop('checked', false);
                }
                else {
                    // check whether to include blank
                    if ($passblank.is(':checked')) dyn[obj.name] = obj.value;
                }
            });

            //$.each($(".js-dynamic-value").serializeArray(), function (i, obj) { dyn[obj.name] = obj.value })
            var d = {
                'PlanUniqueName': pn,
                'RequestNumber': $txtRequestNumber.val().trim().length === 0 ? null : $txtRequestNumber.val().trim(),
                'DynamicParameters': dyn
            };
            $.ajax({
                async: true,
                method: 'POST',
                url: getActionUrl("StartPlan", "Home"),
                contentType: 'application/json',
                data: JSON.stringify(d), /* d */
                dataType: 'text',
            }).done(function (data, textStatus, xhr) {
                var c = JSON.stringify(data, null, 4);
                planVM.set("lastExecutedInstanceId", data);
                planVM.set("isExecute", false);
                kendo.alert(data);
            }).fail(function (xhr, textStatus, errorThrown) { alert("There was a problem when trying to execute the plan"); });
        }

    };
    // btn-reset
    var btnResetClick = function (e) {
        planVM.set("isExecute", true);
    };
    // btn-cancel-plan
    var btnCancelPlanClick = function (e) {
        console.log("btnCancelPlanClick is running");
        $.ajax({
            async: true,
            method: 'POST',
            url: getActionUrl("CancelPlan", "Home"),
            data: { 'planUniqueName': planVM.get("selectedPlanName"), 'planInstanceId': planVM.get("lastExecutedInstanceId") },
            dataType: 'text',
        }).done(function (data, textStatus, xhr) {
            //var c = JSON.stringify(data, null, 4);
            //kendo.alert(data);
        }).fail(function (xhr, textStatus, errorThrown) { alert("There was a problem when trying to cancel the plan"); });
    };
    // diagram-plan-status
    var diagramPlanStatusData = function (e) {
        console.log("diagramPlanStatusData is running");
        var pn = planVM.get("selectedPlanName");
        var lastId = planVM.get("lastExecutedInstanceId");
        if (lastId === "") return { planUniqueName: pn };
        return {
            planUniqueName: pn
            , planInstanceId: planVM.get("lastExecutedInstanceId")   /*planVM.get("selectedInstanceId")*/
        };
    };
    var diagramPlanStatusVisualTemplate = function (options) {
        //console.log("diagramPlanStatusVisualTemplate is running");
        var dataviz = kendo.dataviz;
        var g = new dataviz.diagram.Group();
        var dataItem = options.dataItem;
        var strokeColor = dataItem.Status === "Complete" ? "#63c163" : dataItem.Status === "Failed" ? "#f7505a" : "#70bfe4";
        var strokeWidth = dataItem.IsActionGroup ? 2 : 1;
        g.append(new dataviz.diagram.Rectangle({
            width: 200,
            height: 75,
            stroke: {
                color: strokeColor, //dataItem.StatusColor,
                width: strokeWidth  //1
            },
            /*fill: dataItem.StatusColor*/ //statusColor  //"#1696d3"
        }));
        if (dataItem.IsActionGroup) {
            g.append(new dataviz.diagram.Rectangle({
                width: 7,
                height: 75,
                x: 0,
                y: 0,
                stroke: {width:0},
                fill: { color: strokeColor }
            }));
        }
        var layout = new dataviz.diagram.Layout(new dataviz.diagram.Rect(0, 0, 200, 75), {
            alignContent: "center",
            alignItems: "center",
            justifyContent: "center",
            orientation: "vertical"
        });

        g.append(layout);
        layout.append(new dataviz.diagram.TextBlock({
            text: dataItem.Name,
            fontSize: 12,
            fill: "#787878"
        }));
        layout.append(new dataviz.diagram.TextBlock({
            text: dataItem.Status,
            fontSize: 12,
            fill: "#787878"

        }));
        
        layout.reflow();

        return g;
    };
    var diagramPlanStatusDataBound = function (e) {
        var diagram = $diagramPlanStatus.getKendoDiagram();
        
        //diagram.bringIntoView(diagram.shapes);

        console.log("diagramPlanStatusDataBound is running");

        if (diagram.dataSource.data().length === 0) return;

        /* RENDER LINES CORRECTLY. Connect bottom of shape1 to top of shape2 */
        var numConnections = diagram.connections.length;
        for (var i = 0; i < numConnections; i++) {
            var shape1 = diagram.connections[i].from;
            var shape2 = diagram.connections[i].to;

            var posShape1 = shape1.getPosition("bottom");
            var posShape2 = shape2.getPosition("top");

            var point1 = {
                x: posShape1.x,
                y: posShape1.y //+ ((posShape2.y - posShape1.y) / 2)
            };

            var point2 = {
                x: posShape2.x,
                y: posShape2.y //point1.y
            };

            diagram.connections[i].source(shape1.connectors[1]);  // 0=top, 1=bottom, 2=left, 3=right, 4=auto
            diagram.connections[i].target(shape2.connectors[0]);
            diagram.connections[i].redraw({
                stroke: {
                    width: 1,
                    color: "#979797"
                },
                points: [point1, point2]
            });
        } // end for
        
        var viewportRect = diagram.viewport();
        var diagramRect = diagram.boundingBox();
        var zoom = Math.min(viewportRect.width / (diagramRect.width+50), viewportRect.height / (diagramRect.height+50));   
        zoom = zoom < 1 ? (zoom < 0.5 ? 0.5 : zoom) : 1;        
        diagram.zoom(zoom, new kendo.dataviz.diagram.Point(viewportRect.x + (viewportRect.width / 2)), viewportRect.y + (viewportRect.height / 2));
        
        diagram.pan(new kendo.dataviz.diagram.Point(-20, 0));
        // code to resize the container. the parent container needs to have a fixed size so that the scrollbar can be displayed
        //var bbox = diagram.boundingBox();
        //diagram.wrapper.width(bbox.width + bbox.x + 50);
        //diagram.wrapper.height(bbox.height + bbox.y + 50);
        //diagram.resize();
    };
    // btn-refresh-plan-status
    var btnRefreshPlanStatusClick = function (e) {
        console.log("btnRefreshPlanStatusClick is running");
        refreshPlanStatus();
    };

    return {
        init: init,
        btnRefreshPlanListClick: btnRefreshPlanListClick,
        listboxPlanListData: listboxPlanListData,
        listboxPlanListChange: listboxPlanListChange,
        listboxPlanListDataBound: listboxPlanListDataBound,
        tabstripSelect: tabstripSelect,
        gridPlanHistoryData: gridPlanHistoryData,
        gridPlanHistoryDataBound: gridPlanHistoryDataBound,
        gridPlanHistoryChange: gridPlanHistoryChange,
        btnRefreshPlanHistoryClick: btnRefreshPlanHistoryClick,
        treelistDynamicParamsData: treelistDynamicParamsData,
        btnExecutePlanClick: btnExecutePlanClick,
        btnResetClick: btnResetClick,
        btnCancelPlanClick: btnCancelPlanClick,
        diagramPlanStatusData: diagramPlanStatusData,
        diagramPlanStatusVisualTemplate: diagramPlanStatusVisualTemplate,
        diagramPlanStatusDataBound: diagramPlanStatusDataBound,
        btnRefreshPlanStatusClick: btnRefreshPlanStatusClick
    };
})();

$.ajaxSetup({
    timeout: 60000, //Time in milliseconds
    error: function (xhr) {
        alert(xhr.statusText);
    }
});
$(document).ready(function () {

    SYNAPSEUI.init();
});
