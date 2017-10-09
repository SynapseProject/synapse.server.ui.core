﻿var SYNAPSEUI = (function () {

    // private variables
    var $spanFilterType = $("#span-filter-type");
    var $txtFilter = $("#txt-filter");
    var $listboxPlanList = $("#listbox-plan-list");
    var $gridPlanHistory = $("#grid-plan-history");
    var $codeResultPlan = $("#code-result-plan");
    var $treelistDynamicParams = $("#treelist-dynamic-params");
    var $diagramPlan = $("#diagram-plan");
    var $diagramResultPlan = $("#diagram-result-plan");
    var $txtRequestNumber = $("#txt-request-number");
    var $btnShowResultPlanDiagram = $("#btn-show-result-plan-diagram");
    var noti = null;        // kendo notification widget
    var autoRefreshStatusId = null;
    

    var planVM = kendo.observable({
        selectedPlanName: "",
        selectedInstanceId: "",
        lastExecutedInstanceId: "",
        isExecute: true,
        tabstripSelected: "",
        isReset: function () { return !this.get("isExecute"); },
        planSelected: function () { return this.get("selectedPlanName") !== ""; },
        planExecuted: function () { return this.get("lastExecutedInstanceId") !== ""; },
        instanceSelected: function () { return this.get("selectedInstanceId") !== ""; },
        planDiagramIsVisible: false,
        planInputIsVisible: function () { return !this.get("planDiagramIsVisible");},
        toggleShowPlanDiagram: function () {
            this.set("planDiagramIsVisible", !this.get("planDiagramIsVisible"));
            //resizeDiagram($("#diagram-plan").getKendoDiagram());
            resizeDiagram($diagramPlan.getKendoDiagram());
        },
        resultPlanDiagramIsVisible: false,
        resultPlanCodeIsVisible: function () { return !this.get("resultPlanDiagramIsVisible"); },
        toggleShowResultPlanDiagram: function () {
            var show = !this.get("resultPlanDiagramIsVisible");
            this.set("resultPlanDiagramIsVisible", show);
            show ? $btnShowResultPlanDiagram.text("Hide Diagram") : $btnShowResultPlanDiagram.text("Show Diagram");
            resizeDiagram($diagramResultPlan.getKendoDiagram());
        },
        reduceTextSize: function (e) { e.preventDefault(); $codeResultPlan.animate({ "font-size": "-=1" }); },
        increaseTextSize: function (e) { e.preventDefault(); $codeResultPlan.animate({ "font-size": "+=1" }); },
        resetTextSize: function (e) { e.preventDefault(); $codeResultPlan.css("font-size", ""); },
        showNRecs: 5,
        autoRefreshStatus: false,        
        autoRefreshStatusCountDown: 60,
        autoRefreshStatusChange: function (e) {
            if (this.get("autoRefreshStatus")) startAutoRefreshStatusCountDown();
            else stopAutoRefreshStatusCountDown();
        },
        toggleFilterType: function (e) {
            $(e.target).toggleClass('regex-filter in-string-filter');
            $txtFilter.attr("placeholder", $(e.target).hasClass("regex-filter") ? "RegEx Filter" : "In-String Filter");
        }
    });
    planVM.bind("change", function (e) {
        //console.log("planVM.change() is called.", e);
        switch (e.field) {
            case "selectedPlanName":
                this.set("isExecute", true);
                this.set("lastExecutedInstanceId", "");
                refreshPlanHistory();
                refreshPlanDiagram();
                refreshDynamicParameters();
                if (this.get("autoRefreshStatus")) startAutoRefreshStatusCountDown();

                break;

            case "selectedInstanceId":
                refreshResultPlan();

                break;
            case "lastExecutedInstanceId":

                break;
            case "tabstripSelected":
                //var whichStrip = this.get("tabstripSelected");
                //if (whichStrip === "Status") refreshPlanHistory();
                break;
        }  // end switch
    });

    // private methods
    var bindUIActions = function () {
        $txtFilter.keyup(function (e) {
            console.log("txt-filter.keyup() is called.", e);
            $listboxPlanList.data("kendoListBox").dataSource.read();
        });
    };    
    //var showAlert = function (title, content) {
    //    $("<div></div>").kendoAlert({
    //        title: title,
    //        content: content
    //    }).data("kendoAlert").open();
    //}
    var startAutoRefreshStatusCountDown = function () {
        planVM.set("autoRefreshStatusCountDown", 60);
        stopAutoRefreshStatusCountDown();
        autoRefreshStatusId = setInterval(function () {
            var cnt = planVM.get("autoRefreshStatusCountDown") - 1;
            planVM.set("autoRefreshStatusCountDown", cnt);
            if (cnt === 0) {
                planVM.set("autoRefreshStatusCountDown", 60);
                // any plan selected?
                if (planVM.get("selectedPlanName") != "") {
                    // ajax code here
                    refreshPlanHistory();
                }
            }            
        }, 1000);
    }
    var stopAutoRefreshStatusCountDown = function () {
        if (autoRefreshStatusId !== null) clearInterval(autoRefreshStatusId);
    }
    var clearResultPlan = function () {
        $codeResultPlan.empty().closest("pre").scrollTop(0).scrollLeft(0);
    };
    var refreshPlanHistory = function () {
        if (planVM.get("selectedPlanName") === "") $gridPlanHistory.data("kendoGrid").dataSource.data([]);
        else $gridPlanHistory.getKendoGrid().dataSource.read();
    };
    var refreshPlanDiagram = function () {
        if (planVM.get("selectedPlanName") === "") $diagramPlan.data("kendoDiagram").dataSource.data([]);
        else $diagramPlan.getKendoDiagram().dataSource.read();
    };
    var refreshDynamicParameters = function() {
        if (planVM.get("selectedPlanName") === "") $treelistDynamicParams.data("kendoTreeList").dataSource.data([]);
        else $treelistDynamicParams.data("kendoTreeList").dataSource.read();
    };
    var refreshResultPlan = function () {
        $codeResultPlan.empty().closest("pre").scrollTop(0).scrollLeft(0);
        var pn = planVM.get("selectedPlanName");
        var instanceId = planVM.get("selectedInstanceId");
        if (instanceId === "") {
            $diagramResultPlan.data("kendoDiagram").dataSource.data([]);
        }
        else {
            $.ajax({
                async: true,
                method: 'GET',
                url: getActionUrl("GetPlanStatus", "Home"),
                data: { 'planUniqueName': pn, 'planInstanceId': instanceId },
                dataType: 'json'
            }).done(function (data, textStatus, xhr) {
                var c = JSON.stringify(data, null, 4);
                $codeResultPlan.html(c);
                }).fail(function (xhr, textStatus, errorThrown) { $codeResultPlan.html("There was a problem reading the file"); });

            $diagramResultPlan.getKendoDiagram().dataSource.read();
        }
    };
    var resizeDiagram = function (diagram) {
        var viewportRect = diagram.viewport();
        // no need to resize if the viewport is not visible
        if (viewportRect.width > 0 && viewportRect.height > 0) {
            var diagramRect = diagram.boundingBox();
            var zoom = Math.min(viewportRect.width / (diagramRect.width + 50), viewportRect.height / (diagramRect.height + 50));
            zoom = zoom < 1 ? (zoom < 0.5 ? 0.5 : zoom) : 1;
            diagram.zoom(zoom, new kendo.dataviz.diagram.Point(viewportRect.x + (viewportRect.width / 2)), viewportRect.y + (viewportRect.height / 2));
            diagram.pan(new kendo.dataviz.diagram.Point(0, 0));
            diagram.resize();   // to set the svg tag to the size of its container parent
        }
    }
    var getActionUrl = function (action, controller) {
        return $("base").attr("href") + controller + "/" + action;
    };
    var createPlanDiagram = function () {        
        $diagramPlan.kendoDiagram({
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
                        url: getActionUrl("GetPlanForDiagram", "Home"),
                        data: SYNAPSEUI.diagramPlanData,
                        type: "Get"
                    }
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
                visual: SYNAPSEUI.diagramPlanVisualTemplate,
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
            dataBound: SYNAPSEUI.diagramPlanDataBound,
            pannable: { key: "none"}
        });
        var diagram = $diagramPlan.getKendoDiagram();
        diagram.bringIntoView(diagram.shapes);
    };
    var createResultPlanDiagram = function () {
        $diagramResultPlan.kendoDiagram({
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
                        url: getActionUrl("GetResultPlanForDiagram", "Home"),
                        data: SYNAPSEUI.diagramResultPlanData,
                        type: "Get"
                    }
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
                visual: SYNAPSEUI.diagramResultPlanVisualTemplate,
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
            dataBound: SYNAPSEUI.diagramResultPlanDataBound,
            pannable: { key: "none" }
        });
        var diagram = $diagramResultPlan.getKendoDiagram();
        diagram.bringIntoView(diagram.shapes);
    };
    var init = function () {
        createPlanDiagram();    
        createResultPlanDiagram();
        bindUIActions();        
        noti = $("#noti").data("kendoNotification");
        kendo.bind(document.body, planVM);
    };
    // btn-refresh-plan-list
    var btnRefreshPlanListClick = function (e) {
        //console.log("btnRefreshPlanListClick is running");
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
        //console.log("listboxPlanListChange is running");
        var pn = $(e.sender.wrapper).find(".k-item.k-state-selected").text();
        planVM.set("selectedPlanName", pn);
        //$("#span-planname").val(pn);
    };
    var listboxPlanListDataBound = function (e) {
        //console.log("listboxPlanListDataBound is running");
        planVM.set("selectedPlanName", "");
    };
    // tabstrip
    var tabstripSelect = function (e) {
        //console.log("tabstripSelect is running");
        planVM.set("tabstripSelected", $(e.item).find("> .k-link").text());
    };
    // grid-plan-history
    var gridPlanHistoryData = function () {
        //console.log("gridPlanHistoryData is running");
        return {
            planUniqueName: planVM.get("selectedPlanName"), showNRecs: planVM.get("showNRecs")
        };
    };
    var gridPlanHistoryDataBound = function (e) {
        //console.log("gridPlanHistoryDataBound is running");
        // reset the scrollbars to topleft. Not sure why it doesnt do that by default
        var container = e.sender.wrapper.children(".k-grid-content"); // or ".k-virtual-scrollable-wrap"
        container.scrollLeft(0);
        container.scrollTop(0);
        // default to first record
        if ($gridPlanHistory.getKendoGrid().dataSource.data().length !== 0) {
            setTimeout(function () {
                $gridPlanHistory.getKendoGrid().select(e.sender.tbody.find("tr:first"));
            }, 50);
        }

        planVM.set("selectedInstanceId", "");
    };
    var gridPlanHistoryChange = function (e) {
        //console.log("gridPlanHistoryChange is running");
        var selectedItem = e.sender.dataItem(this.select());
        planVM.set("selectedInstanceId", selectedItem.PlanInstanceId);
        //console.log(selectedItem.Status);
    };
    var gridPlanHistoryNavigate = function (e) {
        //console.log("gridPlanHistoryNavigate is running");                
        // do nothing if header
        if (e.element.is("td")) {
            var r = e.element.closest("tr");
            // do nothing if already selected
            if (!r.hasClass("k-state-selected")) this.select(r);
        }
    }
    // btn-refresh-plan-history
    var btnRefreshPlanHistoryClick = function (e) {
        refreshPlanHistory();
    };
    // btn-refresh-result-plan
    var btnRefreshResultPlanClick = function (e) {
        refreshResultPlan();
    };
    // treelist-dynamic-params
    var treelistDynamicParamsData = function (e) {
        //console.log("treelistDynamicParamsData is running");
        var pn = planVM.get("selectedPlanName");
        return {
            planUniqueName: pn
        };
    };
    var treelistDynamicParamsDataBound = function (e) {
        //console.log("treelistDynamicParamsDataBound is running");
        $("select.js-dynamic-value").kendoDropDownList();
    }
    // btn-execute-plan
    var btnExecutePlanClick = function (e) {
        //console.log("btnExecutePlanClick is running");
        if (planVM.get("isExecute")) {
            var pn = planVM.get("selectedPlanName");
            var dyn = {};
            // cant just select all .js-dynamic-value because of the way kendo dropdownlist is implemented
            $.each($("input.js-dynamic-value, .js-dynamic-value[data-role='dropdownlist']"), function (i, obj) {
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
                dataType: 'text'
            }).done(function (data, textStatus, xhr) {
                var c = JSON.stringify(data, null, 4);
                if (data === "0")
                    //kendo.alert("Something is wrong. Execute plan request failed.")
                    //showAlert("Execute plan", "Something is wrong. Execute plan request failed.");
                    noti.error("Something is wrong. Execute plan request failed.");
                else {
                    planVM.set("lastExecutedInstanceId", data);
                    planVM.set("isExecute", false);
                    //kendo.alert("Execute request submitted. Instance id: " + data);                    
                    //showAlert("Execute plan", "Execute request submitted. Instance id: " + data);
                    noti.info("Execute request submitted. Instance id: " + data);
                }
                }).fail(function (xhr, textStatus, errorThrown) {
                    //kendo.alert("Something is wrong. Execute plan request failed."); 
                    //showAlert("Execute plan", "Something is wrong. Execute plan request failed.");
                    noti.error("Something is wrong. Execute plan request failed.");
                    
                });
        }

    };
    // btn-reset
    var btnResetClick = function (e) {
        planVM.set("isExecute", true);
    };
    // btn-cancel-plan
    var btnCancelPlanClick = function (e) {
        //console.log("btnCancelPlanClick is running");
        $.ajax({
            async: true,
            method: 'POST',
            url: getActionUrl("CancelPlan", "Home"),
            data: { 'planUniqueName': planVM.get("selectedPlanName"), 'planInstanceId': planVM.get("selectedInstanceId") },
            dataType: 'text'
        }).done(function (data, textStatus, xhr) {
            //kendo.alert("Cancel request submitted. Click refresh to check status"); 
            //showAlert("Cancel plan execution", "Cancel request submitted. Click refresh to check status");            
            noti.info("Cancel request submitted. Click refresh to check status");
            }).fail(function (xhr, textStatus, errorThrown) {
                //kendo.alert("There was a problem when tryig to cancel the plan");
                //showAlert("Cancel plan execution", "There was a problem submitting the cancel request");
                noti.error("There was a problem submiting the cancel request");
            });
    };
    // diagram-plan-diagram
    var diagramPlanData = function (e) {
        //console.log("diagramPlanData is running");
        var pn = planVM.get("selectedPlanName");
        return { planUniqueName: pn };     
    };
    var diagramPlanVisualTemplate = function (options) {
        //console.log("diagramPlanVisualTemplate is running");
        var dataviz = kendo.dataviz;
        var g = new dataviz.diagram.Group();
        var dataItem = options.dataItem;
        g.append(new dataviz.diagram.Rectangle({
            width: 200,
            height: 75,
            stroke: {
                color: dataItem.StatusColor, 
                width: 1
            }
        }));
        if (dataItem.IsActionGroup) {
            g.append(new dataviz.diagram.Rectangle({
                width: 7,
                height: 75,
                x: 0,
                y: 0,
                stroke: {width:0},
                fill: { color: dataItem.StatusColor }
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
        //layout.append(new dataviz.diagram.TextBlock({
        //    text: dataItem.Status,
        //    fontSize: 12,
        //    fill: "#787878"

        //}));
        
        layout.reflow();

        return g;
    };
    var diagramPlanDataBound = function (e) {
        var diagram = $diagramPlan.getKendoDiagram();
        
        //diagram.bringIntoView(diagram.shapes);

        //console.log("diagramPlanDataBound is running");

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

        resizeDiagram(diagram);
    };
    // diagram-result-plan
    var diagramResultPlanData = function (e) {
        //console.log("diagramResultPlanData is running");
        return {
            planUniqueName: planVM.get("selectedPlanName")
            , planInstanceId: planVM.get("selectedInstanceId")   
        };
    };
    var diagramResultPlanVisualTemplate = function (options) {
        //console.log("diagramResultPlanVisualTemplate is running");
        var dataviz = kendo.dataviz;
        var g = new dataviz.diagram.Group();
        var dataItem = options.dataItem;
        //var strokeColor = getColor(dataItem.Status); 
        //var strokeWidth = dataItem.IsActionGroup ? 2 : 1;
        g.append(new dataviz.diagram.Rectangle({
            width: 200,
            height: 75,
            stroke: {
                color: dataItem.StatusColor, 
                width: 1
            }
        }));
        if (dataItem.IsActionGroup) {
            g.append(new dataviz.diagram.Rectangle({
                width: 7,
                height: 75,
                x: 0,
                y: 0,
                stroke: { width: 0 },
                fill: { color: dataItem.StatusColor }
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
            text: dataItem.StatusText,
            fontSize: 12,
            fill: "#787878"

        }));

        layout.reflow();

        return g;
    };
    var diagramResultPlanDataBound = function (e) {
        var diagram = $diagramResultPlan.getKendoDiagram();

        //diagram.bringIntoView(diagram.shapes);

        //console.log("diagramResultPlanDataBound is running");

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

        resizeDiagram(diagram);

        //var viewportRect = diagram.viewport();
        //var diagramRect = diagram.boundingBox();
        //var zoom = Math.min(viewportRect.width / (diagramRect.width + 50), viewportRect.height / (diagramRect.height + 50));
        //zoom = zoom < 1 ? (zoom < 0.5 ? 0.5 : zoom) : 1;        // set zoom level min: 0.5, max: 1
        //diagram.zoom(zoom, new kendo.dataviz.diagram.Point(viewportRect.x + (viewportRect.width / 2)), viewportRect.y + (viewportRect.height / 2));
        //diagram.pan(new kendo.dataviz.diagram.Point(0, 0));
        
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
        gridPlanHistoryNavigate: gridPlanHistoryNavigate,
        btnRefreshPlanHistoryClick: btnRefreshPlanHistoryClick,
        treelistDynamicParamsData: treelistDynamicParamsData,
        treelistDynamicParamsDataBound: treelistDynamicParamsDataBound,
        btnExecutePlanClick: btnExecutePlanClick,
        btnResetClick: btnResetClick,
        btnCancelPlanClick: btnCancelPlanClick,
        diagramPlanData: diagramPlanData,
        diagramPlanVisualTemplate: diagramPlanVisualTemplate,
        diagramPlanDataBound: diagramPlanDataBound,
        diagramResultPlanData: diagramResultPlanData,
        diagramResultPlanVisualTemplate: diagramResultPlanVisualTemplate,
        diagramResultPlanDataBound: diagramResultPlanDataBound,
        btnRefreshResultPlanClick: btnRefreshResultPlanClick
    };
})();

$.ajaxSetup({
    timeout: 60000, //Time in milliseconds
    error: function (xhr) {
        //kendo.alert(xhr.statusText);
        //showAlert("Ajax error", xhr.statusText);
        noti.error(xhr.statusText);
    }
});
$(document).ready(function () {

    SYNAPSEUI.init();
});
