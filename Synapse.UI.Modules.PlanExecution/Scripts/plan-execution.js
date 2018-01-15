var SYNAPSEUI = SYNAPSEUI || {};

SYNAPSEUI.planExec = (function () {

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
    //var noti = null;        // kendo notification widget
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
        // call function once ONLY after user has stopped typing for 1 sec
        $txtFilter.on('keyup', $.debounce(1000, function () { refreshPlanList();}));
    };        
    var startAutoRefreshStatusCountDown = function () {
        planVM.set("autoRefreshStatusCountDown", 60);
        stopAutoRefreshStatusCountDown();
        autoRefreshStatusId = setInterval(function () {
            var cnt = planVM.get("autoRefreshStatusCountDown") - 1;
            planVM.set("autoRefreshStatusCountDown", cnt);
            if (cnt === 0) {
                planVM.set("autoRefreshStatusCountDown", 60);
                // any plan selected?
                if (planVM.get("selectedPlanName") !== "") {
                    // ajax code here
                    refreshPlanHistory();
                }
            }
        }, 1000);
    };
    var stopAutoRefreshStatusCountDown = function () {
        if (autoRefreshStatusId !== null) clearInterval(autoRefreshStatusId);
    };
    var clearResultPlan = function () {
        $codeResultPlan.empty().closest("pre").scrollTop(0).scrollLeft(0);
    };
    var refreshPlanList = function () {
        $listboxPlanList.data("kendoListBox").dataSource.data([]);
        $listboxPlanList.data("kendoListBox").dataSource.read();
    }
    var refreshPlanHistory = function () {
        //if (planVM.get("selectedPlanName") === "") $gridPlanHistory.data("kendoGrid").dataSource.data([]);
        //else $gridPlanHistory.getKendoGrid().dataSource.read();
        $gridPlanHistory.data("kendoGrid").dataSource.data([]);
        $gridPlanHistory.getKendoGrid().dataSource.read();
    };
    var refreshPlanDiagram = function () {
        //if (planVM.get("selectedPlanName") === "") $diagramPlan.data("kendoDiagram").dataSource.data([]);
        //else $diagramPlan.getKendoDiagram().dataSource.read();
        $diagramPlan.data("kendoDiagram").dataSource.data([]);
        $diagramPlan.getKendoDiagram().dataSource.read();
    };
    var refreshDynamicParameters = function() {
        //if (planVM.get("selectedPlanName") === "") $treelistDynamicParams.data("kendoTreeList").dataSource.data([]);
        //else $treelistDynamicParams.data("kendoTreeList").dataSource.read();
        $treelistDynamicParams.data("kendoTreeList").dataSource.data([]);
        $treelistDynamicParams.data("kendoTreeList").dataSource.read();
    };
    var refreshResultPlan = function () {
        //$codeResultPlan.empty().closest("pre").scrollTop(0).scrollLeft(0);
        clearResultPlan();
        $diagramResultPlan.data("kendoDiagram").dataSource.data([]);
        var pn = planVM.get("selectedPlanName");
        var instanceId = planVM.get("selectedInstanceId");
        if (pn !== "" && instanceId !== "") {                    
            $.ajax({
                async: true,
                method: 'GET',
                url: getActionUrl("GetPlanStatus", "PlanExecution"),
                data: { 'planUniqueName': pn, 'planInstanceId': instanceId },
                dataType: 'json'
            }).done(function (data, textStatus, xhr) {
                var c = JSON.stringify(data, null, 4);                
                //$codeResultPlan.html(c);
                $codeResultPlan.text(c);
            });
                //.fail(function (xhr, textStatus, errorThrown) { $codeResultPlan.html("There was a problem reading the file"); });
                //.fail(function (xhr, textStatus, errorThrown) { showNotification(decipherJqXhrError(xhr, textStatus), "error"); });

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
                        url: getActionUrl("GetPlanForDiagram", "PlanExecution"),
                        data: SYNAPSEUI.planExec.diagramPlanData,
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
                visual: SYNAPSEUI.planExec.diagramPlanVisualTemplate,
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
            dataBound: SYNAPSEUI.planExec.diagramPlanDataBound,
            pannable: { key: "none"}
        });
        var diagram = $diagramPlan.getKendoDiagram();
        diagram.dataSource.bind("error", "dataSourceError");
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
                        url: getActionUrl("GetResultPlanForDiagram", "PlanExecution"),
                        data: SYNAPSEUI.planExec.diagramResultPlanData,
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
                visual: SYNAPSEUI.planExec.diagramResultPlanVisualTemplate,
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
            dataBound: SYNAPSEUI.planExec.diagramResultPlanDataBound,
            pannable: { key: "none" }
        });
        var diagram = $diagramResultPlan.getKendoDiagram();
        diagram.dataSource.bind("error", "dataSourceError");
        diagram.bringIntoView(diagram.shapes);
    };
    var init = function () {
        createPlanDiagram();    
        createResultPlanDiagram();
        bindUIActions();        
        //noti = $("#noti").data("kendoNotification");
        kendo.bind(document.body, planVM);
    };
    // btn-refresh-plan-list
    var btnRefreshPlanListClick = function (e) {
        //console.log("btnRefreshPlanListClick is running");
        //$listboxPlanList.data("kendoListBox").dataSource.read();
        refreshPlanList();
    };    
    // listbox-plan-list
    var listboxPlanListData = function () {
        return {
            filterString: $txtFilter.val(),
            isRegexFilter: $spanFilterType.hasClass("regex-filter")
        };
    };
    var dataSourceError = function (e) {        
        this.data([]);  // "this" is set to the data source instance
        //console.log(e);
        // e.status can be null, "timeout", "error", "abort", and "parsererror"
        // e.errorThrown is the textual portion of the HTTP status
        if (e) {
            var msg = decipherJqXhrError(e.xhr, e.status);            
            if (e.errors) {
                $.each(e.errors, function (key, value) {                    
                    if ('errors' in value) {
                        $.each(value.errors, function () {
                            msg += this + "\n";
                        });
                    }
                });
            }
            //noti.error("Request failed. " + "\n" + msg);
            showNotification(msg, "error");
        }
    };    
    var listboxPlanListChange = function (e) {
        //console.log("listboxPlanListChange is running");
        var pn = $(e.sender.wrapper).find(".k-item.k-state-selected").text();
        planVM.set("selectedPlanName", pn);        
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
    };
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
    };
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
                    dyn[obj.name] = encodeURIComponent(obj.value);
                    $passblank.prop('checked', false);
                }
                else {
                    // check whether to include blank
                    if ($passblank.is(':checked')) dyn[obj.name] = obj.value;
                }
            });

            var d = {
                'PlanUniqueName': pn,
                'RequestNumber': $txtRequestNumber.val().trim().length === 0 ? null : encodeURIComponent($txtRequestNumber.val().trim()),
                'DynamicParameters': dyn
            };            
            $.ajax({
                async: true,
                method: 'POST',
                url: getActionUrl("StartPlan", "PlanExecution"),
                contentType: 'application/json',
                data: JSON.stringify(d), /* escape special characters with encodeURIComponent */
                dataType: 'text'                
            }).done(function (data, textStatus, xhr) {
                var c = JSON.stringify(data, null, 4);
                if (data === "0")
                    showNotification("Something is wrong. Execute plan request failed.", "error");
                else {
                    planVM.set("lastExecutedInstanceId", data);
                    planVM.set("isExecute", false);
                    showNotification("Execute request submitted. Instance id: " + data, "info");
                }
            });
                //.fail(function (xhr, textStatus, errorThrown) {
                //    showNotification("Something is wrong. Execute plan request failed2.", "error");
                //});
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
            url: getActionUrl("CancelPlan", "PlanExecution"),
            data: { 'planUniqueName': planVM.get("selectedPlanName"), 'planInstanceId': planVM.get("selectedInstanceId") },
            dataType: 'text'
        }).done(function (data, textStatus, xhr) {
            //kendo.alert("Cancel request submitted. Click refresh to check status"); 
            //showAlert("Cancel plan execution", "Cancel request submitted. Click refresh to check status");            
            //noti.info("Cancel request submitted. Click refresh to check status");
            showNotification("Cancel request submitted. Click refresh to check status", "info");
            }).fail(function (xhr, textStatus, errorThrown) {
                //kendo.alert("There was a problem when tryig to cancel the plan");
                //showAlert("Cancel plan execution", "There was a problem submitting the cancel request");
                //noti.error("There was a problem submiting the cancel request");
                showNotification("There was a problem submiting the cancel request", "error");
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
        // START - if render simple text
        //var layout = new dataviz.diagram.Layout(new dataviz.diagram.Rect(0, 0, 200, 75), {
        //    alignContent: "center",
        //    alignItems: "center",
        //    justifyContent: "center",
        //    orientation: "vertical"
        //});
        //g.append(layout);
        //layout.append(new dataviz.diagram.TextBlock({
        //    text: dataItem.Name,
        //    fontSize: 12,
        //    fill: "#787878"
        //}));        
        //layout.reflow();
        // END - if render simple text

        // START - flag an action as action group. Append superscript "G" after the action name        
        // https://docs.telerik.com/kendo-ui/controls/diagrams-and-maps/diagram/how-to/external-content-in-shapes
        // Compile the shape template
        var contentTemplate = kendo.template($("#diagram-plan-content-template").html());
        var renderElement = $("<div />").appendTo("body");
        renderElement.html(contentTemplate(dataItem));

        // Create a new group that will hold the rendered content        
        var output = new kendo.drawing.Group();
        kendo.drawing.drawDOM(renderElement)
            .then(function (group) {
                output.append(group);

                // clean up
                renderElement.remove();
            });

        g.drawingElement.append(output);
        // END - START - flag an action as action group. Append superscript "G" after the action name  

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
        // START - if render simple text
        //var layout = new dataviz.diagram.Layout(new dataviz.diagram.Rect(0, 0, 200, 75), {
        //    alignContent: "center",
        //    alignItems: "center",
        //    justifyContent: "center",
        //    orientation: "vertical"
        //});

        //g.append(layout);
        //layout.append(new dataviz.diagram.TextBlock({
        //    text: dataItem.Name,
        //    fontSize: 12,
        //    fill: "#787878"
        //}));
        //layout.append(new dataviz.diagram.TextBlock({
        //    text: dataItem.StatusText,
        //    fontSize: 12,
        //    fill: "#787878"        
        //}));
        // layout.reflow();
        // END - if render simple text

        // START - START - flag an action as action group. Append superscript "G" after the action name
        // https://docs.telerik.com/kendo-ui/controls/diagrams-and-maps/diagram/how-to/external-content-in-shapes
        // Compile the shape template
        var contentTemplate = kendo.template($("#diagram-resultplan-content-template").html());
        var renderElement = $("<div />").appendTo("body");
        renderElement.html(contentTemplate(dataItem));

        // Create a new group that will hold the rendered content        
        var output = new kendo.drawing.Group();
        kendo.drawing.drawDOM(renderElement)
            .then(function (group) {
                output.append(group);
                
                // clean up
                renderElement.remove();
            });            
        
        g.drawingElement.append(output);                
        // END -         // END - flag action group as superscript "G" after the action name

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
        
    };
    //var showNotification = function (msg, msgType, allowHideAfter = 10000, autoHideAfter = 15000) {
    var showNotification = function (msg, msgType, allowHideAfter, autoHideAfter) {
        if (allowHideAfter === undefined) allowHideAfter = 10000;
        if (autoHideAfter === undefined) autoHideAfter = 15000;
        if (msg == null)
            return;
        const id = "#noti";
        var noti = $(id).data("kendoNotification");
        if (noti) {
            noti.destroy();
            $(id).empty();
        }
        noti = $(id).kendoNotification({
            stacking: "up",
            position: {bottom: 12, left:12},
            button: true,
            allowHideAfter: allowHideAfter,
            autoHideAfter: autoHideAfter,
            hideOnClick: false
        }).data("kendoNotification");
        noti.show(msg, msgType);
    };
    var decipherJqXhrError = function (jqXHR, textStatus) {
        var errorMessage = "";

        if (jqXHR.status === 0) {
            errorMessage = "Not connected. Please verify network connection.";
        } else if (jqXHR.status == 404) {
            errorMessage = "Requested page is not found.";
        } else if (jqXHR.status == 500) {
            errorMessage = "Internal Server Error.";
        } else if (textStatus === "parsererror") {
            errorMessage = "Requested JSON parse failed.";
        } else if (textStatus === "timeout") {
            errorMessage = "Timeout error.";
        } else if (textStatus === "abort") {
            errorMessage = "Ajax request aborted.";
        } else {
            errorMessage = "Uncaught Error. " + jqXHR.responseText;
        }
        return errorMessage;
    }
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
        btnRefreshResultPlanClick: btnRefreshResultPlanClick,
        showNotification: showNotification,
        decipherJqXhrError: decipherJqXhrError,
        dataSourceError: dataSourceError
    };
})();


$(document).ready(function () {
    $.ajaxSetup({
        timeout: 60000, //Time in milliseconds
        error: function (xhr, textStatus, errorThrown) {
            //kendo.alert(xhr.statusText);
            //showAlert("Ajax error", xhr.statusText);
            console.log("AJAX error. Status: " + xhr.status + ". Error thrown: " + errorThrown);
            //noti.error(xhr.statusText);            
            SYNAPSEUI.planExec.showNotification(SYNAPSEUI.planExec.decipherJqXhrError(xhr, textStatus), "error");
        }
    });
    SYNAPSEUI.planExec.init();
    
});
